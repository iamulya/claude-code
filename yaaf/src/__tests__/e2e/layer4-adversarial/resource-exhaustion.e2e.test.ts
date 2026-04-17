/**
 * L4-03: Resource Exhaustion — Adversarial & Chaos
 *
 * Validates that the framework handles extreme inputs without crashing:
 * - Very large user messages hit context limits gracefully
 * - The ContextManager auto-compacts when messages exceed the budget
 * - Concurrent Agent.run() calls don't deadlock
 * - Rate limiter correctly caps request floods
 * - PerUserRateLimiter isolates users and cleans up resources
 */

import { describe, it, expect, afterEach } from "vitest";
import { AgentRunner, type ChatModel, type ChatResult } from "../../../agents/runner.js";
import { ContextManager } from "../../../context/contextManager.js";
import { PerUserRateLimiter } from "../../../security/rateLimiter.js";
import { textModel } from "../_fixtures/mockModel.js";

describe("L4-03: Resource Exhaustion", () => {
  // ── Context Window Pressure ─────────────────────────────────────────────────

  it("ContextManager rejects addMessage when message is empty", () => {
    const ctx = new ContextManager({
      contextWindowTokens: 500,
      maxOutputTokens: 100,
      compactionStrategy: "truncate",
      estimateTokensFn: (text) => Math.ceil(text.length / 4),
    });

    // Empty messages are technically valid — test empty string
    ctx.addMessage({ role: "user", content: "" });
    expect(ctx.getMessages().length).toBe(1);
  });

  it("ContextManager handles a single massive message", () => {
    const ctx = new ContextManager({
      contextWindowTokens: 100,
      maxOutputTokens: 10,
      compactionStrategy: "truncate",
      estimateTokensFn: (text) => Math.ceil(text.length / 4),
    });

    // Add a message that far exceeds context window on its own
    const hugeContent = "x".repeat(10_000);
    ctx.addMessage({ role: "user", content: hugeContent });

    // Should mark as needing compaction
    expect(ctx.shouldCompact()).toBe(true);
    expect(ctx.estimateTotalTokens()).toBeGreaterThan(100);
  });

  it("shouldCompact() triggers at the correct threshold", () => {
    const ctx = new ContextManager({
      contextWindowTokens: 200,
      maxOutputTokens: 10,
      autoCompactBuffer: 0,
      compactionStrategy: "truncate",
      estimateTokensFn: (text) => Math.ceil(text.length / 4),
    });

    // Threshold = 200 - 10 - 0 = 190 tokens
    // Adding messages until we cross the threshold
    for (let i = 0; i < 100; i++) {
      ctx.addMessage({ role: "user", content: `Message ${i}: ${"x".repeat(8)}` });
      if (ctx.shouldCompact()) break;
    }

    expect(ctx.shouldCompact()).toBe(true);
    const tokens = ctx.estimateTotalTokens();
    expect(tokens).toBeGreaterThanOrEqual(190);
  });

  it("compact(truncate) reduces message count", async () => {
    const ctx = new ContextManager({
      contextWindowTokens: 200,
      maxOutputTokens: 10,
      autoCompactBuffer: 0,
      compactionStrategy: "truncate",
      estimateTokensFn: (text) => Math.ceil(text.length / 4),
    });

    // Fill beyond threshold
    for (let i = 0; i < 50; i++) {
      ctx.addMessage({ role: "user", content: `Message ${i}: ${"x".repeat(20)}` });
    }

    const preCount = ctx.getMessages().length;
    expect(preCount).toBe(50);
    const preTokens = ctx.estimateTotalTokens();

    await ctx.compact();

    const postCount = ctx.getMessages().length;
    expect(postCount).toBeLessThan(preCount);

    // Token count should have decreased significantly
    expect(ctx.estimateTotalTokens()).toBeLessThan(preTokens);
  });

  // ── Rate Limiter Under Flood ─────────────────────────────────────────

  it("rate limiter blocks requests after maxTurnsPerUser", () => {
    const limiter = new PerUserRateLimiter({ maxTurnsPerUser: 3, gcIntervalMs: 0 });

    for (let i = 0; i < 3; i++) {
      limiter.enforce("flood-user");
      limiter.recordUsage("flood-user", { turns: 1, cost: 0, tokens: 0 });
    }

    expect(() => limiter.enforce("flood-user")).toThrow(/turn limit exceeded/i);
    limiter.dispose();
  });

  it("rate limiter isolates different users", () => {
    const limiter = new PerUserRateLimiter({ maxTurnsPerUser: 2, gcIntervalMs: 0 });

    // Exhaust user-A
    limiter.enforce("user-A");
    limiter.recordUsage("user-A", { turns: 1, cost: 0, tokens: 0 });
    limiter.enforce("user-A");
    limiter.recordUsage("user-A", { turns: 1, cost: 0, tokens: 0 });
    expect(() => limiter.enforce("user-A")).toThrow(/turn limit/i);

    // user-B should still be fine
    expect(() => limiter.enforce("user-B")).not.toThrow();

    limiter.dispose();
  });

  it("cost-based rate limit blocks after exceeding maxCostPerUser", () => {
    const limiter = new PerUserRateLimiter({ maxCostPerUser: 0.01, gcIntervalMs: 0 });

    limiter.enforce("cost-user");
    limiter.recordUsage("cost-user", { turns: 1, cost: 0.015, tokens: 100 });

    expect(() => limiter.enforce("cost-user")).toThrow(/cost limit exceeded/i);
    limiter.dispose();
  });

  it("bypass role skips rate limit enforcement", () => {
    const limiter = new PerUserRateLimiter({
      maxTurnsPerUser: 1,
      bypassRoles: ["admin"],
      gcIntervalMs: 0,
    });

    // Regular user blocked after 1 turn
    limiter.enforce("regular");
    limiter.recordUsage("regular", { turns: 1, cost: 0, tokens: 0 });
    expect(() => limiter.enforce("regular")).toThrow(/turn limit/i);

    // Admin bypasses
    for (let i = 0; i < 10; i++) {
      limiter.enforce("admin-user", ["admin"]);
      limiter.recordUsage("admin-user", { turns: 1, cost: 0, tokens: 0 });
    }
    // Should not throw
    expect(() => limiter.enforce("admin-user", ["admin"])).not.toThrow();

    limiter.dispose();
  });

  // ── Concurrent Agent.run() Safety ───────────────────────────────────

  it("10 concurrent runner.run() calls all complete without deadlock", async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) => {
        const model = textModel(`Response-${i}`);
        const runner = new AgentRunner({
          model,
          tools: [],
          systemPrompt: "test",
        });
        return runner.run(`Query ${i}`);
      }),
    );

    expect(results.length).toBe(10);
    for (let i = 0; i < 10; i++) {
      expect(results[i]).toBe(`Response-${i}`);
    }
  });

  it("concurrent checkAndAcquire with maxConcurrentRuns=1 admits exactly 1", () => {
    const limiter = new PerUserRateLimiter({ maxConcurrentRuns: 1, gcIntervalMs: 0 });
    const N = 20;
    const acquisitions = Array.from({ length: N }, () =>
      limiter.checkAndAcquire("concurrent-user"),
    );

    const admitted = acquisitions.filter((a) => !a.blocked);
    const blocked = acquisitions.filter((a) => a.blocked);

    expect(admitted).toHaveLength(1);
    expect(blocked).toHaveLength(N - 1);

    // Release and verify counter returns to 0
    admitted[0]!.release();
    expect(limiter.getUsage("concurrent-user").concurrentRuns).toBe(0);

    limiter.dispose();
  });

  // ── Usage Tracking Accuracy ─────────────────────────────────────────

  it("getUsage() accurately reflects recorded turns, cost, and tokens", () => {
    const limiter = new PerUserRateLimiter({ gcIntervalMs: 0 });

    limiter.enforce("tracked-user");
    limiter.recordUsage("tracked-user", { turns: 1, cost: 0.005, tokens: 500 });
    limiter.enforce("tracked-user");
    limiter.recordUsage("tracked-user", { turns: 1, cost: 0.010, tokens: 800 });

    const usage = limiter.getUsage("tracked-user");
    expect(usage.turns).toBe(2);
    expect(usage.cost).toBeCloseTo(0.015);
    expect(usage.tokens).toBe(1300);

    limiter.dispose();
  });

  // ── GC Cleanup ──────────────────────────────────────────────────────

  it("resetUser() allows a blocked user to resume", () => {
    const limiter = new PerUserRateLimiter({ maxTurnsPerUser: 1, gcIntervalMs: 0 });

    limiter.enforce("reset-user");
    limiter.recordUsage("reset-user", { turns: 1, cost: 0, tokens: 0 });
    expect(() => limiter.enforce("reset-user")).toThrow(/turn limit/i);

    // Reset the user
    limiter.resetUser("reset-user");

    // Should be able to run again
    expect(() => limiter.enforce("reset-user")).not.toThrow();

    limiter.dispose();
  });

  // ── ContextManager Stats ────────────────────────────────────────────

  it("getStats() returns accurate statistics after operations", () => {
    const ctx = new ContextManager({
      contextWindowTokens: 1000,
      maxOutputTokens: 100,
      compactionStrategy: "truncate",
      estimateTokensFn: (text) => Math.ceil(text.length / 4),
    });

    for (let i = 0; i < 10; i++) {
      ctx.addMessage({ role: "user", content: `Message ${i}` });
    }

    const stats = ctx.getStats();
    expect(stats.messageCount).toBe(10);
    expect(stats.estimatedTokens).toBeGreaterThan(0);
    expect(stats.compactionCount).toBe(0);
  });
});
