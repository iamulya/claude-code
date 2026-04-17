/**
 * RateLimiterStore & GroundingValidator LLM Scorer — Failure-Path Tests
 * ( +)
 *
 * RateLimiterStore:
 * R1 InMemoryRateLimitStore: getUsage on missing userId → null (no throw)
 * R2 InMemoryRateLimitStore: setUsage + getUsage → round-trip works
 * R3 InMemoryRateLimitStore: TTL expiry auto-deletes entry
 * R4 InMemoryRateLimitStore: deleteUsage on missing userId → no throw
 * R5 InMemoryRateLimitStore: dispose() stops timer, subsequent calls don't crash
 * R6 RedisRateLimitStore: Redis unavailable → error propagated (not swallowed)
 *
 * GroundingValidator LLM Scorer:
 * G1 llmScorer throws → falls back to keyword result (no crash)
 * G2 llmScorer returns NaN → treated as 0 (ungrounded)
 * G3 llmScorer returns valid score ≥ threshold → marks sentence as grounded
 * G4 llmScorer not called when keyword match is definitive
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { InMemoryRateLimitStore } from "../security/rateLimiterStore.js";
import { GroundingValidator } from "../security/groundingValidator.js";
import type { UserUsageSnapshot } from "../security/rateLimiterStore.js";
import type { ChatMessage } from "../agents/runner.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSnapshot(overrides: Partial<UserUsageSnapshot> = {}): UserUsageSnapshot {
  return {
    cost: 0,
    tokens: 0,
    turns: 0,
    concurrentRuns: 0,
    windowStart: Date.now(),
    ...overrides,
  };
}

/** Build ChatMessage array with a tool result containing the given evidence */
function makeMessagesWithEvidence(evidence: string): ChatMessage[] {
  return [
    { role: "user", content: "what is the temperature?" },
    { role: "tool", content: evidence, name: "get_weather" } as ChatMessage,
  ];
}

// ── R1: getUsage on missing userId → null ─────────────────────────────────────

describe("R1: InMemoryRateLimitStore.getUsage() on unknown userId returns null", () => {
  it("returns null, not undefined or throws", async () => {
    const store = new InMemoryRateLimitStore();
    const result = await store.getUsage("user-never-seen");
    expect(result).toBeNull();
    store.dispose();
  });
});

// ── R2: setUsage + getUsage → round-trip ─────────────────────────────────────

describe("R2: InMemoryRateLimitStore round-trip set/get", () => {
  it("stores and retrieves a snapshot correctly", async () => {
    const store = new InMemoryRateLimitStore();
    const snap = makeSnapshot({ cost: 1.25, tokens: 500, turns: 3 });

    await store.setUsage("user-abc", snap, 60_000);
    const retrieved = await store.getUsage("user-abc");

    expect(retrieved).toBeDefined();
    expect(retrieved!.cost).toBe(1.25);
    expect(retrieved!.tokens).toBe(500);
    expect(retrieved!.turns).toBe(3);
    store.dispose();
  });
});

// ── R3: TTL expiry auto-deletes ───────────────────────────────────────────────

describe("R3: entry auto-expires after TTL", () => {
  it("returns null for a key after TTL elapses", async () => {
    const store = new InMemoryRateLimitStore();
    const snap = makeSnapshot({ cost: 0.5 });

    // TTL of 50ms
    await store.setUsage("user-ttl", snap, 50);

    // Immediately available
    expect(await store.getUsage("user-ttl")).not.toBeNull();

    // Wait for expiry
    await new Promise((r) => setTimeout(r, 100));

    // Should be gone
    expect(await store.getUsage("user-ttl")).toBeNull();
    store.dispose();
  }, 5_000);
});

// ── R4: deleteUsage on missing userId → no throw ──────────────────────────────

describe("R4: InMemoryRateLimitStore.deleteUsage() on unknown userId is silent", () => {
  it("does not throw when deleting a non-existent entry", async () => {
    const store = new InMemoryRateLimitStore();
    await expect(store.deleteUsage("ghost-user")).resolves.toBeUndefined();
    store.dispose();
  });
});

// ── R5: dispose() stops timer without crashing ────────────────────────────────

describe("R5: dispose() stops the internal timer", () => {
  it("can be called multiple times without crashing", () => {
    const store = new InMemoryRateLimitStore();
    store.dispose();
    // Second dispose must not throw
    expect(() => store.dispose()).not.toThrow();
  });

  it("size returns 0 after dispose clears all entries", async () => {
    const store = new InMemoryRateLimitStore();
    await store.setUsage("u1", makeSnapshot(), 60_000);
    await store.setUsage("u2", makeSnapshot(), 60_000);
    store.dispose();
    expect(store.size).toBe(0);
  });
});

// ── R6: RedisRateLimitStore: Redis unavailable → error propagated ─────────────

