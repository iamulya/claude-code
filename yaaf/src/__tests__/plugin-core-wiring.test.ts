/**
 * Plugin Integration — Pass 1 Gap Regression Tests
 *
 * Regression suite for the 3 integration gaps identified in the first audit
 * pass (yaaf_plugin_gap_audit_final.md) and implemented before the second
 * audit. These were implemented but never had automated regression coverage.
 *
 * Gaps covered:
 *
 * GAP 1 — MemoryAdapter plugin is consulted as the 3rd fallback path in
 * Agent.buildMemoryPrefix(). If no memoryStrategy or legacy memory
 * is configured but a MemoryAdapter is registered, its search()
 * results must appear in the system prompt.
 *
 * GAP 2 — ContextProvider.gatherContext() is called once per Agent.run()
 * turn. All registered ContextProvider plugins receive the user
 * message, and their context sections are injected into the LLM
 * system prompt override alongside the memory prefix.
 *
 * GAP 3 — SessionAdapter plugin is auto-wired in Agent.create(). When a
 * plugin implementing the 'session' capability is present and no
 * explicit session is configured, Agent.create() calls
 * Session.fromAdapter() so the plugin-backed session is used for
 * history persistence.
 */

import { describe, it, expect, vi } from "vitest";
import type {
  MemoryAdapter,
  ContextProvider,
  ContextSection,
  SessionAdapter,
  MemoryEntry,
  MemorySearchResult,
  Plugin,
} from "../plugin/types.js";
import type { ChatMessage, ChatModel } from "../agents/runner.js";
import { Session } from "../session.js";

// ── Shared test helpers ───────────────────────────────────────────────────────

/**
 * Minimal mock ChatModel. Uses `chatModel:` key (not `model:`) in AgentConfig
 * to bypass `resolveModel()`, which expects a string or provider config.
 */
function makeSpy(response = "OK"): { chatModel: ChatModel & { model: string }; calls: any[] } {
  const calls: any[] = [];
  const chatModel: ChatModel & { model: string } = {
    model: "spy-model",
    async complete(params) {
      calls.push({
        systemPrompt: params.systemPrompt ?? "",
        messages: [...(params.messages ?? [])],
      });
      return { content: response, finishReason: "stop" as const };
    },
  };
  return { chatModel, calls };
}

/**
 * Spy on the systemOverride argument passed to AgentRunner._runImplIsolated()
 * for each Agent.run() turn. Collects every override string injected during fn().
 *
 * A-1/S-1 FIX: The Agent no longer calls setSystemOverride() — the override is
 * now passed as a direct argument to runner.run() which passes it to
 * _runImplIsolated(). We spy on that method to capture overrides.
 */
async function captureOverrides(fn: () => Promise<void>): Promise<string[]> {
  const { AgentRunner } = await import("../agents/runner.js");
  const captured: string[] = [];
  // _runImplIsolated(userMessage, signal, runUser, baseSnapshot, ownMessages, systemOverride, ...)
  // systemOverride is arg index 5
  const orig = (AgentRunner.prototype as any)._runImplIsolated;
  (AgentRunner.prototype as any)._runImplIsolated = function (
    userMessage: string,
    signal: AbortSignal | undefined,
    runUser: any,
    baseSnapshot: any,
    ownMessages: any,
    systemOverride: string | undefined,
    ...rest: any[]
  ) {
    if (systemOverride) captured.push(systemOverride);
    return orig.call(
      this,
      userMessage,
      signal,
      runUser,
      baseSnapshot,
      ownMessages,
      systemOverride,
      ...rest,
    );
  };
  try {
    await fn();
  } finally {
    (AgentRunner.prototype as any)._runImplIsolated = orig;
  }
  return captured;
}

// ════════════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════════

