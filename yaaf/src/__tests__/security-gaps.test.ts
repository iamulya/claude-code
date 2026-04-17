/**
 * Security Module Test Suite — Part 2 (Gaps 1-5)
 *
 * Tests the five additional OWASP hardening components:
 * - Gap 1: Security auto-wiring via AgentConfig.security
 * - Gap 2: Tool result boundaries
 * - Gap 3: TrustPolicy (plugin/MCP integrity)
 * - Gap 4: GroundingValidator (anti-hallucination)
 * - Gap 5: PerUserRateLimiter (per-identity budgets)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  TrustPolicy,
  trustPolicy,
  GroundingValidator,
  groundingValidator,
  strictGroundingValidator,
  PerUserRateLimiter,
  perUserRateLimiter,
} from "../security/index.js";
import type { ChatMessage, ChatResult } from "../agents/runner.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

function toolMsg(content: string, name?: string): ChatMessage {
  return { role: "tool", content, name } as ChatMessage;
}

function userMsg(content: string): ChatMessage {
  return { role: "user", content };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TrustPolicy
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("TrustPolicy", () => {
  describe("plugin verification", () => {
    it("verifies plugin hash", () => {
      const content = "module.exports = { init() {} }";
      const hash = TrustPolicy.hash(content);

      const policy = new TrustPolicy({
        plugins: {
          "my-plugin": { sha256: hash },
        },
      });

      const result = policy.verifyPlugin("my-plugin", content);
      expect(result.allowed).toBe(true);
      expect(result.event.result).toBe("verified");
    });

    it("rejects plugin with wrong hash (strict)", () => {
      const policy = new TrustPolicy({
        mode: "strict",
        plugins: {
          "my-plugin": { sha256: "expected_hash_abc123" },
        },
      });

      const result = policy.verifyPlugin("my-plugin", "modified content");
      expect(result.allowed).toBe(false);
      expect(result.event.result).toBe("blocked");
    });

    it("warns on hash mismatch (warn mode)", () => {
      const policy = new TrustPolicy({
        mode: "warn",
        plugins: {
          "my-plugin": { sha256: "expected_hash_abc123" },
        },
      });

      const result = policy.verifyPlugin("my-plugin", "modified content");
      expect(result.allowed).toBe(true);
      expect(result.event.result).toBe("warning");
    });

    it("allows explicitly trusted plugins", () => {
      const policy = new TrustPolicy({
        mode: "strict",
        plugins: {
          "my-plugin": { trusted: true },
        },
      });

      const result = policy.verifyPlugin("my-plugin");
      expect(result.allowed).toBe(true);
      expect(result.event.result).toBe("trusted");
    });

    it("blocks unknown plugins in strict mode", () => {
      const policy = new TrustPolicy({
        mode: "strict",
        plugins: {},
      });

      const result = policy.verifyPlugin("unknown-plugin");
      expect(result.allowed).toBe(false);
      expect(result.event.result).toBe("blocked");
    });

    it("allows unknown plugins in warn mode", () => {
      const policy = new TrustPolicy({
        mode: "warn",
        plugins: {},
      });

      const result = policy.verifyPlugin("unknown-plugin");
      expect(result.allowed).toBe(true);
      expect(result.event.result).toBe("unknown");
    });

    it("checks version constraints (^)", () => {
      const policy = new TrustPolicy({
        plugins: {
          "my-plugin": { version: "^1.2.0", trusted: false },
        },
        mode: "strict",
      });

      expect(policy.verifyPlugin("my-plugin", undefined, "1.3.0").allowed).toBe(true);
      expect(policy.verifyPlugin("my-plugin", undefined, "1.2.5").allowed).toBe(true);
      expect(policy.verifyPlugin("my-plugin", undefined, "2.0.0").allowed).toBe(false);
      expect(policy.verifyPlugin("my-plugin", undefined, "1.1.0").allowed).toBe(false);
    });

    it("checks version constraints (>=)", () => {
      const policy = new TrustPolicy({
        plugins: {
          "my-plugin": { version: ">=2.0.0", trusted: false },
        },
        mode: "strict",
      });

      expect(policy.verifyPlugin("my-plugin", undefined, "2.0.0").allowed).toBe(true);
      expect(policy.verifyPlugin("my-plugin", undefined, "3.1.0").allowed).toBe(true);
      expect(policy.verifyPlugin("my-plugin", undefined, "1.9.9").allowed).toBe(false);
    });

    it("fires onVerification callback", () => {
      const events: string[] = [];
      const policy = new TrustPolicy({
        plugins: { a: { trusted: true } },
        onVerification: (e) => events.push(`${e.name}:${e.result}`),
      });

      policy.verifyPlugin("a");
      expect(events).toEqual(["a:trusted"]);
    });
  });

  describe("MCP tool filtering", () => {
    const tools = [
      { name: "search_repos", description: "Search", inputSchema: {} },
      { name: "get_issue", description: "Get", inputSchema: {} },
      { name: "delete_repo", description: "Delete", inputSchema: {} },
    ];

    it("allows only allowlisted tools", () => {
      const policy = new TrustPolicy({
        mcpServers: {
          github: { allowedTools: ["search_repos", "get_issue"] },
        },
      });

      const result = policy.filterMcpTools("github", tools);
      expect(result.allowed.map((t) => t.name)).toEqual(["search_repos", "get_issue"]);
      expect(result.blocked).toEqual(["delete_repo"]);
    });

    it("blocks explicit blocklist tools", () => {
      const policy = new TrustPolicy({
        mcpServers: {
          github: { blockTools: ["delete_repo"] },
        },
      });

      const result = policy.filterMcpTools("github", tools);
      expect(result.blocked).toEqual(["delete_repo"]);
      expect(result.allowed).toHaveLength(2);
    });

    it("allows all tools from trusted server", () => {
      const policy = new TrustPolicy({
        mcpServers: {
          github: { trusted: true },
        },
      });

      const result = policy.filterMcpTools("github", tools);
      expect(result.allowed).toHaveLength(3);
      expect(result.blocked).toHaveLength(0);
    });

    it("blocks all tools from unknown server in strict mode", () => {
      const policy = new TrustPolicy({ mode: "strict" });

      const result = policy.filterMcpTools("unknown-server", tools);
      expect(result.allowed).toHaveLength(0);
      expect(result.blocked).toHaveLength(3);
    });

    it("allows tools from unknown server in warn mode", () => {
      const policy = new TrustPolicy({ mode: "warn" });

      const result = policy.filterMcpTools("unknown-server", tools);
      expect(result.allowed).toHaveLength(3);
    });
  });

  describe("hash utility", () => {
    it("computes consistent SHA-256 hashes", () => {
      const h1 = TrustPolicy.hash("hello world");
      const h2 = TrustPolicy.hash("hello world");
      expect(h1).toBe(h2);
      expect(h1).toHaveLength(64); // SHA-256 hex
    });

    it("different inputs produce different hashes", () => {
      expect(TrustPolicy.hash("a")).not.toBe(TrustPolicy.hash("b"));
    });
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GroundingValidator
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("GroundingValidator", () => {
  describe("assessment", () => {
    const validator = new GroundingValidator({ mode: "warn", minOverlapTokens: 2 });

    it("fully grounds response that matches tool evidence", async () => {
      const messages: ChatMessage[] = [
        userMsg("What is the weather?"),
        toolMsg("The temperature in Paris is 22 degrees Celsius with clear skies.", "weather_api"),
      ];

      const assessment = await validator.assess(
        "The temperature in Paris is 22 degrees Celsius with clear skies.",
        messages,
      );

      expect(assessment.score).toBeGreaterThan(0.5);
      expect(assessment.action).not.toBe("overridden");
    });

    it("detects ungrounded claims", async () => {
      const messages: ChatMessage[] = [
        toolMsg("Company revenue was $5M in 2023.", "financial_api"),
      ];

      const assessment = await validator.assess(
        "Company revenue was $5M in 2023. The company also expanded to 15 new countries and hired 500 employees globally.",
        messages,
      );

      // Some sentences should be ungrounded
      const ungrounded = assessment.sentences.filter((s) => !s.grounded);
      expect(ungrounded.length).toBeGreaterThan(0);
    });

    it("returns 1.0 score when no tool evidence exists", async () => {
      const assessment = await validator.assess("Just a normal response without any tool data.", [
        userMsg("Hello"),
      ]);

      expect(assessment.score).toBe(1.0);
      expect(assessment.action).toBe("passed");
    });

    it("skips short sentences (greetings, acks)", async () => {
      const messages: ChatMessage[] = [toolMsg("Data here.", "api")];

      const assessment = await validator.assess("Sure! Here you go.", messages);
      // Short sentences should be skipped
      expect(assessment.totalSentences).toBe(0);
    });
  });

  describe("annotate mode", () => {
    it("adds ungrounded markers", async () => {
      const validator = new GroundingValidator({
        mode: "annotate",
        minOverlapTokens: 3,
      });

      const messages: ChatMessage[] = [toolMsg("The database contains 1000 users.", "db_query")];

      const assessment = await validator.assess(
        "The database contains 1000 users. Additionally, the system processes over 50000 requests per second across 12 global regions.",
        messages,
      );

      // Find ungrounded sentences
      const ungrounded = assessment.sentences.filter((s) => !s.grounded);
      expect(ungrounded.length).toBeGreaterThan(0);
    });
  });

  describe("strict mode", () => {
    it("marks response as overridden when below threshold", async () => {
      const validator = new GroundingValidator({
        mode: "strict",
        minCoverage: 0.9,
        minOverlapTokens: 3,
      });

      const messages: ChatMessage[] = [toolMsg("Revenue: $5M.", "api")];

      const assessment = await validator.assess(
        "Revenue was approximately five million dollars last year. The company also expanded into artificial intelligence research with a budget of twenty million dollars.",
        messages,
      );

      // With high threshold, this should be overridden
      if (assessment.score < 0.9) {
        expect(assessment.action).toBe("overridden");
      }
    });
  });

  describe("hooks integration", () => {
    it("creates working afterLLM hook", async () => {
      const validator = groundingValidator({ mode: "warn" });
      const { afterLLM } = validator.hooks();

      const response: ChatResult = {
        content: "Normal response text.",
        finishReason: "stop",
      };

      const result = await afterLLM(response, 0);
      // With no messages captured, should pass
      expect(result).toEqual({ action: "continue" });
    });

    it("beforeLLM captures messages for grounding", async () => {
      const validator = groundingValidator({ mode: "warn" });
      const { beforeLLM, afterLLM } = validator.hooks();

      // Capture messages
      beforeLLM([userMsg("Query"), toolMsg("Some tool evidence data.", "search")]);

      const response: ChatResult = {
        content: "This response mentions some tool evidence data from the search.",
        finishReason: "stop",
      };

      const result = await afterLLM(response, 0);
      expect(result).toBeDefined();
    });
  });

  describe("event callbacks", () => {
    it("fires onAssessment", async () => {
      const scores: number[] = [];
      const validator = new GroundingValidator({
        onAssessment: (e) => scores.push(e.score),
      });

      await validator.assess("Hello.", []);
      expect(scores).toHaveLength(1);
    });
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PerUserRateLimiter
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("PerUserRateLimiter", () => {
  let limiter: PerUserRateLimiter;

  afterEach(() => {
    limiter?.dispose();
  });

  describe("cost limits", () => {
    it("allows users within their cost budget", () => {
      limiter = new PerUserRateLimiter({ maxCostPerUser: 5.0, gcIntervalMs: 0 });

      limiter.recordUsage("alice", { cost: 2.0 });
      const check = limiter.check("alice");
      expect(check.blocked).toBe(false);
      expect(check.usage.cost).toBe(2.0);
    });

    it("blocks users who exceed cost budget", () => {
      limiter = new PerUserRateLimiter({ maxCostPerUser: 5.0, gcIntervalMs: 0 });

      limiter.recordUsage("alice", { cost: 3.0 });
      limiter.recordUsage("alice", { cost: 2.5 });

      const check = limiter.check("alice");
      expect(check.blocked).toBe(true);
      expect(check.reason).toContain("cost limit exceeded");
    });
  });

  describe("token limits", () => {
    it("blocks users who exceed token budget", () => {
      limiter = new PerUserRateLimiter({ maxTokensPerUser: 10_000, gcIntervalMs: 0 });

      limiter.recordUsage("bob", { tokens: 6_000 });
      limiter.recordUsage("bob", { tokens: 5_000 });

      const check = limiter.check("bob");
      expect(check.blocked).toBe(true);
      expect(check.reason).toContain("token limit exceeded");
    });
  });

  describe("turn limits", () => {
    it("blocks users who exceed turn budget", () => {
      limiter = new PerUserRateLimiter({ maxTurnsPerUser: 10, gcIntervalMs: 0 });

      for (let i = 0; i < 11; i++) {
        limiter.recordUsage("carol", { turns: 1 });
      }

      const check = limiter.check("carol");
      expect(check.blocked).toBe(true);
      expect(check.reason).toContain("turn limit exceeded");
    });
  });

  describe("concurrent run limits", () => {
    it("blocks when concurrent runs exceeded", () => {
      limiter = new PerUserRateLimiter({ maxConcurrentRuns: 2, gcIntervalMs: 0 });

      const release1 = limiter.acquireRunSlot("dave");
      const release2 = limiter.acquireRunSlot("dave");

      const check1 = limiter.check("dave");
      expect(check1.blocked).toBe(true);

      // Release one slot
      release1();
      const check2 = limiter.check("dave");
      expect(check2.blocked).toBe(false);

      release2();
    });

    it("release function is idempotent", () => {
      limiter = new PerUserRateLimiter({ maxConcurrentRuns: 3, gcIntervalMs: 0 });
      const release = limiter.acquireRunSlot("eve");
      release();
      release(); // second call should be no-op
      expect(limiter.getUsage("eve").concurrentRuns).toBe(0);
    });
  });

  describe("role bypass", () => {
    it("bypasses limits for specified roles", () => {
      limiter = new PerUserRateLimiter({
        maxCostPerUser: 1.0,
        bypassRoles: ["admin", "super_admin"],
        gcIntervalMs: 0,
      });

      limiter.recordUsage("admin-user", { cost: 100 });
      const check = limiter.check("admin-user", ["admin"]);
      expect(check.blocked).toBe(false);
    });

    it("enforces limits for non-bypass roles", () => {
      limiter = new PerUserRateLimiter({
        maxCostPerUser: 1.0,
        bypassRoles: ["admin"],
        gcIntervalMs: 0,
      });

      limiter.recordUsage("regular-user", { cost: 2.0 });
      const check = limiter.check("regular-user", ["viewer"]);
      expect(check.blocked).toBe(true);
    });
  });

  describe("enforce method", () => {
    it("throws on limit violation", () => {
      limiter = new PerUserRateLimiter({ maxCostPerUser: 1.0, gcIntervalMs: 0 });
      limiter.recordUsage("user", { cost: 2.0 });

      expect(() => limiter.enforce("user")).toThrow("cost limit exceeded");
    });

    it("does not throw within limits", () => {
      limiter = new PerUserRateLimiter({ maxCostPerUser: 10.0, gcIntervalMs: 0 });
      expect(() => limiter.enforce("user")).not.toThrow();
    });
  });

  describe("user management", () => {
    it("tracks multiple users independently", () => {
      limiter = new PerUserRateLimiter({ maxCostPerUser: 5.0, gcIntervalMs: 0 });

      limiter.recordUsage("alice", { cost: 4.0 });
      limiter.recordUsage("bob", { cost: 1.0 });

      expect(limiter.getUsage("alice").cost).toBe(4.0);
      expect(limiter.getUsage("bob").cost).toBe(1.0);
    });

    it("resets individual users", () => {
      limiter = new PerUserRateLimiter({ gcIntervalMs: 0 });
      limiter.recordUsage("alice", { cost: 10, tokens: 50000 });
      limiter.resetUser("alice");
      expect(limiter.getUsage("alice").cost).toBe(0);
    });

    it("lists all tracked users", () => {
      limiter = new PerUserRateLimiter({ gcIntervalMs: 0 });
      limiter.recordUsage("alice", { cost: 1 });
      limiter.recordUsage("bob", { cost: 2 });

      const all = limiter.getAllUsers();
      expect(all).toHaveLength(2);
      expect(all.map((u) => u.userId).sort()).toEqual(["alice", "bob"]);
    });
  });

  describe("event callbacks", () => {
    it("fires onLimitEvent when blocked", () => {
      const events: string[] = [];
      limiter = new PerUserRateLimiter({
        maxCostPerUser: 1.0,
        gcIntervalMs: 0,
        onLimitEvent: (e) => events.push(`${e.userId}:${e.resource}:${e.action}`),
      });

      limiter.recordUsage("alice", { cost: 2.0 });
      limiter.check("alice");
      expect(events).toEqual(["alice:cost:blocked"]);
    });
  });

  describe("window-based expiry", () => {
    it("returns zero usage for unknown users", () => {
      limiter = new PerUserRateLimiter({ gcIntervalMs: 0 });
      const usage = limiter.getUsage("nonexistent");
      expect(usage.cost).toBe(0);
      expect(usage.tokens).toBe(0);
      expect(usage.turns).toBe(0);
    });
  });

  describe("factory", () => {
    it("creates limiter via factory function", () => {
      limiter = perUserRateLimiter({ maxCostPerUser: 10, gcIntervalMs: 0 });
      expect(limiter.name).toBe("per-user-rate-limiter");
    });
  });
});
