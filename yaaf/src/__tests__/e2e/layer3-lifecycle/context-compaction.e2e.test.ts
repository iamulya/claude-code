/**
 * L3-03: Context Compaction — Lifecycle & Durability
 *
 * Validates that the ContextManager's compaction subsystem correctly
 * handles multi-cycle compaction, micro-compaction, strategy delegation,
 * and concurrent compaction coalescing.
 */

import { describe, it, expect, afterEach } from "vitest";
import {
  ContextManager,
  type Message,
  type CompactionResult,
} from "../../../context/contextManager.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fakeEstimateTokens(text: string): number {
  // ~4 chars per token — deterministic and fast
  return Math.ceil(text.length / 4);
}

function createCompactableCtx(opts?: {
  strategy?: "summarize" | "truncate" | "sliding_window";
  contextWindowTokens?: number;
  maxOutputTokens?: number;
  autoCompactBuffer?: number;
  microCompactKeepRecent?: number;
  onTruncate?: (dropped: Message[], strategy: "truncate" | "sliding_window") => void;
}): ContextManager {
  const strategy = opts?.strategy ?? "truncate";
  return new ContextManager({
    contextWindowTokens: opts?.contextWindowTokens ?? 1000,
    maxOutputTokens: opts?.maxOutputTokens ?? 100,
    autoCompactBuffer: opts?.autoCompactBuffer ?? 100,
    compactionStrategy: strategy,
    estimateTokensFn: fakeEstimateTokens,
    summarizeFn:
      strategy === "summarize"
        ? async ({ messages }) => {
            return `Summary of ${messages.length} messages`;
          }
        : undefined,
    microCompactKeepRecent: opts?.microCompactKeepRecent ?? 3,
    onTruncate: opts?.onTruncate,
  });
}

function addMessages(ctx: ContextManager, count: number, contentSize = 40): void {
  for (let i = 0; i < count; i++) {
    const role = i % 2 === 0 ? "user" : "assistant";
    ctx.addMessage({
      role: role as "user" | "assistant",
      content: `Message ${i}: ${"x".repeat(contentSize)}`,
    });
  }
}

function addToolMessages(ctx: ContextManager, count: number): void {
  for (let i = 0; i < count; i++) {
    ctx.addMessage({
      role: "tool_result",
      content: `Tool result ${i}: ${"data".repeat(20)}`,
      toolUseId: `tool-${i}`,
      metadata: { toolName: `tool_${i}` },
    });
  }
}

