/**
 * API Surface Contract Tests — Gap 4 fix
 *
 * These tests fail if any exported public symbol is renamed, removed, or has
 * its required configuration shape changed. They act as a semver guard:
 * a breaking change in the public API will fail here before it reaches users.
 *
 * Convention:
 * - Each describe block corresponds to one public module export.
 * - Tests verify: symbol exists, is callable/constructable, and its config
 * type accepts the documented options without TypeScript errors.
 * - Tests do NOT test behavior — that lives in the subsystem test suites.
 *
 * If you need to make a breaking change:
 * 1. Update the affected test here.
 * 2. Bump the major version in package.json.
 * 3. Add a BREAKING CHANGES entry to CHANGELOG.md.
 */

import { describe, it, expect } from "vitest";

// ── Security module ───────────────────────────────────────────────────────────

import {
  PromptGuard,
  promptGuard,
  strictPromptGuard,
  GroundingValidator,
  groundingValidator,
  strictGroundingValidator,
  TrustPolicy,
  trustPolicy,
  PerUserRateLimiter,
  perUserRateLimiter,
  OutputSanitizer,
  outputSanitizer,
  strictSanitizer,
  PiiRedactor,
  piiRedactor,
  strictPiiRedactor,
  SecurityAuditLog,
  InputAnomalyDetector,
} from "../security/index.js";

describe("Public API: security/index", () => {
  it("PromptGuard: constructor + factory functions exported", () => {
    expect(typeof PromptGuard).toBe("function");
    expect(typeof promptGuard).toBe("function");
    expect(typeof strictPromptGuard).toBe("function");
    const g = new PromptGuard();
    expect(g.name).toBe("prompt-guard");
  });

  it("PromptGuard: all documented config keys accepted", () => {
    // If any required field is added/removed, TS compilation fails this
    const _config: ConstructorParameters<typeof PromptGuard>[0] = {
      mode: "block",
      sensitivity: "high",
      canaryToken: "test-canary",
      customPatterns: [{ name: "custom", pattern: /test/, severity: "low" }],
      onDetection: () => {},
      blockMessage: "[blocked]",
    };
    expect(true).toBe(true); // type-level check
  });

  it("GroundingValidator: constructor + factory functions exported", () => {
    expect(typeof GroundingValidator).toBe("function");
    expect(typeof groundingValidator).toBe("function");
    expect(typeof strictGroundingValidator).toBe("function");
    const v = new GroundingValidator();
    expect(v.name).toBe("grounding-validator");
  });

  it("GroundingValidator: config keys include minOverlapTokens, llmScorer, scoredBy tracking", () => {
    const _config: ConstructorParameters<typeof GroundingValidator>[0] = {
      mode: "strict",
      minCoverage: 0.8,
      minOverlapTokens: 3,
      minSentenceWords: 5,
      llmScorer: async () => 0.9,
      llmGroundingThreshold: 0.7,
      onAssessment: () => {},
    };
    expect(true).toBe(true);
  });

  it("TrustPolicy: constructor + factory exported", () => {
    expect(typeof TrustPolicy).toBe("function");
    expect(typeof trustPolicy).toBe("function");
    const p = new TrustPolicy();
    expect(typeof p.verifyPlugin).toBe("function");
    expect(typeof p.filterMcpTools).toBe("function");
    expect(typeof TrustPolicy.hash).toBe("function");
  });

  it("PerUserRateLimiter: constructor + factory exported", () => {
    expect(typeof PerUserRateLimiter).toBe("function");
    expect(typeof perUserRateLimiter).toBe("function");
    const l = new PerUserRateLimiter({ gcIntervalMs: 0 });
    expect(l.name).toBe("per-user-rate-limiter");
    // Verify checkAndAcquire (atomic API) is exported
    expect(typeof l.checkAndAcquire).toBe("function");
    l.dispose();
  });

  it("OutputSanitizer: constructor + factories exported", () => {
    expect(typeof OutputSanitizer).toBe("function");
    expect(typeof outputSanitizer).toBe("function");
    expect(typeof strictSanitizer).toBe("function");
    const s = new OutputSanitizer();
    expect(s.name).toBe("output-sanitizer");
    expect(typeof s.sanitize).toBe("function");
    expect(typeof s.hook).toBe("function");
  });

  it("PiiRedactor: constructor + factories exported", () => {
    expect(typeof PiiRedactor).toBe("function");
    expect(typeof piiRedactor).toBe("function");
    expect(typeof strictPiiRedactor).toBe("function");
    const r = new PiiRedactor();
    expect(r.name).toBe("pii-redactor");
    expect(typeof r.scan).toBe("function");
    expect(typeof r.beforeHook).toBe("function");
    expect(typeof r.afterHook).toBe("function");
  });

  it("SecurityAuditLog: constructor with all hardened config keys", () => {
    expect(typeof SecurityAuditLog).toBe("function");
    const _config: ConstructorParameters<typeof SecurityAuditLog>[0] = {
      maxEntries: 1000,
      onEntry: () => {},
      minSeverity: "warning",
      sessionId: "sess-1",
      onSinkError: () => {}, // A1 fix — must be present
      maxQueueDepth: 500, // A2 fix — must be present
      filePath: "/tmp/audit.ndjson", // A3 fix — must be present
    };
    expect(true).toBe(true);
  });

  it("InputAnomalyDetector: exported", () => {
    expect(typeof InputAnomalyDetector).toBe("function");
  });
});

