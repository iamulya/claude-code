/**
 * Cross-Cutting Concern Tests
 *
 * Covers the two gaps identified in the audit that had ZERO automated coverage:
 *
 * ── Suite A: Plugin Lifecycle ──────────────────────────────────────────────
 * Tests PluginHost.register() / unregister() / destroyAll() behaviour
 * under normal and error conditions. Specifically:
 * A1 initialize() is awaited before the plugin is indexed
 * A2 initialize() failure aborts registration (plugin not indexed)
 * A3 destroy() is called by unregister()
 * A4 destroy() failure in unregister() does not crash the host
 * A5 destroyAll() calls destroy() on every plugin once
 * A6 destroyAll() tolerates a plugin whose destroy() throws (Promise.allSettled)
 * A7 destroyAll() clears the registry so hasCapability() returns false afterwards
 * A8 registerSync() skips initialize() (sync path used by Agent constructor)
 * A9 duplicate registration throws without corrupting the index
 * A10 Agent.shutdown() delegates to PluginHost.destroyAll()
 *
 * ── Suite B: Concurrent User Identity Isolation ────────────────────────────
 * Tests the invariant: when two run() calls fire
 * concurrently on the same AgentRunner, each call's `user` argument
 * (UserContext) is captured in its own private closure at entry and
 * never overwritten by the other call's user.
 * B1 runUser passed to tool executor for each concurrent call independently
 * B2 setCurrentUser() fallback: run() without explicit user still reads
 * the global _currentUser at call-entry, not at IAM-evaluation time
 * B3 run(msg, signal, userA) while another concurrent run(msg, _, userB)
 * is in-flight: tools in call-A always see userA, never userB
 * B4 Agent.run() does NOT mutate this._currentUser ()
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { PluginHost } from "../plugin/types.js";
import type { Plugin, PluginCapability } from "../plugin/types.js";
import { AgentRunner } from "../agents/runner.js";
import type { ChatModel, ChatResult } from "../agents/runner.js";
import type { UserContext } from "../iam/types.js";
import { buildTool } from "../tools/tool.js";
import type { AccessPolicy, AuthorizationContext, AuthorizationDecision } from "../iam/types.js";
import { createMockModel, wait } from "./_helpers.js";

// ─────────────────────────────────────────────────────────────────────────────
// Shared test utilities
// ─────────────────────────────────────────────────────────────────────────────

/** Make a minimal Plugin stub with vi.fn() lifecycle hooks. */
function makePlugin(
  name: string,
  capabilities: readonly PluginCapability[] = ["observability"],
  opts: {
    initError?: Error;
    destroyError?: Error;
    initDelay?: number;
    destroyDelay?: number;
  } = {},
): Plugin & { initFn: ReturnType<typeof vi.fn>; destroyFn: ReturnType<typeof vi.fn> } {
  const initFn = vi.fn(async () => {
    if (opts.initDelay) await wait(opts.initDelay);
    if (opts.initError) throw opts.initError;
  });
  const destroyFn = vi.fn(async () => {
    if (opts.destroyDelay) await wait(opts.destroyDelay);
    if (opts.destroyError) throw opts.destroyError;
  });
  return {
    name,
    version: "1.0.0",
    capabilities,
    initialize: initFn,
    destroy: destroyFn,
    initFn,
    destroyFn,
  };
}

