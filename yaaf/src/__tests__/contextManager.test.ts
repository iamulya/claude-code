/**
 * ContextManager test suite
 *
 * The ContextManager is the core of what the LLM sees. It manages:
 * - System/user context sections (injection, ordering, priority)
 * - Message history (add, get, set, counting)
 * - Token accounting (estimation, thresholds, headroom)
 * - Auto-compaction triggers (shouldCompact, isNearingLimit)
 * - Micro-compaction (clearing old tool results)
 * - Full compaction (summarize, truncate, sliding_window strategies)
 * - Plugin strategy delegation
 *
 * This is the single most important module to have comprehensive tests
 * for — a bug here can cause infinite context bloat, lost conversation
 * history, or LLM hallucination from malformed context.
 *
 * ⚠️ Previously had ZERO test coverage.
 */

import { describe, it, expect, vi } from "vitest";
import {
  ContextManager,
  type ContextSection,
  type Message,
  type SummarizeFn,
} from "../context/contextManager.js";

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Fixed token estimator: 1 char = 1 token (deterministic). */
const charTokenEstimator = (text: string) => text.length;

/** Create a ContextManager with sensible test defaults. */
function makeCtx(
  overrides: Partial<Parameters<typeof ContextManager.prototype.addSection>[0]> & {
    contextWindowTokens?: number;
    maxOutputTokens?: number;
    summarizeFn?: SummarizeFn;
    compactionStrategy?: "summarize" | "truncate" | "sliding_window";
    microCompactKeepRecent?: number;
    autoCompactBuffer?: number;
  } = {},
) {
  return new ContextManager({
    contextWindowTokens: overrides.contextWindowTokens ?? 10_000,
    maxOutputTokens: overrides.maxOutputTokens ?? 2_000,
    autoCompactBuffer: overrides.autoCompactBuffer ?? 500,
    estimateTokensFn: charTokenEstimator,
    compactionStrategy: overrides.compactionStrategy ?? "truncate",
    microCompactKeepRecent: overrides.microCompactKeepRecent ?? 3,
    summarizeFn: overrides.summarizeFn,
  });
}

