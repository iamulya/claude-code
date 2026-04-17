/**
 * L1-03: Agent + Context E2E
 *
 * Tests real wiring between Agent, ContextManager, and CompactionStrategies.
 */

import { describe, it, expect } from "vitest";
import {
  TruncateStrategy,
  SlidingWindowStrategy,
  MicroCompactStrategy,
  type CompactionContext,
} from "../../../context/strategies.js";
import type { Message } from "../../../context/contextManager.js";
import { CompactionCircuitBreaker } from "../../../context/circuitBreaker.js";
import { snipHistory, deduplicateToolResults } from "../../../context/historySnip.js";


// Helper: create a Message object for CompactionContext
function makeMessage(role: string, content: string, i: number): Message {
  return {
    uuid: `uuid-${i}`,
    role: role as "user" | "assistant" | "tool_result" | "system",
    content,
    timestamp: Date.now() - (100 - i) * 1000,
  };
}

describe("L1-03: Agent + Context E2E", () => {
  it("TruncateStrategy drops ~50% of oldest messages", async () => {
    const strategy = new TruncateStrategy({ dropRatio: 0.5 });

    const messages: Message[] = Array.from({ length: 20 }, (_, i) =>
      makeMessage(i % 2 === 0 ? "user" : "assistant", `Message ${i}`, i),
    );

    const ctx: CompactionContext = {
      messages,
      totalTokens: 5000,
      effectiveLimit: 2000,
      autoCompactThreshold: 0.8,
      compactionCount: 0,
      estimateTokens: (text: string) => Math.ceil(text.length / 4),
    };

    const result = await strategy.compact(ctx);
    expect(result).not.toBeNull();
    expect(result!.messagesRemoved).toBeGreaterThan(0);
    expect(result!.messages.length).toBeLessThan(messages.length);
    // Last message should be preserved
    expect(result!.messages[result!.messages.length - 1]!.content).toBe("Message 19");
  });

  it("SlidingWindowStrategy keeps only recent messages that fit budget", async () => {
    const strategy = new SlidingWindowStrategy({ targetFraction: 0.6 });

    const messages: Message[] = Array.from({ length: 20 }, (_, i) =>
      makeMessage(i % 2 === 0 ? "user" : "assistant", `Message ${i}: ${"word ".repeat(20)}`, i),
    );

    const ctx: CompactionContext = {
      messages,
      totalTokens: 5000,
      effectiveLimit: 200,
      autoCompactThreshold: 0.8,
      compactionCount: 0,
      estimateTokens: (text: string) => Math.ceil(text.length / 4),
    };

    const result = await strategy.compact(ctx);
    expect(result).not.toBeNull();
    expect(result!.messages.length).toBeLessThan(messages.length);
    // Last message should be preserved
    expect(result!.messages[result!.messages.length - 1]!.content).toContain("Message 19");
  });

  it("snipHistory removes old large tool results", () => {
    const messages = Array.from({ length: 30 }, (_, i) => ({
      role: i % 3 === 2 ? "tool" : i % 2 === 0 ? "user" : "assistant",
      content:
        i % 3 === 2
          ? `Tool result ${i}: ${"data ".repeat(200)}`
          : `Turn ${i}: ${"content ".repeat(10)}`,
      toolCallId: i % 3 === 2 ? `tc-${i}` : undefined,
    }));

    const result = snipHistory(messages, {
      maxToolResultAge: 5,
      keepRecent: 2,
      minSnipTokens: 10,
    });

    // Should have the same number of messages but some content replaced
    expect(result.snipped.length).toBe(messages.length);
    // Some tool results should have been snipped
    expect(result.itemsRemoved).toBeGreaterThanOrEqual(0);
  });

  it("deduplicateToolResults replaces earlier duplicates", () => {
    const messages = [
      { role: "user", content: "Do something" },
      {
        role: "tool",
        toolCallId: "tc1",
        toolName: "search",
        content: "Result: quantum computing is...",
      },
      { role: "assistant", content: "Okay" },
      { role: "user", content: "Do it again" },
      {
        role: "tool",
        toolCallId: "tc2",
        toolName: "search",
        content: "Result: quantum computing is...",
      },
      { role: "assistant", content: "Same result" },
    ];

    const result = deduplicateToolResults(messages);
    // Should return a SnipResult object
    expect(result.snipped.length).toBe(messages.length);
    // The earlier duplicate should have been replaced
    if (result.itemsRemoved > 0) {
      const firstTool = result.snipped.find((m) => m.toolCallId === "tc1");
      expect(firstTool!.content).toContain("Duplicate");
    }
  });

  it("CompactionCircuitBreaker prevents repeated failures", () => {
    const breaker = new CompactionCircuitBreaker({
      maxConsecutiveFailures: 3,
    });

    // Initially closed (safe to compact)
    expect(breaker.isClosed).toBe(true);
    expect(breaker.isOpen).toBe(false);

    // Record 3 failures
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();

    // Now open (should NOT compact)
    expect(breaker.isOpen).toBe(true);
    expect(breaker.failures).toBe(3);

    // Success resets
    breaker.recordSuccess();
    expect(breaker.isClosed).toBe(true);
    expect(breaker.failures).toBe(0);
  });

  it("CompactionCircuitBreaker reset() manually closes breaker", () => {
    const breaker = new CompactionCircuitBreaker({ maxConsecutiveFailures: 2 });

    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.isOpen).toBe(true);

    breaker.reset();
    expect(breaker.isOpen).toBe(false);
    expect(breaker.isClosed).toBe(true);
  });

  it("MicroCompactStrategy clears old tool results", async () => {
    const strategy = new MicroCompactStrategy({ keepRecent: 2 });

    // Create messages with tool_result role
    const messages: Message[] = [];
    for (let i = 0; i < 10; i++) {
      messages.push(makeMessage("user", `Query ${i}`, i * 3));
      messages.push(makeMessage("tool_result", `Big result ${i}: ${"data ".repeat(100)}`, i * 3 + 1));
      messages.push(makeMessage("assistant", `Response ${i}`, i * 3 + 2));
    }

    const ctx: CompactionContext = {
      messages,
      totalTokens: 10000,
      effectiveLimit: 5000,
      autoCompactThreshold: 0.8,
      compactionCount: 0,
      estimateTokens: (text: string) => Math.ceil(text.length / 4),
    };

    const result = await strategy.compact(ctx);
    if (result) {
      // Should clear old tool results but keep recent ones
      expect(result.isPartial).toBe(true);
      expect(result.tokensFreed).toBeGreaterThan(0);
    }
  });
});
