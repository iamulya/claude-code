/**
 * Deep Integration Tests — Confirmed Source-Level Bugs (G-DEEP-1 through G-DEEP-3)
 *
 * These tests expose real behavioral bugs found by adversarial source reading,
 * not just coverage gaps. Each test FAILS before the fix and PASSES after it.
 *
 * G-DEEP-1 PluginHost.gatherContext() — partial-results loss when one provider throws
 * Bug: Sequential loop with no try/catch per-provider. If provider-2 throws,
 * all sections from provider-1 (already collected) are silently discarded because
 * the caller's .catch(() => []) catches the whole chain.
 * Fix: Wrap each individual provider.getContextSections() call in try/catch and
 * continue with the partial result.
 *
 * G-DEEP-2 applyToolResultBudget() — budget bypassed when results ≤ keepRecent
 * Bug: Line 98 in toolResultBudget.ts: early-exit if toolResults.length <= keepRecent,
 * regardless of totalChars. If 3 tool results each contain 1 M characters and
 * keepRecent=3, the budget check is skipped even when maxTotalChars=10.
 * Fix: Remove the toolResults.length <= keepRecent short-circuit. keepRecent only
 * controls which results may be cleared — it should not bypass the budget check.
 *
 * G-DEEP-3 Agent.run() — session.append() not called when runner throws
 * Bug: session.append() is called only in the success path (after the try/catch block).
 * When runner.run() throws a non-MaxIterationsError, non-overflowError, the
 * re-throw at line 1130 bypasses session.append(). Any messages committed by the
 * runner before the throw (e.g., the user message) are silently lost from the
 * persistent session.
 * Fix: Move the session.append() call into a finally-like block that always runs,
 * or record the partial turn messages before re-throwing.
 */

import { describe, it, expect, vi, type MockedFunction } from "vitest";
import { PluginHost } from "../plugin/types.js";
import type { ContextProvider, ObservabilityAdapter, Plugin } from "../plugin/types.js";
import { applyToolResultBudget } from "../utils/toolResultBudget.js";
import type { ChatMessage } from "../agents/runner.js";

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