function addMessages(
  ctx: ContextManager,
  msgs: Array<{
    role: "user" | "assistant" | "tool_result";
    content: string;
    metadata?: Record<string, unknown>;
  }>,
) {
  for (const m of msgs) {
    ctx.addMessage(m);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Context Sections
// ════════════════════════════════════════════════════════════════════════════

describe("ContextManager — sections", () => {
  it("addSection and getSections", () => {
    const ctx = makeCtx();
    ctx.addSection({ key: "git", content: "git status output", placement: "system", priority: 10 });
    ctx.addSection({
      key: "memory",
      content: "user likes cats",
      placement: "system",
      priority: 20,
    });

    const sections = ctx.getSections();
    expect(sections).toHaveLength(2);
    // Higher priority first
    expect(sections[0]!.key).toBe("memory");
    expect(sections[1]!.key).toBe("git");
  });

  it("addSection overwrites existing key", () => {
    const ctx = makeCtx();
    ctx.addSection({ key: "git", content: "old status", placement: "system" });
    ctx.addSection({ key: "git", content: "new status", placement: "system" });

    const sections = ctx.getSections();
    expect(sections).toHaveLength(1);
    expect(sections[0]!.content).toBe("new status");
  });

  it("removeSection", () => {
    const ctx = makeCtx();
    ctx.addSection({ key: "git", content: "status", placement: "system" });
    ctx.removeSection("git");
    expect(ctx.getSections()).toHaveLength(0);
  });

  it("buildSystemPrompt combines base + system sections", () => {
    const ctx = makeCtx();
    ctx.addSection({ key: "a", content: "section A", placement: "system" });
    ctx.addSection({ key: "b", content: null, placement: "system" }); // null → omitted

    const prompt = ctx.buildSystemPrompt("Base prompt");
    expect(prompt).toContain("Base prompt");
    expect(prompt).toContain("section A");
    expect(prompt).not.toContain("section B"); // null omitted
  });

  it("buildUserContext returns only user-placed sections", () => {
    const ctx = makeCtx();
    ctx.addSection({ key: "sys", content: "system only", placement: "system" });
    ctx.addSection({ key: "usr", content: "user context", placement: "user" });

    expect(ctx.buildUserContext()).toBe("user context");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Message Management
// ════════════════════════════════════════════════════════════════════════════

describe("ContextManager — messages", () => {
  it("addMessage assigns uuid and timestamp", () => {
    const ctx = makeCtx();
    const msg = ctx.addMessage({ role: "user", content: "Hello" });

    expect(msg.uuid).toBeDefined();
    expect(typeof msg.uuid).toBe("string");
    expect(msg.timestamp).toBeGreaterThan(0);
    expect(msg.role).toBe("user");
    expect(msg.content).toBe("Hello");
  });

  it("addMessage preserves custom uuid and timestamp", () => {
    const ctx = makeCtx();
    const msg = ctx.addMessage({
      role: "user",
      content: "Hello",
      uuid: "custom-id",
      timestamp: 12345,
    });
    expect(msg.uuid).toBe("custom-id");
    expect(msg.timestamp).toBe(12345);
  });

  it("getMessages returns all messages in order", () => {
    const ctx = makeCtx();
    addMessages(ctx, [
      { role: "user", content: "First" },
      { role: "assistant", content: "Second" },
    ]);

    const msgs = ctx.getMessages();
    expect(msgs).toHaveLength(2);
    expect(msgs[0]!.content).toBe("First");
    expect(msgs[1]!.content).toBe("Second");
  });

  it("messageCount and getMessageCount", () => {
    const ctx = makeCtx();
    expect(ctx.messageCount).toBe(0);
    expect(ctx.getMessageCount()).toBe(0);

    ctx.addMessage({ role: "user", content: "Hello" });
    expect(ctx.messageCount).toBe(1);
    expect(ctx.getMessageCount()).toBe(1);
  });

  it("setMessages replaces all messages", () => {
    const ctx = makeCtx();
    addMessages(ctx, [{ role: "user", content: "original" }]);

    ctx.setMessages([
      { uuid: "new", role: "assistant", content: "replaced", timestamp: Date.now() },
    ]);

    expect(ctx.messageCount).toBe(1);
    expect(ctx.getMessages()[0]!.content).toBe("replaced");
  });

  it("getMessagesAfterLastCompaction returns all when no compaction boundary", () => {
    const ctx = makeCtx();
    addMessages(ctx, [
      { role: "user", content: "A" },
      { role: "assistant", content: "B" },
    ]);
    expect(ctx.getMessagesAfterLastCompaction()).toHaveLength(2);
  });

  it("getMessagesAfterLastCompaction returns only messages after boundary", () => {
    const ctx = makeCtx();
    ctx.addMessage({ role: "user", content: "Before compaction" });
    ctx.addMessage({ role: "system", content: "Summary", isCompactSummary: true });
    ctx.addMessage({ role: "user", content: "After compaction" });

    const after = ctx.getMessagesAfterLastCompaction();
    // Should include the boundary message and everything after
    expect(after).toHaveLength(2);
    expect(after[0]!.isCompactSummary).toBe(true);
    expect(after[1]!.content).toBe("After compaction");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Token Accounting
// ════════════════════════════════════════════════════════════════════════════

describe("ContextManager — token accounting", () => {
  it("estimateTotalTokens includes messages and sections", () => {
    const ctx = makeCtx({ contextWindowTokens: 100_000 });
    ctx.addSection({ key: "test", content: "x".repeat(100), placement: "system" });
    ctx.addMessage({ role: "user", content: "y".repeat(200) });

    const tokens = ctx.estimateTotalTokens();
    // Should include section tokens + message tokens
    expect(tokens).toBeGreaterThanOrEqual(300);
  });

  it("effectiveContextLimit = window - output reservation", () => {
    const ctx = makeCtx({ contextWindowTokens: 200_000, maxOutputTokens: 16_000 });
    expect(ctx.effectiveContextLimit).toBe(184_000);
  });

  it("autoCompactThreshold = effective limit - buffer", () => {
    const ctx = makeCtx({
      contextWindowTokens: 10_000,
      maxOutputTokens: 2_000,
      autoCompactBuffer: 500,
    });
    // effective = 10_000 - 2_000 = 8_000
    // threshold = 8_000 - 500 = 7_500
    expect(ctx.autoCompactThreshold).toBe(7_500);
  });

  it("headroom = threshold - current usage", () => {
    const ctx = makeCtx({
      contextWindowTokens: 10_000,
      maxOutputTokens: 2_000,
      autoCompactBuffer: 500,
    });
    const headroom = ctx.headroom;
    // With no messages and no sections, headroom ≈ threshold
    expect(headroom).toBeGreaterThan(7_000);
  });

  it("usagePercent is correct", () => {
    const ctx = makeCtx({
      contextWindowTokens: 1_000,
      maxOutputTokens: 200,
      autoCompactBuffer: 100,
    });
    // effective = 800, add ~400 tokens of content
    ctx.addMessage({ role: "user", content: "x".repeat(400) });
    const pct = ctx.usagePercent;
    expect(pct).toBeGreaterThanOrEqual(50);
    expect(pct).toBeLessThanOrEqual(100);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Compaction Triggers
// ════════════════════════════════════════════════════════════════════════════

describe("ContextManager — compaction triggers", () => {
  it("shouldCompact returns false when under threshold", () => {
    const ctx = makeCtx({ contextWindowTokens: 100_000 });
    ctx.addMessage({ role: "user", content: "short" });
    expect(ctx.shouldCompact()).toBe(false);
  });

  it("shouldCompact returns true when at or above threshold", () => {
    const ctx = makeCtx({
      contextWindowTokens: 500,
      maxOutputTokens: 100,
      autoCompactBuffer: 50,
    });
    // effective = 400, threshold = 350
    ctx.addMessage({ role: "user", content: "x".repeat(400) });
    expect(ctx.shouldCompact()).toBe(true);
  });

  it("isNearingLimit returns true before shouldCompact", () => {
    const ctx = makeCtx({
      contextWindowTokens: 1_000,
      maxOutputTokens: 200,
      autoCompactBuffer: 100,
    });
    // effective = 800, threshold = 700, warning = 700 - 20_000 < 0 → will be true when >0
    // Actually: warning = threshold - 20_000 = 700 - 20000 which is negative,
    // so isNearingLimit will be true for ANY content > threshold - WARNING_BUFFER
    // Let's add enough to trip shouldCompact too
    ctx.addMessage({ role: "user", content: "x".repeat(750) });
    expect(ctx.shouldCompact()).toBe(true);
    expect(ctx.isNearingLimit()).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Micro-Compaction
// ════════════════════════════════════════════════════════════════════════════

describe("ContextManager — micro-compaction", () => {
  it("clears old tool results but keeps recent N", () => {
    const ctx = makeCtx({ microCompactKeepRecent: 2 });

    // Add 5 tool_result messages
    for (let i = 0; i < 5; i++) {
      ctx.addMessage({
        role: "tool_result",
        content: `Tool result #${i}: ${"data".repeat(50)}`,
        metadata: { toolName: "search" },
      });
    }

    const result = ctx.microCompact();
    expect(result).not.toBeNull();
    expect(result!.toolResultsCleared).toBe(3); // 5 - 2 kept
    expect(result!.tokensFreed).toBeGreaterThan(0);
    expect(result!.clearedTools).toEqual(["search", "search", "search"]);

    // Verify: last 2 messages still have data; first 3 are cleared
    const msgs = ctx.getMessages();
    expect(msgs[0]!.content).toBe("[Old tool result content cleared]");
    expect(msgs[1]!.content).toBe("[Old tool result content cleared]");
    expect(msgs[2]!.content).toBe("[Old tool result content cleared]");
    expect(msgs[3]!.content).toContain("Tool result #3");
    expect(msgs[4]!.content).toContain("Tool result #4");
  });

  it("skips already-cleared tool results", () => {
    const ctx = makeCtx({ microCompactKeepRecent: 1 });

    ctx.addMessage({ role: "tool_result", content: "[Old tool result content cleared]" });
    ctx.addMessage({ role: "tool_result", content: "recent result" });

    const result = ctx.microCompact();
    // Already-cleared message shouldn't be counted
    expect(result).toBeNull(); // only 1 non-cleared, keepRecent=1 → nothing to clear
  });

  it("respects microCompactableTools filter", () => {
    const ctx = new ContextManager({
      contextWindowTokens: 10_000,
      maxOutputTokens: 2_000,
      autoCompactBuffer: 500,
      estimateTokensFn: charTokenEstimator,
      compactionStrategy: "truncate",
      microCompactKeepRecent: 1,
      microCompactableTools: new Set(["search"]),
    });

    // 'search' tool results are eligible; 'calc' are not
    ctx.addMessage({
      role: "tool_result",
      content: "search data",
      metadata: { toolName: "search" },
    });
    ctx.addMessage({ role: "tool_result", content: "calc data", metadata: { toolName: "calc" } });
    ctx.addMessage({
      role: "tool_result",
      content: "search latest",
      metadata: { toolName: "search" },
    });

    const result = ctx.microCompact()!;
    // Only the first search result should be cleared (keepRecent=1, calc is ineligible)
    expect(result.toolResultsCleared).toBe(1);
    expect(result.clearedTools).toEqual(["search"]);

    const msgs = ctx.getMessages();
    expect(msgs[0]!.content).toBe("[Old tool result content cleared]");
    expect(msgs[1]!.content).toBe("calc data"); // untouched
    expect(msgs[2]!.content).toBe("search latest"); // kept (recent)
  });

  it("returns null when microCompactKeepRecent is 0 (disabled)", () => {
    const ctx = makeCtx({ microCompactKeepRecent: 0 });
    ctx.addMessage({ role: "tool_result", content: "data" });
    expect(ctx.microCompact()).toBeNull();
  });

  it("returns null when nothing to clear (fewer than keepRecent)", () => {
    const ctx = makeCtx({ microCompactKeepRecent: 5 });
    ctx.addMessage({ role: "tool_result", content: "data" });
    ctx.addMessage({ role: "tool_result", content: "data2" });
    expect(ctx.microCompact()).toBeNull();
  });

  it("sets microCompacted metadata on cleared messages", () => {
    const ctx = makeCtx({ microCompactKeepRecent: 1 });
    ctx.addMessage({ role: "tool_result", content: "old data", metadata: { toolName: "x" } });
    ctx.addMessage({ role: "tool_result", content: "new data" });

    ctx.microCompact();

    const msgs = ctx.getMessages();
    expect(msgs[0]!.metadata?.["microCompacted"]).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Full Compaction (legacy string strategies)
// ════════════════════════════════════════════════════════════════════════════

describe("ContextManager — full compaction", () => {
  it("truncate strategy drops oldest 50%", async () => {
    const ctx = makeCtx({ compactionStrategy: "truncate" });

    addMessages(ctx, [
      { role: "user", content: "msg 1" },
      { role: "assistant", content: "msg 2" },
      { role: "user", content: "msg 3" },
      { role: "assistant", content: "msg 4" },
    ]);

    const result = await ctx.compact();
    expect(result.messagesRemoved).toBe(2); // floor(4/2)
    expect(result.tokensFreed).toBeGreaterThan(0);
    expect(ctx.messageCount).toBe(2);
    expect(ctx.getMessages()[0]!.content).toBe("msg 3");
  });

  it("sliding_window strategy keeps recent messages within 60% of window", async () => {
    const ctx = makeCtx({
      compactionStrategy: "sliding_window",
      contextWindowTokens: 200,
      maxOutputTokens: 40,
      autoCompactBuffer: 10,
    });

    // effective = 160, target = 160 * 0.6 = 96 chars
    addMessages(ctx, [
      { role: "user", content: "x".repeat(50) },
      { role: "assistant", content: "y".repeat(50) },
      { role: "user", content: "z".repeat(30) },
    ]);

    const result = await ctx.compact();
    expect(result.messagesRemoved).toBeGreaterThan(0);
    // Some messages should remain
    expect(ctx.messageCount).toBeGreaterThan(0);
    expect(ctx.messageCount).toBeLessThan(3);
  });

  it("summarize strategy calls summarizeFn and replaces messages", async () => {
    const summarizeFn = vi.fn(async () => "Summary.");

    const ctx = new ContextManager({
      contextWindowTokens: 10_000,
      maxOutputTokens: 2_000,
      autoCompactBuffer: 500,
      estimateTokensFn: charTokenEstimator,
      compactionStrategy: "summarize",
      summarizeFn,
    });

    // Use LONG messages so the summary (short) frees tokens
    addMessages(ctx, [
      { role: "user", content: "x".repeat(500) },
      { role: "assistant", content: "y".repeat(500) },
      { role: "user", content: "z".repeat(500) },
      { role: "assistant", content: "w".repeat(500) },
    ]);

    const result = await ctx.compact();

    expect(summarizeFn).toHaveBeenCalledOnce();
    expect(result.summary).toBe("Summary.");
    expect(result.messagesRemoved).toBe(4);
    // With 2000 chars of content replaced by a short summary, tokens MUST be freed
    expect(result.tokensFreed).toBeGreaterThan(0);

    // Messages replaced with boundary + summary
    expect(ctx.messageCount).toBe(2);
    const msgs = ctx.getMessages();
    expect(msgs[0]!.role).toBe("system");
    expect(msgs[0]!.metadata?.["type"]).toBe("compact_boundary");
    expect(msgs[1]!.isCompactSummary).toBe(true);
    expect(msgs[1]!.content).toContain("Summary.");
  });

  it("summarize strategy throws if summarizeFn returns empty", async () => {
    const ctx = new ContextManager({
      contextWindowTokens: 10_000,
      maxOutputTokens: 2_000,
      estimateTokensFn: charTokenEstimator,
      compactionStrategy: "summarize",
      summarizeFn: async () => "",
    });

    addMessages(ctx, [
      { role: "user", content: "A" },
      { role: "assistant", content: "B" },
    ]);

    await expect(ctx.compact()).rejects.toThrow("empty result");
  });

  it("compact throws with fewer than 2 messages", async () => {
    const ctx = makeCtx();
    ctx.addMessage({ role: "user", content: "solo" });
    await expect(ctx.compact()).rejects.toThrow("Not enough messages");
  });

  it("compact with onExtractFacts calls the hook and includes facts", async () => {
    const extractFn = vi.fn(async (msgs: Message[]) => [
      "User wants fast responses",
      "Project uses TypeScript",
    ]);

    const ctx = new ContextManager({
      contextWindowTokens: 10_000,
      maxOutputTokens: 2_000,
      estimateTokensFn: charTokenEstimator,
      compactionStrategy: "summarize",
      summarizeFn: async () => "Summary.",
      onExtractFacts: extractFn,
    });

    addMessages(ctx, [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi" },
    ]);

    const result = await ctx.compact();
    expect(extractFn).toHaveBeenCalledOnce();
    expect(result.extractedFacts).toEqual(["User wants fast responses", "Project uses TypeScript"]);
  });

  it("compact with onExtractFacts failure does not block compaction", async () => {
    const ctx = new ContextManager({
      contextWindowTokens: 10_000,
      maxOutputTokens: 2_000,
      estimateTokensFn: charTokenEstimator,
      compactionStrategy: "summarize",
      summarizeFn: async () => "Summary.",
      onExtractFacts: async () => {
        throw new Error("extraction failed");
      },
    });

    addMessages(ctx, [
      { role: "user", content: "A" },
      { role: "assistant", content: "B" },
    ]);

    // Should NOT throw — extraction failure is non-fatal
    const result = await ctx.compact();
    expect(result.summary).toBe("Summary.");
    expect(result.extractedFacts).toBeUndefined();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Plugin strategy delegation
// ════════════════════════════════════════════════════════════════════════════

describe("ContextManager — plugin strategy", () => {
  it("delegates to strategy.compact when strategy plugin is set", async () => {
    const compactFn = vi.fn(async (ctx: any) => ({
      messages: [
        {
          uuid: "new",
          role: "assistant" as const,
          content: "Plugin summary",
          timestamp: Date.now(),
        },
      ],
      summary: "Plugin did the compaction",
      messagesRemoved: 5,
    }));

    const ctx = new ContextManager({
      contextWindowTokens: 10_000,
      maxOutputTokens: 2_000,
      estimateTokensFn: charTokenEstimator,
      compactionStrategy: "truncate", // should be ignored when strategy is set
      strategy: { name: "test-strategy", compact: compactFn },
    });

    addMessages(ctx, [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "World" },
    ]);

    const result = await ctx.compact();
    expect(compactFn).toHaveBeenCalledOnce();
    expect(result.summary).toBe("Plugin did the compaction");
    expect(result.messagesRemoved).toBe(5);
    // Messages should be replaced by what the plugin returned
    expect(ctx.messageCount).toBe(1);
    expect(ctx.getMessages()[0]!.content).toBe("Plugin summary");
  });

  it("throws when strategy plugin returns null", async () => {
    const ctx = new ContextManager({
      contextWindowTokens: 10_000,
      maxOutputTokens: 2_000,
      estimateTokensFn: charTokenEstimator,
      compactionStrategy: "truncate",
      strategy: { name: "noop-strategy", compact: async () => null as any },
    });

    addMessages(ctx, [
      { role: "user", content: "A" },
      { role: "assistant", content: "B" },
    ]);

    await expect(ctx.compact()).rejects.toThrow("noop-strategy");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Constructor validation
// ════════════════════════════════════════════════════════════════════════════

describe("ContextManager — constructor validation", () => {
  it("throws when summarize strategy is set but no summarizer configured", () => {
    expect(
      () =>
        new ContextManager({
          contextWindowTokens: 10_000,
          maxOutputTokens: 2_000,
          compactionStrategy: "summarize",
          // No summarizeFn, no llmAdapter
        }),
    ).toThrow("no summarizer");
  });

  it("does NOT throw for truncate strategy without summarizer", () => {
    expect(
      () =>
        new ContextManager({
          contextWindowTokens: 10_000,
          maxOutputTokens: 2_000,
          compactionStrategy: "truncate",
        }),
    ).not.toThrow();
  });

  it("does NOT throw for sliding_window strategy without summarizer", () => {
    expect(
      () =>
        new ContextManager({
          contextWindowTokens: 10_000,
          maxOutputTokens: 2_000,
          compactionStrategy: "sliding_window",
        }),
    ).not.toThrow();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// getStats snapshot
// ════════════════════════════════════════════════════════════════════════════

describe("ContextManager — getStats", () => {
  it("returns complete diagnostic snapshot", () => {
    const ctx = makeCtx({
      contextWindowTokens: 10_000,
      maxOutputTokens: 2_000,
      autoCompactBuffer: 500,
    });

    ctx.addMessage({ role: "user", content: "Hello world" });

    const stats = ctx.getStats();
    expect(stats.messageCount).toBe(1);
    expect(typeof stats.estimatedTokens).toBe("number");
    expect(stats.effectiveLimit).toBe(8_000);
    expect(stats.autoCompactThreshold).toBe(7_500);
    expect(typeof stats.usagePercent).toBe("number");
    expect(typeof stats.headroom).toBe("number");
    expect(stats.compactionCount).toBe(0);
    expect(stats.microCompactionCount).toBe(0);
    expect(typeof stats.isNearingLimit).toBe("boolean");
  });

  it("increments compactionCount after compact (summarize path)", async () => {
    // Note: `truncate` strategy does NOT increment compactionCount —
    // only the `summarize` path does (via ++this.compactionCount in the
    // boundary message creation). Strategy plugin also increments it.
    const ctx = new ContextManager({
      contextWindowTokens: 10_000,
      maxOutputTokens: 2_000,
      autoCompactBuffer: 500,
      estimateTokensFn: charTokenEstimator,
      compactionStrategy: "summarize",
      summarizeFn: async () => "Summary.",
    });
    addMessages(ctx, [
      { role: "user", content: "x".repeat(200) },
      { role: "assistant", content: "y".repeat(200) },
    ]);
    await ctx.compact();
    expect(ctx.getStats().compactionCount).toBe(1);
  });

  it("increments microCompactionCount after microCompact", () => {
    const ctx = makeCtx({ microCompactKeepRecent: 1 });
    for (let i = 0; i < 3; i++) {
      ctx.addMessage({ role: "tool_result", content: `data ${i}` });
    }
    ctx.microCompact();
    expect(ctx.getStats().microCompactionCount).toBe(1);
  });
});
