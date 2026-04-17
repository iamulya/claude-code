/**
 * Tool Result Budget test suite
 *
 * Tests the aggregate size limiting for tool results in context.
 */

import { describe, it, expect } from "vitest";
import { applyToolResultBudget } from "../utils/toolResultBudget.js";
import type { ChatMessage } from "../agents/runner.js";

function makeConversation(toolResultSizes: number[]): ChatMessage[] {
  const messages: ChatMessage[] = [];
  messages.push({ role: "user", content: "Do something" });

  for (let i = 0; i < toolResultSizes.length; i++) {
    // Assistant message with tool call
    messages.push({
      role: "assistant",
      content: `Calling tool ${i}`,
      toolCalls: [{ id: `tc${i}`, name: `tool${i}`, arguments: "{}" }],
    });
    // Tool result
    messages.push({
      role: "tool",
      toolCallId: `tc${i}`,
      name: `tool${i}`,
      content: "x".repeat(toolResultSizes[i]!),
    });
  }

  messages.push({ role: "assistant", content: "Done" });
  return messages;
}

describe("applyToolResultBudget", () => {
  it("returns unchanged messages when within budget", () => {
    const messages = makeConversation([100, 200, 300]);
    const result = applyToolResultBudget(messages, { maxTotalChars: 10_000 });
    expect(result.cleared).toBe(0);
    expect(result.charsFreed).toBe(0);
    expect(result.messages).toBe(messages); // Same reference — no copy
  });

  it("clears oldest tool results when budget exceeded", () => {
    const messages = makeConversation([10_000, 10_000, 10_000, 10_000, 10_000]);
    const result = applyToolResultBudget(messages, {
      maxTotalChars: 30_000,
      keepRecent: 2,
    });
    expect(result.cleared).toBeGreaterThan(0);
    expect(result.charsFreed).toBeGreaterThan(0);

    // Recent tool results should be intact
    const toolResults = result.messages.filter((m) => m.role === "tool");
    const lastTwo = toolResults.slice(-2);
    for (const tr of lastTwo) {
      expect(tr.content.length).toBe(10_000); // unchanged
    }
  });

  it("preserves keepRecent results when clearing clearable results suffices", () => {
    // 3 results × 50K = 150K total; budget=60K; keepRecent=2
    // clearableCount = max(0, 3-2) = 1
    // After clearing 1 (oldest): 2 × 50K = 100K > 60K → still over budget
    // Our fix: continue into protected results (oldest first) until under budget
    // → 2nd result also cleared → remaining 1 × 50K = 50K < 60K
    // (keepRecent is a soft ordering preference, not a hard budget bypass)
    const messages = makeConversation([50_000, 50_000, 50_000]);
    const result = applyToolResultBudget(messages, {
      maxTotalChars: 60_000,
      keepRecent: 2,
    });
    const toolResults = result.messages.filter((m) => m.role === "tool");
    // Oldest two cleared to bring 150K → 50K < 60K; most-recent one kept
    expect(toolResults[0]!.content).toContain("cleared");
    expect(toolResults[1]!.content).toContain("cleared");
    expect(toolResults[2]!.content.length).toBe(50_000); // newest kept
  });

  it("respects exempt tools", () => {
    const messages: ChatMessage[] = [
      { role: "user", content: "Test" },
      {
        role: "assistant",
        content: "Call",
        toolCalls: [{ id: "tc1", name: "important", arguments: "{}" }],
      },
      { role: "tool", toolCallId: "tc1", name: "important", content: "x".repeat(100_000) },
      {
        role: "assistant",
        content: "Call2",
        toolCalls: [{ id: "tc2", name: "normal", arguments: "{}" }],
      },
      { role: "tool", toolCallId: "tc2", name: "normal", content: "y".repeat(100_000) },
      {
        role: "assistant",
        content: "Call3",
        toolCalls: [{ id: "tc3", name: "normal2", arguments: "{}" }],
      },
      { role: "tool", toolCallId: "tc3", name: "normal2", content: "z".repeat(100_000) },
    ];

    const result = applyToolResultBudget(messages, {
      maxTotalChars: 150_000,
      keepRecent: 1,
      exemptTools: new Set(["important"]),
    });

    // 'important' tool should NOT be cleared even though it's old
    const toolResults = result.messages.filter((m) => m.role === "tool");
    expect(toolResults[0]!.content.length).toBe(100_000); // exempt, kept
    // 'normal' should be cleared (oldest non-exempt)
    expect(toolResults[1]!.content).toContain("cleared");
  });

  it("enforces budget even when keepRecent exceeds result count", () => {
    // the old behavior returned unchanged messages when
    // toolResults.length <= keepRecent regardless of the budget. The correct
    // behavior is that the budget always wins; keepRecent only controls ordering.
    const messages = makeConversation([100_000, 100_000]);
    const result = applyToolResultBudget(messages, {
      maxTotalChars: 50_000,
      keepRecent: 5, // More than we have — all are "recent" but budget still applies
    });
    // Budget = 50K but total = 200K → must clear at least 3 placeholder-equivalents
    // clearableCount = max(0, 2-5) = 0, so protectedResults has both
    // Loop clears oldest first until under 50K
    expect(result.cleared).toBeGreaterThan(0);
  });

  it("uses custom cleared message", () => {
    const messages = makeConversation([100_000, 100_000]);
    const result = applyToolResultBudget(messages, {
      maxTotalChars: 50_000,
      keepRecent: 1,
      clearedMessage: "[CUSTOM CLEARED]",
    });
    const toolResults = result.messages.filter((m) => m.role === "tool");
    expect(toolResults[0]!.content).toBe("[CUSTOM CLEARED]");
  });
});