describe("GAP 1 — MemoryAdapter plugin wired into Agent.buildMemoryPrefix()", () => {
  it("MemoryAdapter.search() is called with the user message as the query", async () => {
    const { Agent } = await import("../agent.js");

    const searchFn = vi.fn().mockResolvedValue([
      {
        entry: {
          id: "m0",
          content: "User prefers TypeScript",
          description: "User prefers TypeScript",
          type: "fact",
          tags: [],
          source: "test",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as MemoryEntry,
        score: 0.9,
        snippet: "User prefers TypeScript",
      },
    ] as MemorySearchResult[]);

    const memAdapter: MemoryAdapter = {
      name: "mock-memory",
      version: "1.0.0",
      capabilities: ["memory"] as const,
      async initialize() {},
      async destroy() {},
      async save() {
        return "mem-id";
      },
      async delete() {},
      search: searchFn,
      buildPrompt() {
        return "memo";
      },
    };

    const { chatModel } = makeSpy();
    const agent = new Agent({ chatModel, systemPrompt: "Agent.", plugins: [memAdapter] });
    await agent.run("What are my coding preferences?");

    expect(searchFn).toHaveBeenCalledOnce();
    const [query] = searchFn.mock.calls[0]!;
    expect(query).toContain("preferences");
  });

  it("MemoryAdapter search results appear in the runner system prompt override", async () => {
    const { Agent } = await import("../agent.js");

    const memAdapter: MemoryAdapter = {
      name: "mock-memory-2",
      version: "1.0.0",
      capabilities: ["memory"] as const,
      async initialize() {},
      async destroy() {},
      async save() {
        return "id";
      },
      async delete() {},
      async search() {
        return [
          {
            entry: {
              id: "m1",
              content: "User loves TypeScript",
              description: "User loves TypeScript",
              type: "fact",
              tags: [],
              source: "test",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            } as MemoryEntry,
            score: 0.9,
            snippet: "User loves TypeScript",
          },
        ] as MemorySearchResult[];
      },
      buildPrompt() {
        return "User loves TypeScript";
      },
    };

    const { chatModel } = makeSpy();
    const agent = new Agent({ chatModel, systemPrompt: "Agent.", plugins: [memAdapter] });

    const overrides = await captureOverrides(() => agent.run("Tell me about me"));
    const all = overrides.join("\n");
    // Either the snippet or the section header "Relevant Memory" must appear
    expect(all.includes("TypeScript") || all.includes("Memory")).toBe(true);
  });

  it("MemoryAdapter.buildPrompt() is used as fallback when search() returns empty", async () => {
    const { Agent } = await import("../agent.js");

    const memAdapter: MemoryAdapter = {
      name: "empty-search-memory",
      version: "1.0.0",
      capabilities: ["memory"] as const,
      async initialize() {},
      async destroy() {},
      async save() {
        return "id";
      },
      async delete() {},
      async search() {
        return [];
      },
      buildPrompt() {
        return "Global memory: user is a senior engineer.";
      },
    };

    const { chatModel } = makeSpy();
    const agent = new Agent({ chatModel, systemPrompt: "Agent.", plugins: [memAdapter] });
    const overrides = await captureOverrides(() => agent.run("hello"));
    expect(overrides.join("\n")).toContain("senior engineer");
  });

  it("MemoryAdapter.search() is NOT called when config.memoryStrategy is set (strategy has priority)", async () => {
    const { Agent } = await import("../agent.js");

    const searchFn = vi.fn().mockResolvedValue([]);
    const memAdapter: MemoryAdapter = {
      name: "priority-memory",
      version: "1.0.0",
      capabilities: ["memory"] as const,
      async initialize() {},
      async destroy() {},
      async save() {
        return "id";
      },
      async delete() {},
      search: searchFn,
      buildPrompt() {
        return "";
      },
    };

    const { chatModel } = makeSpy();
    const agent = new Agent({
      chatModel,
      systemPrompt: "Agent.",
      memoryStrategy: {
        extract: async () => ({ stored: false as const }),
        retrieve: async () => ({ memory: "Strategy memory wins" }),
      } as any,
      plugins: [memAdapter],
    });

    await agent.run("hello");
    expect(searchFn).not.toHaveBeenCalled();
  });

  it("MemoryAdapter errors are swallowed silently and do not crash the agent", async () => {
    const { Agent } = await import("../agent.js");

    const memAdapter: MemoryAdapter = {
      name: "crashing-memory",
      version: "1.0.0",
      capabilities: ["memory"] as const,
      async initialize() {},
      async destroy() {},
      async save() {
        return "id";
      },
      async delete() {},
      async search() {
        throw new Error("DB connection lost");
      },
      buildPrompt() {
        throw new Error("DB connection lost");
      },
    };

    const { chatModel } = makeSpy();
    const agent = new Agent({ chatModel, systemPrompt: "Agent.", plugins: [memAdapter] });
    await expect(agent.run("hello")).resolves.toBe("OK");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════════

describe("GAP 2 — ContextProvider plugin gatherContext() called in Agent.run()", () => {
  it("getContextSections() is called with the user message as the query", async () => {
    const { Agent } = await import("../agent.js");

    const getSectionsFn = vi
      .fn()
      .mockResolvedValue([
        { key: "docs", content: "YAAF docs here", placement: "system" as const, priority: 10 },
      ] as ContextSection[]);

    const provider: ContextProvider = {
      name: "mock-ctx-provider",
      version: "1.0.0",
      capabilities: ["context_provider"] as const,
      async initialize() {},
      async destroy() {},
      getContextSections: getSectionsFn,
    };

    const { chatModel } = makeSpy();
    const agent = new Agent({ chatModel, systemPrompt: "Agent.", plugins: [provider] });
    await agent.run("How does YAAF plugin system work?");

    expect(getSectionsFn).toHaveBeenCalledOnce();
    const [query] = getSectionsFn.mock.calls[0]!;
    expect(query).toContain("YAAF");
  });

  it("context sections appear in the system prompt override injected to AgentRunner", async () => {
    const { Agent } = await import("../agent.js");

    const provider: ContextProvider = {
      name: "kb-provider",
      version: "1.0.0",
      capabilities: ["context_provider"] as const,
      async initialize() {},
      async destroy() {},
      async getContextSections() {
        return [
          {
            key: "knowledge-base",
            content: "YAAF is a flexible agent framework written in TypeScript.",
            placement: "system" as const,
            priority: 100,
          },
        ];
      },
    };

    const { chatModel } = makeSpy();
    const agent = new Agent({ chatModel, systemPrompt: "Agent.", plugins: [provider] });
    const overrides = await captureOverrides(() => agent.run("question"));
    expect(overrides.join("\n")).toContain("flexible agent framework");
  });

  it("multiple ContextProviders are all consulted and their sections are merged", async () => {
    const { Agent } = await import("../agent.js");

    const getSectionsA = vi
      .fn()
      .mockResolvedValue([
        { key: "ctx-a", content: "Context from A", placement: "system" as const },
      ] as ContextSection[]);
    const getSectionsB = vi
      .fn()
      .mockResolvedValue([
        { key: "ctx-b", content: "Context from B", placement: "system" as const },
      ] as ContextSection[]);

    const providerA: ContextProvider = {
      name: "provider-a",
      version: "1.0.0",
      capabilities: ["context_provider"] as const,
      async initialize() {},
      async destroy() {},
      getContextSections: getSectionsA,
    };
    const providerB: ContextProvider = {
      name: "provider-b",
      version: "1.0.0",
      capabilities: ["context_provider"] as const,
      async initialize() {},
      async destroy() {},
      getContextSections: getSectionsB,
    };

    const { chatModel } = makeSpy();
    const agent = new Agent({ chatModel, systemPrompt: "Agent.", plugins: [providerA, providerB] });
    const overrides = await captureOverrides(() => agent.run("hello"));

    const all = overrides.join("\n");
    expect(all).toContain("Context from A");
    expect(all).toContain("Context from B");
    expect(getSectionsA).toHaveBeenCalledOnce();
    expect(getSectionsB).toHaveBeenCalledOnce();
  });

  it("ContextProvider errors are swallowed and do not crash Agent.run()", async () => {
    const { Agent } = await import("../agent.js");

    const provider: ContextProvider = {
      name: "crashing-ctx",
      version: "1.0.0",
      capabilities: ["context_provider"] as const,
      async initialize() {},
      async destroy() {},
      async getContextSections() {
        throw new Error("Provider exploded");
      },
    };

    const { chatModel } = makeSpy();
    const agent = new Agent({ chatModel, systemPrompt: "Agent.", plugins: [provider] });
    await expect(agent.run("hello")).resolves.toBe("OK");
  });

  it("getContextSections() is called on EACH turn independently (not cached)", async () => {
    const { Agent } = await import("../agent.js");

    const getSectionsFn = vi
      .fn()
      .mockResolvedValue([
        { key: "live", content: "Live data", placement: "system" as const },
      ] as ContextSection[]);

    const provider: ContextProvider = {
      name: "per-turn-provider",
      version: "1.0.0",
      capabilities: ["context_provider"] as const,
      async initialize() {},
      async destroy() {},
      getContextSections: getSectionsFn,
    };

    const { chatModel } = makeSpy();
    const agent = new Agent({ chatModel, systemPrompt: "Agent.", plugins: [provider] });

    await agent.run("first message");
    await agent.run("second message");

    expect(getSectionsFn).toHaveBeenCalledTimes(2);
    expect(getSectionsFn.mock.calls[0]![0]).toContain("first");
    expect(getSectionsFn.mock.calls[1]![0]).toContain("second");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════════

describe("GAP 3 — SessionAdapter plugin auto-wired in Agent.create()", () => {
  /**
   * In-memory SessionAdapter using vi.fn() spies so call records are
   * unambiguous and never attached to a wrapper/cast object.
   */
  function makeSessionAdapter() {
    const store = new Map<string, ChatMessage[]>();

    const createFn = vi.fn(async (id: string) => {
      if (!store.has(id)) store.set(id, []);
    });
    const loadFn = vi.fn(async (id: string) => store.get(id) ?? []);
    const appendFn = vi.fn(async (id: string, messages: ChatMessage[]) => {
      store.set(id, [...(store.get(id) ?? []), ...messages]);
    });
    const compactFn = vi.fn(async (_id: string, _summary: string) => {});
    const deleteFn = vi.fn(async (id: string) => {
      store.delete(id);
    });
    const listFn = vi.fn(async () => [...store.keys()]);

    const adapter: SessionAdapter = {
      name: "spy-session",
      version: "1.0.0",
      capabilities: ["session"] as const,
      async initialize() {},
      async destroy() {},
      create: createFn,
      load: loadFn,
      append: appendFn,
      compact: compactFn,
      delete: deleteFn,
      list: listFn,
    };

    return { adapter, store, createFn, loadFn, appendFn, compactFn, deleteFn, listFn };
  }

  it("Agent.create() with a SessionAdapter plugin creates a session automatically", async () => {
    const { Agent } = await import("../agent.js");
    const { adapter, createFn } = makeSessionAdapter();
    const { chatModel } = makeSpy();

    const agent = await Agent.create({ chatModel, systemPrompt: "Agent.", plugins: [adapter] });

    expect(createFn).toHaveBeenCalledOnce();
    expect(agent.session).toBeDefined();
    const [createdId] = createFn.mock.calls[0]!;
    expect(agent.session!.id).toBe(createdId);
  });

  it("Session.fromAdapter() generates a unique UUID session ID when none is provided", async () => {
    const { adapter } = makeSessionAdapter();
    const session = await Session.fromAdapter(adapter);

    expect(session.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/i);
  });

  it("Session.fromAdapter() hydrates pre-existing messages from the adapter", async () => {
    const { adapter, store } = makeSessionAdapter();

    const existingId = "pre-seeded-session";
    store.set(existingId, [
      { role: "user", content: "Previous question" },
      { role: "assistant", content: "Previous answer" },
    ]);

    const session = await Session.fromAdapter(adapter, existingId);

    expect(session.id).toBe(existingId);
    expect(session.messageCount).toBe(2);
    const messages = session.getMessages();
    expect(messages[0]!.content).toBe("Previous question");
    expect(messages[1]!.content).toBe("Previous answer");
  });

  it("session.append() delegates to adapter.append() and updates messageCount", async () => {
    const { adapter, appendFn, loadFn } = makeSessionAdapter();
    const session = await Session.fromAdapter(adapter);

    await session.append([{ role: "user", content: "Hello from test" }]);

    expect(appendFn).toHaveBeenCalledOnce();
    expect(appendFn.mock.calls[0]![0]).toBe(session.id);
    expect(session.messageCount).toBe(1);

    // Adapter's store should have the message
    const stored = await loadFn(session.id);
    expect(stored.some((m) => m.content === "Hello from test")).toBe(true);
  });

  it("messageCount increments on each append()", async () => {
    const { adapter } = makeSessionAdapter();
    const session = await Session.fromAdapter(adapter);

    expect(session.messageCount).toBe(0);
    await session.append([{ role: "user", content: "msg1" }]);
    expect(session.messageCount).toBe(1);
    await session.append([
      { role: "assistant", content: "reply" },
      { role: "user", content: "followup" },
    ]);
    expect(session.messageCount).toBe(3);
  });

  it("Agent.create() does NOT override an explicit session with the adapter", async () => {
    const { Agent } = await import("../agent.js");
    const { adapter, createFn } = makeSessionAdapter();
    const { chatModel } = makeSpy();

    const explicitSession = {
      id: "explicit-session-id",
      messageCount: 0,
      getMessages: () => [] as readonly ChatMessage[],
      append: vi.fn().mockResolvedValue(undefined),
      compact: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    } as unknown as Session;

    const agent = await Agent.create({
      chatModel,
      systemPrompt: "Agent.",
      plugins: [adapter],
      session: explicitSession,
    });

    expect(createFn).not.toHaveBeenCalled();
    expect(agent.session!.id).toBe("explicit-session-id");
  });

  it("Agent.create() has no session when no SessionAdapter plugin is registered", async () => {
    const { Agent } = await import("../agent.js");
    const { chatModel } = makeSpy();

    const agent = await Agent.create({ chatModel, systemPrompt: "Agent." });
    expect(agent.session).toBeUndefined();
  });

  it("session.delete() delegates to adapter.delete() and empties the store", async () => {
    const { adapter, store, deleteFn } = makeSessionAdapter();
    const session = await Session.fromAdapter(adapter);
    const id = session.id;

    expect(store.has(id)).toBe(true);
    await session.delete();

    expect(deleteFn).toHaveBeenCalledOnce();
    expect(store.has(id)).toBe(false);
  });

  it("getMessages() returns all appended messages in insertion order", async () => {
    const { adapter } = makeSessionAdapter();
    const session = await Session.fromAdapter(adapter);

    const msgs: ChatMessage[] = [
      { role: "user", content: "first" },
      { role: "assistant", content: "second" },
      { role: "user", content: "third" },
    ];
    for (const m of msgs) await session.append([m]);

    const retrieved = session.getMessages();
    expect(retrieved).toHaveLength(3);
    expect(retrieved.map((m) => m.content)).toEqual(["first", "second", "third"]);
  });
});