describe("L3-03: Context Compaction", () => {
  // ── Threshold Detection ─────────────────────────────────────────────────────

  it("shouldCompact() fires when tokens exceed threshold", () => {
    const ctx = createCompactableCtx({
      contextWindowTokens: 200,
      maxOutputTokens: 50,
      autoCompactBuffer: 20,
    });
    // Threshold = 200 - 50 - 20 = 130 tokens

    // Add small messages — should be under threshold
    addMessages(ctx, 2, 10);
    expect(ctx.shouldCompact()).toBe(false);

    // Add enough to exceed threshold
    addMessages(ctx, 20, 40);
    expect(ctx.shouldCompact()).toBe(true);
  });

  // ── Truncation Strategy ─────────────────────────────────────────────────────

  it("truncate strategy drops oldest 50% of messages", async () => {
    const ctx = createCompactableCtx({ strategy: "truncate" });
    addMessages(ctx, 10);
    expect(ctx.messageCount).toBe(10);

    const result = await ctx.compact();
    expect(result.messagesRemoved).toBe(5);
    expect(ctx.messageCount).toBe(5);

    // Remaining messages should be the last 5
    const msgs = ctx.getMessages();
    expect((msgs[0]!.content as string)).toContain("Message 5");
  });

  it("truncate strategy calls onTruncate with dropped messages", async () => {
    const dropped: Message[] = [];
    const ctx = createCompactableCtx({
      strategy: "truncate",
      onTruncate: (msgs) => {
        dropped.push(...msgs);
      },
    });
    addMessages(ctx, 10);
    await ctx.compact();

    expect(dropped).toHaveLength(5);
    expect((dropped[0]!.content as string)).toContain("Message 0");
  });

  // ── Sliding Window Strategy ─────────────────────────────────────────────────

  it("sliding_window keeps only recent messages within budget", async () => {
    const ctx = createCompactableCtx({
      strategy: "sliding_window",
      contextWindowTokens: 500,
      maxOutputTokens: 50,
    });
    addMessages(ctx, 30, 30);

    const result = await ctx.compact();
    expect(result.messagesRemoved).toBeGreaterThan(0);

    // Remaining messages should be a subset of the original
    const remaining = ctx.getMessages();
    for (const msg of remaining) {
      expect(typeof msg.content).toBe("string");
    }
  });

  // ── Summarize Strategy ──────────────────────────────────────────────────────

  it("summarize strategy replaces all messages with summary", async () => {
    const ctx = createCompactableCtx({ strategy: "summarize" });
    addMessages(ctx, 10);

    const result = await ctx.compact();
    expect(result.messagesRemoved).toBe(10);
    expect(result.summary).toContain("Summary of 10 messages");

    // After compaction, should have 2 messages: boundary + summary
    expect(ctx.messageCount).toBe(2);
    const msgs = ctx.getMessages();
    expect(msgs[0]!.isMeta).toBe(true);
    expect(msgs[1]!.isCompactSummary).toBe(true);
  });

  // ── Multiple Compaction Cycles ──────────────────────────────────────────────

  it("3 consecutive compaction cycles don't corrupt history", async () => {
    const ctx = createCompactableCtx({ strategy: "truncate" });

    for (let cycle = 0; cycle < 3; cycle++) {
      addMessages(ctx, 20, 10);
      await ctx.compact();
    }

    // Messages should be parseable and well-formed
    const msgs = ctx.getMessages();
    expect(msgs.length).toBeGreaterThan(0);
    for (const msg of msgs) {
      expect(typeof msg.content).toBe("string");
      expect(["user", "assistant", "system", "tool_result"]).toContain(msg.role);
      expect(msg.uuid).toBeDefined();
    }
  });

  // ── Micro-Compaction ────────────────────────────────────────────────────────

  it("microCompact clears old tool results but keeps recent N", () => {
    const ctx = createCompactableCtx({ microCompactKeepRecent: 2 });

    // Add 5 tool results
    addToolMessages(ctx, 5);

    const result = ctx.microCompact();
    expect(result).not.toBeNull();
    expect(result!.toolResultsCleared).toBe(3);
    expect(result!.tokensFreed).toBeGreaterThan(0);

    // The last 2 tool results should still have content
    const msgs = ctx.getMessages();
    const toolMsgs = msgs.filter((m) => m.role === "tool_result");
    const cleared = toolMsgs.filter(
      (m) => typeof m.content === "string" && m.content.includes("[Old tool result"),
    );
    expect(cleared).toHaveLength(3);

    // The last 2 should have original content
    const preserved = toolMsgs.filter(
      (m) => typeof m.content === "string" && m.content.includes("Tool result"),
    );
    expect(preserved).toHaveLength(2);
  });

  it("microCompact is idempotent — cleared results are not re-cleared", () => {
    const ctx = createCompactableCtx({ microCompactKeepRecent: 2 });
    addToolMessages(ctx, 5);

    const r1 = ctx.microCompact();
    expect(r1!.toolResultsCleared).toBe(3);

    // Second call — no new clearable results
    const r2 = ctx.microCompact();
    expect(r2).toBeNull();
  });

  // ── Concurrency Coalescing ──────────────────────────────────────────────────

  it("concurrent compact() calls are coalesced into one", async () => {
    let summarizeCallCount = 0;
    const ctx = new ContextManager({
      contextWindowTokens: 1000,
      maxOutputTokens: 100,
      autoCompactBuffer: 100,
      compactionStrategy: "summarize",
      estimateTokensFn: fakeEstimateTokens,
      summarizeFn: async ({ messages }) => {
        summarizeCallCount++;
        // Simulate LLM latency
        await new Promise((r) => setTimeout(r, 50));
        return `Summary of ${messages.length} messages`;
      },
    });

    addMessages(ctx, 20, 20);

    // Fire two concurrent compact() calls
    const [r1, r2] = await Promise.all([ctx.compact(), ctx.compact()]);

    // Both should resolve with the same result
    expect(r1.summary).toBe(r2.summary);
    expect(r1.messagesRemoved).toBe(r2.messagesRemoved);

    // The summarize function should have been called only once
    expect(summarizeCallCount).toBe(1);
  });

  // ── getMessagesAfterLastCompaction ──────────────────────────────────────────

  it("getMessagesAfterLastCompaction returns only post-compact messages", async () => {
    const ctx = createCompactableCtx({ strategy: "summarize" });
    addMessages(ctx, 10);
    await ctx.compact();

    // Add new messages after compaction
    ctx.addMessage({ role: "user", content: "New question after compact" });

    const afterCompact = ctx.getMessagesAfterLastCompaction();
    // Should include the summary message and the new message
    const hasNewQuestion = afterCompact.some(
      (m) => typeof m.content === "string" && m.content.includes("New question"),
    );
    expect(hasNewQuestion).toBe(true);
  });

  // ── Stats Snapshot ──────────────────────────────────────────────────────────

  it("getStats() reflects compaction count", async () => {
    const ctx = createCompactableCtx({ strategy: "truncate" });
    expect(ctx.getStats().compactionCount).toBe(0);

    addMessages(ctx, 10);
    await ctx.compact();
    expect(ctx.getStats().compactionCount).toBe(1);

    addMessages(ctx, 10);
    await ctx.compact();
    expect(ctx.getStats().compactionCount).toBe(2);
  });

  // ── Error Handling ──────────────────────────────────────────────────────────

  it("compact throws when fewer than 2 messages", async () => {
    const ctx = createCompactableCtx({ strategy: "truncate" });
    ctx.addMessage({ role: "user", content: "Only one message" });

    await expect(ctx.compact()).rejects.toThrow(/not enough messages/i);
  });

  it("summarize strategy throws when summarizeFn returns empty", async () => {
    const ctx = new ContextManager({
      contextWindowTokens: 1000,
      maxOutputTokens: 100,
      autoCompactBuffer: 100,
      compactionStrategy: "summarize",
      estimateTokensFn: fakeEstimateTokens,
      summarizeFn: async () => "",
    });

    addMessages(ctx, 5);
    await expect(ctx.compact()).rejects.toThrow(/empty/i);
  });
});