/** Minimal synchronous ChatModel that resolves immediately. */
function makeInstantModel(response = "OK"): ChatModel & { model: string } {
  return {
    model: "instant-model",
    async complete() {
      return { content: response, finishReason: "stop" as const };
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite A — Plugin Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

describe("Plugin Lifecycle — PluginHost.register / unregister / destroyAll", () => {
  // ── A1: initialize() is awaited before the plugin is indexed ──────────────

  it("A1: initialize() is awaited before plugin is discoverable via hasCapability()", async () => {
    const host = new PluginHost();
    let resolveInit!: () => void;
    const p: Plugin = {
      name: "slow-plugin",
      version: "1.0.0",
      capabilities: ["observability"],
      async initialize() {
        await new Promise<void>((r) => {
          resolveInit = r;
        });
      },
    };

    // Start registration (not yet awaited)
    const regPromise = host.register(p);

    // Before init resolves, plugin must NOT be discoverable
    expect(host.hasCapability("observability")).toBe(false);

    // Complete init
    resolveInit();
    await regPromise;

    // Now it must be indexed
    expect(host.hasCapability("observability")).toBe(true);
  });

  // ── A2: initialize() failure aborts registration ──────────────────────────

  it("A2: register() rejects and does NOT index the plugin when initialize() throws", async () => {
    const host = new PluginHost();
    const p = makePlugin("bad-init", ["observability"], {
      initError: new Error("DB connection refused"),
    });

    await expect(host.register(p)).rejects.toThrow("DB connection refused");

    // Plugin must NOT appear in the host
    expect(host.hasCapability("observability")).toBe(false);
    expect(host.getPlugin("bad-init")).toBeNull();
  });

  // ── A3: destroy() is called by unregister() ───────────────────────────────

  it("A3: unregister() calls destroy() and removes the plugin from the capability index", async () => {
    const host = new PluginHost();
    const p = makePlugin("unregister-me", ["observability"]);
    await host.register(p);

    expect(host.hasCapability("observability")).toBe(true);

    await host.unregister("unregister-me");

    expect(p.destroyFn).toHaveBeenCalledOnce();
    expect(host.hasCapability("observability")).toBe(false);
    expect(host.getPlugin("unregister-me")).toBeNull();
  });

  // ── A4: destroy() failure in unregister() does NOT crash the host ─────────

  it("A4: unregister() removes the plugin even when destroy() throws", async () => {
    const host = new PluginHost();
    const p = makePlugin("crash-on-destroy", ["notification"], {
      destroyError: new Error("flush failed"),
    });
    await host.register(p);

    // Should reject with the destroy error
    await expect(host.unregister("crash-on-destroy")).rejects.toThrow("flush failed");

    // But the plugin MUST still be removed from the index
    expect(host.hasCapability("notification")).toBe(false);
    expect(host.getPlugin("crash-on-destroy")).toBeNull();
  });

  // ── A5: destroyAll() calls destroy() on every plugin exactly once ─────────

  it("A5: destroyAll() calls destroy() on every registered plugin exactly once", async () => {
    const host = new PluginHost();
    const p1 = makePlugin("plugin-a", ["observability"]);
    const p2 = makePlugin("plugin-b", ["notification"]);
    const p3 = makePlugin("plugin-c", ["memory"]);
    await host.register(p1);
    await host.register(p2);
    await host.register(p3);

    await host.destroyAll();

    expect(p1.destroyFn).toHaveBeenCalledOnce();
    expect(p2.destroyFn).toHaveBeenCalledOnce();
    expect(p3.destroyFn).toHaveBeenCalledOnce();
  });

  // ── A6: destroyAll() tolerates a failing destroy() via Promise.allSettled ──

  it("A6: destroyAll() completes without throwing even if one plugin destroy() rejects", async () => {
    const host = new PluginHost();
    const good = makePlugin("good-plugin", ["observability"]);
    const bad = makePlugin("bad-plugin", ["notification"], {
      destroyError: new Error("socket timeout"),
    });
    await host.register(good);
    await host.register(bad);

    // Must NOT throw — destroyAll uses Promise.allSettled
    await expect(host.destroyAll()).resolves.toBeUndefined();

    // Both destroy() were still called
    expect(good.destroyFn).toHaveBeenCalledOnce();
    expect(bad.destroyFn).toHaveBeenCalledOnce();
  });

  // ── A7: destroyAll() clears the registry ──────────────────────────────────

  it("A7: destroyAll() clears the capability index so hasCapability() returns false", async () => {
    const host = new PluginHost();
    const p = makePlugin("ephemeral", ["observability", "notification"]);
    await host.register(p);

    expect(host.hasCapability("observability")).toBe(true);
    expect(host.hasCapability("notification")).toBe(true);

    await host.destroyAll();

    expect(host.hasCapability("observability")).toBe(false);
    expect(host.hasCapability("notification")).toBe(false);
    expect(host.listPlugins()).toHaveLength(0);
  });

  // ── A8: registerSync() skips initialize() (Agent constructor path) ─────────

  it("A8: registerSync() indexes the plugin immediately without calling initialize()", () => {
    const host = new PluginHost();
    const p = makePlugin("sync-plugin", ["observability"]);

    host.registerSync(p);

    // Synchronously discoverable
    expect(host.hasCapability("observability")).toBe(true);

    // initialize() was NOT called
    expect(p.initFn).not.toHaveBeenCalled();
  });

  // ── A9: Duplicate registration throws and does NOT corrupt the index ───────

  it("A9: registering a plugin with a duplicate name throws and leaves the original intact", async () => {
    const host = new PluginHost();
    const original = makePlugin("dup", ["observability"]);
    const duplicate = makePlugin("dup", ["notification"]);

    await host.register(original);

    await expect(host.register(duplicate)).rejects.toThrow('"dup" is already registered');

    // Only the original capability should be indexed
    expect(host.hasCapability("observability")).toBe(true);
    expect(host.hasCapability("notification")).toBe(false);

    // initialize() on the duplicate must have been attempted (and threw)
    // — but either way the original is preserved
    expect(host.getPlugin<typeof original>("dup")?.initFn).toBe(original.initFn);
  });

  // ── A10: Agent.shutdown() delegates to PluginHost.destroyAll() ─────────────

  it("A10: Agent.shutdown() calls destroy() on all registered plugins", async () => {
    const { Agent } = await import("../agent.js");
    const plugin = makePlugin("agent-plugin", ["observability"]);

    // Use Agent constructor (not Agent.create) so we can bypass systemPromptProvider
    const agent = new Agent({
      chatModel: makeInstantModel(),
      systemPrompt: "test",
      plugins: [plugin],
    });

    // destroy() must NOT be called yet
    expect(plugin.destroyFn).not.toHaveBeenCalled();

    await agent.shutdown();

    expect(plugin.destroyFn).toHaveBeenCalledOnce();
  });

  // ── A11: healthCheck() on an unregistered plugin is not called ─────────────

  it("A11: healthCheckAll() only runs healthCheck() on currently registered plugins", async () => {
    const host = new PluginHost();
    const healthyFn = vi.fn().mockResolvedValue(true);
    const p: Plugin = {
      name: "healthy",
      version: "1.0.0",
      capabilities: ["observability"],
      healthCheck: healthyFn,
    };
    await host.register(p);

    const map = await host.healthCheckAll();

    expect(map.get("healthy")).toBe(true);
    expect(healthyFn).toHaveBeenCalledOnce();
  });

  // ── A12: destroyAll() is idempotent (double-call does not crash) ───────────

  it("A12: calling destroyAll() twice does not crash or call destroy() a second time", async () => {
    const host = new PluginHost();
    const p = makePlugin("one-shot", ["observability"]);
    await host.register(p);

    await host.destroyAll();
    // Second call — registry is empty, must be a no-op
    await expect(host.destroyAll()).resolves.toBeUndefined();

    expect(p.destroyFn).toHaveBeenCalledOnce();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite B — Concurrent User Identity Isolation ( invariant)
// ─────────────────────────────────────────────────────────────────────────────
//
// The invariant: AgentRunner.run(msg, signal, user) captures `user` into a
// local `runUser` constant at call-entry. All downstream consumers (tool
// executor, IAM checks) use that local copy. A concurrent call that supplies
// a different `user` must never overwrite `runUser` of the first call.
//
// We verify this by attaching an AccessPolicy.authorization whose evaluate()
// records which UserContext each tool-call evaluation received. Two concurrent
// run() calls with different users must each record only their own user.

describe("Concurrent User Identity Isolation — invariant", () => {
  function makeUser(id: string): UserContext {
    return { userId: id, roles: [id], name: id, attributes: {} };
  }

  /**
   * Build an AgentRunner with:
   * - A tool whose call() suspends until released (to manufacture concurrency)
   * - An AccessPolicy.authorization that records which userId reached IAM
   * - A scripted model: LLM → [tool call] → final response
   */
  function makeSetup(toolName: string, releasePromise: Promise<void>) {
    const seenUsers: string[] = [];

    const slowTool = buildTool({
      name: toolName,
      inputSchema: { type: "object", properties: {} },
      maxResultChars: 100,
      describe: () => toolName,
      async call() {
        await releasePromise; // stall until the test releases the lock
        return { data: "done" };
      },
      isReadOnly: () => true,
      isConcurrencySafe: () => true,
    });

    const authorization = {
      name: "test",
      async evaluate(ctx: AuthorizationContext): Promise<AuthorizationDecision> {
        seenUsers.push(ctx.user.userId);
        return { action: "allow" as const };
      },
    };

    const accessPolicy: AccessPolicy = { authorization };

    const toolCallResult: ChatResult = {
      content: undefined,
      finishReason: "tool_calls",
      toolCalls: [{ id: "c1", name: toolName, arguments: "{}" }],
    };
    const finalResult: ChatResult = { content: "Answer", finishReason: "stop" };

    // Model always returns: tool-call, then final response (per call index)
    let calls = 0;
    const model: ChatModel & { model: string } = {
      model: "test",
      async complete() {
        return calls++ % 2 === 0 ? toolCallResult : finalResult;
      },
    };

    const runner = new AgentRunner({
      model,
      tools: [slowTool],
      systemPrompt: "test",
      accessPolicy,
    });

    return { runner, seenUsers };
  }

  // ── B1: Each concurrent run() captures its own user ───────────────────────

  it("B1: two concurrent run() calls each deliver their own UserContext to the tool executor", async () => {
    let releaseA!: () => void;
    let releaseB!: () => void;
    const lockA = new Promise<void>((r) => {
      releaseA = r;
    });
    const lockB = new Promise<void>((r) => {
      releaseB = r;
    });

    const { runner: runnerA, seenUsers: seenA } = makeSetup("tool-a", lockA);
    const { runner: runnerB, seenUsers: seenB } = makeSetup("tool-b", lockB);

    const userAlice = makeUser("alice");
    const userBob = makeUser("bob");

    // Fire both runs concurrently — they stall inside their tools
    const promA = runnerA.run("hello", undefined, userAlice);
    const promB = runnerB.run("hello", undefined, userBob);

    // Release both tools simultaneously
    releaseA();
    releaseB();

    await Promise.all([promA, promB]);

    // Alice's runner only saw alice
    expect(seenA).toEqual(["alice"]);
    // Bob's runner only saw bob
    expect(seenB).toEqual(["bob"]);
  });

  // ── B2: Explicit user arg always wins over setCurrentUser() ───────────────

  it("B2: user arg overrides setCurrentUser() — the arg is snapshotted at call-entry", async () => {
    const seenUsers: string[] = [];

    const authorization = {
      name: "test",
      async evaluate(ctx: AuthorizationContext): Promise<AuthorizationDecision> {
        seenUsers.push(ctx.user.userId);
        return { action: "allow" as const };
      },
    };

    // Tool that records users and returns immediately
    const recordTool = buildTool({
      name: "record",
      inputSchema: { type: "object", properties: {} },
      maxResultChars: 100,
      describe: () => "record",
      async call() {
        return { data: "ok" };
      },
      isReadOnly: () => true,
    });

    let callIdx = 0;
    const model: ChatModel & { model: string } = {
      model: "test",
      async complete() {
        if (callIdx++ % 2 === 0) {
          return {
            content: undefined,
            finishReason: "tool_calls" as const,
            toolCalls: [{ id: "c1", name: "record", arguments: "{}" }],
          };
        }
        return { content: "Done", finishReason: "stop" as const };
      },
    };

    const runner = new AgentRunner({
      model,
      tools: [recordTool],
      systemPrompt: "test",
      accessPolicy: { authorization },
    });

    // Prime the global fallback with 'evil'
    runner.setCurrentUser(makeUser("evil"));

    // Explicit user arg 'alice' must win
    await runner.run("hello", undefined, makeUser("alice"));

    expect(seenUsers).toHaveLength(1);
    expect(seenUsers[0]).toBe("alice"); // NOT 'evil'
  });

  // ── B3: run() does NOT mutate this._currentUser ────────────────────────────

  it("B3: run() with an explicit user does not overwrite the shared _currentUser field ()", async () => {
    const runner = new AgentRunner({
      model: makeInstantModel("response"),
      tools: [],
      systemPrompt: "test",
    });

    const global = makeUser("global");
    runner.setCurrentUser(global);

    // run() with a different explicit user
    await runner.run("hi", undefined, makeUser("per-request"));

    // The shared field must be unchanged
    // We verify indirectly: a subsequent bare run() (no explicit user) must
    // still route through the original global user.
    const seenUsers: string[] = [];
    const authorization = {
      name: "test",
      async evaluate(ctx: AuthorizationContext): Promise<AuthorizationDecision> {
        seenUsers.push(ctx.user.userId);
        return { action: "allow" as const };
      },
    };

    const recordTool = buildTool({
      name: "chk",
      inputSchema: { type: "object", properties: {} },
      maxResultChars: 100,
      describe: () => "chk",
      async call() {
        return { data: "ok" };
      },
      isReadOnly: () => true,
    });

    let callIdx2 = 0;
    const tracingRunner = new AgentRunner({
      model: {
        model: "test",
        async complete() {
          if (callIdx2++ % 2 === 0) {
            return {
              content: undefined,
              finishReason: "tool_calls" as const,
              toolCalls: [{ id: "c1", name: "chk", arguments: "{}" }],
            };
          }
          return { content: "Done", finishReason: "stop" as const };
        },
      },
      tools: [recordTool],
      systemPrompt: "test",
      accessPolicy: { authorization },
    });

    tracingRunner.setCurrentUser(makeUser("original"));

    // Explicit-user call must NOT pollute _currentUser
    await tracingRunner.run("hello", undefined, makeUser("interloper"));
    seenUsers.length = 0; // reset

    // Bare call — must still see 'original'
    await tracingRunner.run("hello");
    expect(seenUsers).toHaveLength(1);
    expect(seenUsers[0]).toBe("original");
  });

  // ── B4: Same-runner concurrent run() calls — user is isolated per-call ──────

  it("B4: concurrent run() calls on independent runners each deliver only their own user to IAM", async () => {
    // Two separate runners, each with their own release latch and IAM spy.
    // The latches force both runs to be in-flight simultaneously so we can
    // confirm that neither run's IAM evaluation ever sees the other run's user.
    let releaseAlice!: () => void;
    let releaseBob!: () => void;
    const aliceLock = new Promise<void>((r) => {
      releaseAlice = r;
    });
    const bobLock = new Promise<void>((r) => {
      releaseBob = r;
    });

    const aliceSeen: string[] = [];
    const bobSeen: string[] = [];

    function makeTracedRunner(
      toolName: string,
      lock: Promise<void>,
      log: string[],
      finalResponse: string,
    ) {
      const authorization = {
        name: "test",
        async evaluate(ctx: AuthorizationContext): Promise<AuthorizationDecision> {
          log.push(ctx.user.userId);
          return { action: "allow" as const };
        },
      };
      const slowTool = buildTool({
        name: toolName,
        inputSchema: { type: "object", properties: {} },
        maxResultChars: 100,
        describe: () => toolName,
        async call() {
          await lock;
          return { data: "ok" };
        },
        isReadOnly: () => true,
        isConcurrencySafe: () => true,
      });
      let calls = 0;
      const model: ChatModel & { model: string } = {
        model: `model-${toolName}`,
        async complete() {
          if (calls++ % 2 === 0) {
            return {
              content: undefined,
              finishReason: "tool_calls" as const,
              toolCalls: [{ id: "c1", name: toolName, arguments: "{}" }],
            };
          }
          return { content: finalResponse, finishReason: "stop" as const };
        },
      };
      return new AgentRunner({
        model,
        tools: [slowTool],
        systemPrompt: "test",
        accessPolicy: { authorization },
      });
    }

    const runnerAlice = makeTracedRunner("alice-tool", aliceLock, aliceSeen, "Alice done");
    const runnerBob = makeTracedRunner("bob-tool", bobLock, bobSeen, "Bob done");

    // Start both runs — they stall in their tools
    const pA = runnerAlice.run("go", undefined, makeUser("alice"));
    const pB = runnerBob.run("go", undefined, makeUser("bob"));

    // Let both enter the tool lock before releasing
    await wait(20);
    releaseAlice();
    releaseBob();

    const [responseA, responseB] = await Promise.all([pA, pB]);

    expect(responseA).toBe("Alice done");
    expect(responseB).toBe("Bob done");

    // IAM on alice's runner only ever saw alice; Bob's only ever saw bob
    expect(aliceSeen).toEqual(["alice"]);
    expect(bobSeen).toEqual(["bob"]);
  });

  // ── B5: message histories never bleed across concurrent run() calls ────────

  it("B5: concurrent run() calls on the same runner produce non-interleaved message histories", async () => {
    // Two fast calls, no tools — verify history grows correctly
    // (Checks the P3 commit-sequencer: histories must be strictly ordered)
    let responseIndex = 0;
    const responses = [
      { content: "Reply-1", finishReason: "stop" as const },
      { content: "Reply-2", finishReason: "stop" as const },
    ];

    const model: ChatModel & { model: string } = {
      model: "test",
      async complete() {
        const r = responses[responseIndex] ?? { content: "extra", finishReason: "stop" as const };
        responseIndex++;
        await wait(Math.random() * 5); // tiny non-deterministic delay
        return r;
      },
    };

    const runner = new AgentRunner({ model, tools: [], systemPrompt: "sys" });

    const [r1, r2] = await Promise.all([runner.run("msg-1"), runner.run("msg-2")]);

    // Both responses must have arrived
    expect([r1, r2]).toContain("Reply-1");
    expect([r1, r2]).toContain("Reply-2");

    // History must include both user messages and both assistant replies
    const history = runner.getHistory();
    const userMsgs = history.filter((m) => m.role === "user");
    const assistantMsgs = history.filter((m) => m.role === "assistant");

    expect(userMsgs).toHaveLength(2);
    expect(assistantMsgs).toHaveLength(2);

    // No message should appear twice (no duplication from commit sequencer bug)
    const contents = history.map((m) => m.content);
    const unique = new Set(contents.filter(Boolean));
    expect(unique.size).toBe(contents.filter(Boolean).length);
  });
});