// ── Integrations module ───────────────────────────────────────────────────────

import { InProcessIPCPlugin } from "../integrations/inProcessIPC.js";
import type { InProcessIPCConfig } from "../integrations/inProcessIPC.js";
import { McpPlugin } from "../integrations/mcp.js";

describe("Public API: integrations", () => {
  it("InProcessIPCPlugin: constructor exported with hardened config", () => {
    expect(typeof InProcessIPCPlugin).toBe("function");
    const _config: InProcessIPCConfig = {
      maxInboxSize: 100, // I1 fix
      fullPolicy: "drop-oldest", // I1 fix
      onEvent: () => {}, // I2 fix
    };
    const ipc = new InProcessIPCPlugin(_config);
    expect(typeof ipc.send).toBe("function");
    expect(typeof ipc.subscribe).toBe("function");
    expect(typeof ipc.readUnread).toBe("function");
    expect(typeof ipc.listDeadLetters).toBe("function");
  });

  it("InProcessIPCPlugin.subscribe: options include allowedSenders", () => {
    const ipc = new InProcessIPCPlugin();
    // allowedSenders: I3 fix — must be in subscribe() signature
    const unsub = ipc.subscribe("test", () => {}, { allowedSenders: ["trusted-agent"] });
    expect(typeof unsub).toBe("function");
    unsub();
  });

  it("McpPlugin: constructor exported with hardened config", () => {
    expect(typeof McpPlugin).toBe("function");
    const plugin = new McpPlugin({
      servers: [],
      connectTimeoutMs: 5000, // M1 fix
      maxConnectFailures: 3, // M1 fix
    });
    expect(typeof plugin.initialize).toBe("function");
    expect(typeof plugin.resetCircuit).toBe("function"); // M1 fix
  });
});

// ── Memory module ─────────────────────────────────────────────────────────────

import { VectorMemoryPlugin } from "../memory/vectorMemory.js";
import type { VectorMemoryConfig } from "../memory/vectorMemory.js";

describe("Public API: memory/vectorMemory", () => {
  it("VectorMemoryPlugin: constructor exported with hardened config", () => {
    expect(typeof VectorMemoryPlugin).toBe("function");
    const _config: VectorMemoryConfig = {
      maxDocuments: 1000, // V1 fix
      persistTo: undefined, // V2 fix
      onSearch: () => {}, // V3 fix
    };
    const v = new VectorMemoryPlugin(_config);
    expect(typeof v.upsert).toBe("function");
    expect(typeof v.search).toBe("function");
    expect(typeof v.initialize).toBe("function"); // V2 fix
    expect(typeof v.size).toBe("function");
  });

  it("VectorSearchResult: has id and score fields", async () => {
    const v = new VectorMemoryPlugin();
    await v.upsert("test", "hello world testing", {});
    const results = await v.search("hello world", 1);
    if (results.length > 0) {
      expect(typeof results[0]!.id).toBe("string");
      expect(typeof results[0]!.score).toBe("number");
    }
  });
});

// ── IAM module ────────────────────────────────────────────────────────────────

import { JwtIdentityProvider } from "../iam/providers.js";
import { InMemoryJtiBlocklist } from "../iam/jtiBlocklist.js";
import { RoleStrategy, AttributeStrategy } from "../iam/authorization.js";