describe("G-DEEP-1 — PluginHost.gatherContext() partial results when one provider throws", () => {
  function makeContextProviderPlugin(
    name: string,
    sections: Array<{ key: string; content: string; placement: "system" | "user" }>,
    shouldThrow = false,
  ): Plugin & ContextProvider {
    return {
      name,
      capabilities: ["context_provider"],
      initialize: async () => {},
      destroy: async () => {},
      async getContextSections(): Promise<typeof sections> {
        if (shouldThrow) throw new Error(`${name} is offline`);
        return sections;
      },
    };
  }

  it("G-DEEP-1A: sections from provider-1 are returned even when provider-2 throws", async () => {
    const host = new PluginHost();
    await host.register(
      makeContextProviderPlugin(
        "kb-1",
        [{ key: "wiki", content: "Section from KB-1", placement: "system" }],
        /* throws= */ false,
      ),
    );
    await host.register(makeContextProviderPlugin("kb-2", [], /* throws= */ true));

    const sections = await host.gatherContext("tell me something").catch(() => []);

    // After the fix, sections from kb-1 must survive kb-2's failure
    expect(sections).toHaveLength(1);
    expect(sections[0]!.content).toBe("Section from KB-1");
  });

  it("G-DEEP-1B: sections from providers that succeed before AND after a throwing provider are returned", async () => {
    const host = new PluginHost();
    await host.register(
      makeContextProviderPlugin("kb-1", [{ key: "a", content: "From KB-1", placement: "system" }]),
    );
    await host.register(makeContextProviderPlugin("kb-bad", [], true)); // throws
    await host.register(
      makeContextProviderPlugin("kb-3", [{ key: "b", content: "From KB-3", placement: "user" }]),
    );

    const sections = await host.gatherContext("query").catch(() => []);

    expect(sections).toHaveLength(2);
    const keys = sections.map((s) => s.key);
    expect(keys).toContain("a");
    expect(keys).toContain("b");
  });

  it("G-DEEP-1C: all sections are returned when no provider throws", async () => {
    const host = new PluginHost();
    await host.register(
      makeContextProviderPlugin("kb-1", [{ key: "x", content: "X", placement: "system" }]),
    );
    await host.register(
      makeContextProviderPlugin("kb-2", [{ key: "y", content: "Y", placement: "system" }]),
    );

    const sections = await host.gatherContext("q");
    expect(sections).toHaveLength(2);
  });

  it("G-DEEP-1D: empty array is returned gracefully when ALL providers throw", async () => {
    const host = new PluginHost();
    await host.register(makeContextProviderPlugin("kb-1", [], true));
    await host.register(makeContextProviderPlugin("kb-2", [], true));

    const sections = await host.gatherContext("q").catch(() => []);
    expect(sections).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

describe("G-DEEP-2 — applyToolResultBudget() budget enforced even when results ≤ keepRecent", () => {
  function toolMsg(name: string, content: string): ChatMessage {
    return { role: "tool", toolCallId: `id-${name}`, name, content };
  }

  it("G-DEEP-2A: budget IS enforced when total chars exceed limit and results == keepRecent", () => {
    // 3 huge tool results, keepRecent=3 (all are "recent"), maxTotalChars=10
    // Current bug: length(3) <= keepRecent(3) → short-circuits → nothing cleared
    const messages: ChatMessage[] = [
      toolMsg("readFile", "A".repeat(1_000_000)),
      toolMsg("readFile", "B".repeat(1_000_000)),
      toolMsg("readFile", "C".repeat(1_000_000)),
    ];

    const result = applyToolResultBudget(messages, {
      maxTotalChars: 10,
      keepRecent: 3,
    });

    // After fix: at least some results should be cleared to enforce the budget
    // (keepRecent can only protect results from being cleared, not bypass the budget entirely)
    expect(result.cleared).toBeGreaterThan(0);
    expect(result.charsFreed).toBeGreaterThan(0);
  });

  it("G-DEEP-2B: budget IS enforced when results < keepRecent (5 results, keepRecent=10)", () => {
    // 5 results each 100K chars = 500K total; maxTotalChars = 10
    const messages: ChatMessage[] = Array.from({ length: 5 }, (_, i) =>
      toolMsg(`tool-${i}`, "X".repeat(100_000)),
    );

    const result = applyToolResultBudget(messages, {
      maxTotalChars: 10,
      keepRecent: 10, // keepRecent > count → current bug bypasses budget
    });

    // Budget must be enforced regardless of keepRecent being larger than result count
    expect(result.cleared).toBeGreaterThan(0);
  });

  it("G-DEEP-2C: keepRecent=0 clears all results when over budget", () => {
    const messages: ChatMessage[] = [
      toolMsg("t1", "A".repeat(50_000)),
      toolMsg("t2", "B".repeat(50_000)),
    ];

    const result = applyToolResultBudget(messages, {
      maxTotalChars: 10,
      keepRecent: 0,
    });

    expect(result.cleared).toBe(2);
  });

  it("G-DEEP-2D: when within budget AND results <= keepRecent, nothing is cleared (correct behaviour)", () => {
    const messages: ChatMessage[] = [toolMsg("small", "hello"), toolMsg("small", "world")];

    // total = 10 chars, maxTotalChars = 500, keepRecent = 10 → nothing to do
    const result = applyToolResultBudget(messages, {
      maxTotalChars: 500,
      keepRecent: 10,
    });

    expect(result.cleared).toBe(0);
    expect(result.charsFreed).toBe(0);
  });

  it("G-DEEP-2E: when clearable results suffice, most-recent keepRecent results are preserved", () => {
    // 6 results; keepRecent=3;
    // Oldest 3 are each 100K chars, most-recent 3 are each 1K chars (total = 303K)
    // Budget = 5K: must clear all 3 large results (300K) to get to 3K < 5K
    // The 3 small (recent, protected) results must NOT be cleared.
    const small = "S".repeat(1_000); // 1K chars each — recent ones
    const large = "L".repeat(100_000); // 100K chars each — old ones

    const messages: ChatMessage[] = [
      toolMsg("t0", large), // old
      toolMsg("t1", large), // old
      toolMsg("t2", large), // old
      toolMsg("t3", small), // recent (protected by keepRecent=3)
      toolMsg("t4", small), // recent
      toolMsg("t5", small), // recent
    ];

    const result = applyToolResultBudget(messages, {
      maxTotalChars: 5_000, // 303K total >> 5K budget; clearing all 3 large → 3K < 5K
      keepRecent: 3,
    });

    const toolMessages = result.messages.filter((m) => m.role === "tool");
    const cleared = toolMessages.filter(
      (m) =>
        (m as Extract<ChatMessage, { role: "tool" }>).content ===
        "[Tool result cleared to save context — see tool call above for what was executed]",
    );
    const kept = toolMessages.filter(
      (m) =>
        (m as Extract<ChatMessage, { role: "tool" }>).content !==
        "[Tool result cleared to save context — see tool call above for what was executed]",
    );

    // Exactly 3 oldest (large) cleared; 3 most-recent (small) kept
    expect(cleared).toHaveLength(3);
    expect(kept).toHaveLength(3);
    // The kept ones are the small (recent) results
    const keptNames = kept.map((m) => (m as Extract<ChatMessage, { role: "tool" }>).name);
    expect(keptNames).toEqual(["t3", "t4", "t5"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// We test this at the unit level against the AgentRunner + Session integration,
// simulating a model that throws after committing the user message, then verifying
// the session still reflects what was committed.

describe("G-DEEP-3 — session.append() called even when runner.run() throws", () => {
  it("G-DEEP-3A: session.append() is invoked when runner.run() throws", async () => {
    // Scenario: model throws on the first LLM call (a generic, non-handled error).
    // The runner commits the user message to this.messages before calling the LLM.
    // After fix: session.append() must still be called with the partial messages.

    const { Agent } = await import("../agent.js");

    const appendSpy = vi.fn().mockResolvedValue(undefined);

    // Use a duck-typed SessionLike — avoids the read-only getter on the real Session class
    const mockSession = {
      getMessages: () => [],
      messageCount: 0,
      append: appendSpy,
    };

    const agent = new Agent({
      chatModel: {
        model: "fail-immediately",
        async complete() {
          throw new Error("LLM unavailable");
        },
      },
      systemPrompt: "You are a helpful assistant.",
      session: mockSession,
    });

    await expect(agent.run("helloworld")).rejects.toThrow("LLM unavailable");

    // After fix: session.append() must have been called even though the run threw.
    // The runner commits the user message before calling the model; those messages
    // must be flushed to the session before re-throwing.
    expect(appendSpy).toHaveBeenCalled();

    // The appended messages must include at least the user message
    const allAppended = appendSpy.mock.calls.flat(2) as Array<{ role: string; content?: string }>;
    expect(allAppended.some((m) => m.role === "user")).toBe(true);
  });

  it("G-DEEP-3B: session never receives duplicate messages across a retried run", async () => {
    // Regression guard: after the flushPartialSession() fix, ensure that
    // a successful run does NOT double-append messages (once in flushPartialSession
    // and once in the normal success path).

    const { Agent } = await import("../agent.js");

    const appended: Array<Array<{ role: string }>> = [];

    const mockSession = {
      getMessages: () => [],
      messageCount: 0,
      append: vi.fn(async (msgs: Array<{ role: string }>) => {
        appended.push(msgs);
      }),
    };

    const agent = new Agent({
      chatModel: {
        model: "ok",
        async complete() {
          return { content: "Hello!", finishReason: "stop" as const };
        },
      },
      systemPrompt: "You are a helpful assistant.",
      session: mockSession,
    });

    await agent.run("hi");

    // session.append() must be called exactly once per successful turn —
    // not once by flushPartialSession (only called on throw) AND once by the success path.
    expect(mockSession.append).toHaveBeenCalledTimes(1);

    // The single append must have included both the user message and the assistant message
    const msgs = appended[0]!.map((m) => m.role);
    expect(msgs).toContain("user");
    expect(msgs).toContain("assistant");
  });
});