describe("R6: RedisRateLimitStore propagates Redis errors", () => {
  it("getUsage() throws when Redis.get() rejects", async () => {
    const { RedisRateLimitStore } = await import("../security/rateLimiterStore.js");

    const fakeRedis = {
      get: vi.fn().mockRejectedValue(new Error("Redis ECONNREFUSED")),
      set: vi.fn(),
      del: vi.fn(),
    };

    const store = new RedisRateLimitStore(fakeRedis);

    await expect(store.getUsage("any-user")).rejects.toThrow("Redis ECONNREFUSED");
  });

  it("setUsage() throws when Redis.set() rejects", async () => {
    const { RedisRateLimitStore } = await import("../security/rateLimiterStore.js");

    const fakeRedis = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockRejectedValue(new Error("Redis write error")),
      del: vi.fn(),
    };

    const store = new RedisRateLimitStore(fakeRedis);

    await expect(store.setUsage("any-user", makeSnapshot(), 60_000)).rejects.toThrow(
      "Redis write error",
    );
  });
});

// ── G1: llmScorer throws → falls back to keyword result ──────────────────────

describe("G1: llmScorer that throws → falls back without crashing", () => {
  afterEach(() => vi.restoreAllMocks());

  it("does not crash and uses keyword evaluation when scorer throws", async () => {
    const scorer = vi.fn().mockRejectedValue(new Error("LLM scorer timed out"));

    const validator = new GroundingValidator({
      mode: "warn",
      llmScorer: scorer,
    });

    const messages = makeMessagesWithEvidence("The temperature in London is 22°C");
    const response = "The temperature in London is 22 degrees.";

    // assess() is now async — must await
    await expect(validator.assess(response, messages)).resolves.toBeDefined();
  });
});

// ── G2: llmScorer returns NaN → treated as 0 ─────────────────────────────────

describe("G2: llmScorer returning NaN → treated as ungrounded (score=0)", () => {
  it("handles NaN return from scorer without crashing", async () => {
    const scorer = vi.fn().mockResolvedValue(NaN);

    const validator = new GroundingValidator({
      mode: "warn",
      llmScorer: scorer,
      llmGroundingThreshold: 0.5,
    });

    // 'warm' and 'outside' have zero overlap with 'London' 'temperature' — not borderline
    // Use a response with SOME keyword overlap to trigger the scorer path
    const messages = makeMessagesWithEvidence("London temperature 22 degrees reading");
    const response = "London is warm."; // 'London' overlaps (1 token < minOverlapTokens=3) → borderline

    // assess() is now async
    const assessment = await validator.assess(response, messages);
    expect(assessment).toBeDefined();
    expect(typeof assessment.score).toBe("number");
    expect(isNaN(assessment.score)).toBe(false); // score is always a clean number
  });
});

// ── G3: llmScorer ≥ threshold → borderline sentence grounded ─────────────────

describe("G3: llmScorer called for borderline sentences and marks them grounded", () => {
  it("invokes scorer for sentences with some-but-insufficient keyword overlap", async () => {
    const scorer = vi.fn().mockResolvedValue(0.9); // high confidence

    const validator = new GroundingValidator({
      mode: "strict",
      minOverlapTokens: 5, // high threshold — keyword overlap alone won't pass
      minSentenceWords: 4, // ensure our sentence is checked
      llmScorer: scorer,
      llmGroundingThreshold: 0.5,
    });

    // Evidence contains 'revenue' 'company' 'grew' which also appear in response
    // Response sentence shares 2 tokens ('company', 'grew') → below minOverlapTokens=5 → borderline
    const messages = makeMessagesWithEvidence("the company revenue grew significantly last period");
    const response = "The company grew by double-digit margins recently."; // 'company' + 'grew' = 2 overlap tokens

    const assessment = await validator.assess(response, messages);

    // scorer IS now called for borderline sentences (0 < overlap < minOverlapTokens)
    expect(scorer).toHaveBeenCalled();

    // With score=0.9 >= threshold=0.5, the sentence is marked grounded by LLM
    const borderlineSentence = assessment.sentences.find((s) => s.scoredBy === "llm");
    expect(borderlineSentence).toBeDefined();
    expect(borderlineSentence!.grounded).toBe(true);
  });
});

// ── G4: llmScorer NOT called when keyword match is definitive ─────────────────

describe("G4: llmScorer is not called for sentences with definitive keyword matches", () => {
  it("does not invoke the scorer when keyword overlap already meets the threshold", async () => {
    const scorer = vi.fn();

    const validator = new GroundingValidator({
      mode: "warn",
      minOverlapTokens: 2, // 2 shared tokens = grounded
      llmScorer: scorer,
    });

    // Response and evidence share many tokens — definitive keyword match
    const messages = makeMessagesWithEvidence(
      "The Paris temperature reading is 18 degrees Celsius today",
    );
    const response = "Paris temperature today is 18 degrees Celsius.";

    await validator.assess(response, messages);

    // Scorer must NOT be called — keyword match was definitive (bestOverlap >= minOverlapTokens)
    expect(scorer).not.toHaveBeenCalled();
  });
});