describe("Public API: iam", () => {
  it("JwtIdentityProvider: constructor exported", () => {
    expect(typeof JwtIdentityProvider).toBe("function");
  });

  it("InMemoryJtiBlocklist: constructor exported with ttlMs", () => {
    expect(typeof InMemoryJtiBlocklist).toBe("function");
    const bl = new InMemoryJtiBlocklist(60_000);
    expect(typeof bl.add).toBe("function");
    expect(typeof bl.has).toBe("function");
    expect(typeof bl.dispose).toBe("function");
    bl.dispose();
  });

  it("RoleStrategy and AttributeStrategy: authorization strategies exported", () => {
    expect(typeof RoleStrategy).toBe("function");
    expect(typeof AttributeStrategy).toBe("function");
    const r = new RoleStrategy({ roles: {} });
    expect(typeof r.evaluate).toBe("function");
  });
});

// ── Sandbox ───────────────────────────────────────────────────────────────────

import {
  Sandbox,
  SandboxError,
  timeoutSandbox,
  strictSandbox,
  projectSandbox,
} from "../sandbox.js";

describe("Public API: sandbox", () => {
  it("Sandbox: constructor + factory functions exported", () => {
    expect(typeof Sandbox).toBe("function");
    expect(typeof SandboxError).toBe("function");
    expect(typeof timeoutSandbox).toBe("function");
    expect(typeof strictSandbox).toBe("function");
    expect(typeof projectSandbox).toBe("function");
  });

  it("Sandbox config includes sandboxFetch and pathValidator (C1/C2 fixes)", () => {
    const _config: ConstructorParameters<typeof Sandbox>[0] = {
      timeoutMs: 5000,
      allowedPaths: ["/tmp"],
      blockedPaths: [],
      blockNetwork: true,
      sandboxFetch: async () => new Response("blocked"),
      pathValidator: () => true,
      onViolation: () => {},
      debug: false,
    };
    expect(true).toBe(true);
  });
});

// ── AgentRunner ───────────────────────────────────────────────────────────────

import { AgentRunner } from "../agents/runner.js";
import type { AgentRunnerConfig } from "../agents/runner.js";

describe("Public API: agents/runner", () => {
  it("AgentRunner: constructor shape matches documented config", () => {
    const fakeModel = {
      model: "test",
      async complete() {
        return { content: "ok", finishReason: "stop" as const };
      },
    };
    const _config: AgentRunnerConfig = {
      model: fakeModel,
      tools: [],
      systemPrompt: "test",
      maxIterations: 10,
      temperature: 0.1,
      maxTokens: 2048,
      toolResultBoundaries: true,
    };
    expect(true).toBe(true);
  });

  it("AgentRunner: event system (on/off/removeAllListeners) exported", () => {
    expect(typeof AgentRunner).toBe("function");
    const runner = new AgentRunner({
      model: {
        model: "test",
        async complete() {
          return { content: "", finishReason: "stop" };
        },
      },
      tools: [],
      systemPrompt: "test",
    });
    expect(typeof runner.on).toBe("function");
    expect(typeof runner.off).toBe("function");
    expect(typeof runner.removeAllListeners).toBe("function");
  });
});

// ── New gap-closure exports ───────────────────────────────────────────────────

import { DistributedRateLimitBackend, InMemoryRateLimitBackend } from "../security/rateLimiter.js";
import { deprecated } from "../utils/deprecation.js";

describe("Public API: DistributedRateLimitBackend + InMemoryRateLimitBackend", () => {
  it("InMemoryRateLimitBackend is a concrete class that satisfies the interface", () => {
    expect(typeof InMemoryRateLimitBackend).toBe("function");
    const b: DistributedRateLimitBackend = new InMemoryRateLimitBackend();
    expect(typeof b.increment).toBe("function");
    expect(typeof b.get).toBe("function");
    expect(typeof b.reset).toBe("function");
  });

  it("PerUserRateLimiter accepts backend config key without compile error", () => {
    const _config: ConstructorParameters<typeof PerUserRateLimiter>[0] = {
      maxTurnsPerUser: 100,
      backend: new InMemoryRateLimitBackend(),
      gcIntervalMs: 0,
    };
    expect(true).toBe(true);
  });
});

describe("Public API: utils/deprecation", () => {
  it("deprecated() is exported as a function", () => {
    expect(typeof deprecated).toBe("function");
  });

  it("deprecated() accepts all documented parameters", () => {
    const captured: string[] = [];
    // All four parameter forms must be accepted by the type system
    deprecated("symbol A deprecated", "use B", "1.0.0", (w) => captured.push(w.message));
    deprecated("symbol C deprecated", "use D", undefined, (w) => captured.push(w.message));
    deprecated("symbol E deprecated", "use F"); // no removedIn, no onWarn — uses process.emitWarning
    // captured will have 2 (the onWarn variants) since 'E' goes to process.emitWarning
    expect(captured.length).toBeGreaterThanOrEqual(2);
  });
});
