/**
 * Memory Engine tests — Relevance, AutoExtract, TeamMemory
 *
 * These modules select, extract, and manage persistent memories.
 * - relevance.ts: LLM-based selection of relevant memories
 * - autoExtract.ts: Background extraction of durable memories from conversation
 * - teamMemory.ts: Shared memory across agents
 *
 * ⚠️ Previously had ZERO test coverage.
 */

import { describe, it, expect, vi, afterEach } from "vitest";

// ════════════════════════════════════════════════════════════════════════════
// MemoryRelevanceEngine
// ════════════════════════════════════════════════════════════════════════════

import { MemoryRelevanceEngine, type RelevanceQueryFn } from "../memory/relevance.js";
import type { MemoryHeader } from "../memory/memoryStore.js";

function makeHeader(overrides: Partial<MemoryHeader> & { filename: string }): MemoryHeader {
  return {
    filePath: `/memory/${overrides.filename}`,
    name: overrides.name ?? overrides.filename,
    description: overrides.description ?? "",
    type: overrides.type ?? "user",
    mtimeMs: overrides.mtimeMs ?? Date.now(),
    ...overrides,
  };
}

describe("MemoryRelevanceEngine", () => {
  it("calls queryFn and returns matched memories", async () => {
    const queryFn: RelevanceQueryFn = vi.fn(async () =>
      JSON.stringify({ selected_memories: ["prefs.md"] }),
    );
    const engine = new MemoryRelevanceEngine(queryFn);

    const headers = [
      makeHeader({ filename: "prefs.md", description: "User preferences" }),
      makeHeader({ filename: "goals.md", description: "Project goals" }),
    ];

    const result = await engine.findRelevant("Show my preferences", headers);

    expect(queryFn).toHaveBeenCalledOnce();
    expect(result).toHaveLength(1);
    expect(result[0]!.filename).toBe("prefs.md");
  });

  it("limits to 5 results", async () => {
    const queryFn: RelevanceQueryFn = vi.fn(async () =>
      JSON.stringify({
        selected_memories: ["a.md", "b.md", "c.md", "d.md", "e.md", "f.md", "g.md"],
      }),
    );
    const engine = new MemoryRelevanceEngine(queryFn);

    const headers = "abcdefg"
      .split("")
      .map((c) => makeHeader({ filename: `${c}.md`, description: `Memory ${c}` }));

    const result = await engine.findRelevant("all", headers);
    expect(result).toHaveLength(5);
  });

  it("filters out filenames not in candidates", async () => {
    const queryFn: RelevanceQueryFn = vi.fn(async () =>
      JSON.stringify({ selected_memories: ["real.md", "hallucinated.md"] }),
    );
    const engine = new MemoryRelevanceEngine(queryFn);

    const result = await engine.findRelevant("test", [makeHeader({ filename: "real.md" })]);

    expect(result).toHaveLength(1);
    expect(result[0]!.filename).toBe("real.md");
  });

  it("excludes already-surfaced memories", async () => {
    const queryFn: RelevanceQueryFn = vi.fn(async () =>
      JSON.stringify({ selected_memories: ["a.md", "b.md"] }),
    );
    const engine = new MemoryRelevanceEngine(queryFn);

    const headers = [
      makeHeader({ filename: "a.md", filePath: "/memory/a.md" }),
      makeHeader({ filename: "b.md", filePath: "/memory/b.md" }),
    ];

    const result = await engine.findRelevant(
      "test",
      headers,
      undefined,
      [],
      new Set(["/memory/a.md"]),
    );

    // 'a.md' was already surfaced → should be excluded from candidates
    // queryFn will only see 'b.md'
    expect(result.every((r) => r.filename !== "a.md")).toBe(true);
  });

  it("includes recent tools in query message", async () => {
    let passedMessage = "";
    const queryFn: RelevanceQueryFn = vi.fn(async ({ userMessage }) => {
      passedMessage = userMessage;
      return JSON.stringify({ selected_memories: [] });
    });
    const engine = new MemoryRelevanceEngine(queryFn);

    await engine.findRelevant("test", [makeHeader({ filename: "a.md" })], undefined, [
      "search",
      "bash",
    ]);

    expect(passedMessage).toContain("search");
    expect(passedMessage).toContain("bash");
  });

  it("returns empty when no candidates", async () => {
    const queryFn = vi.fn();
    const engine = new MemoryRelevanceEngine(queryFn);
    const result = await engine.findRelevant("test", []);
    expect(result).toEqual([]);
    expect(queryFn).not.toHaveBeenCalled();
  });

  it("returns empty on queryFn error (non-fatal)", async () => {
    const queryFn: RelevanceQueryFn = vi.fn(async () => {
      throw new Error("LLM down");
    });
    const engine = new MemoryRelevanceEngine(queryFn);

    const result = await engine.findRelevant("test", [makeHeader({ filename: "a.md" })]);
    expect(result).toEqual([]);
  });

  it("returns empty on malformed JSON from LLM", async () => {
    const queryFn: RelevanceQueryFn = vi.fn(async () => "not json at all");
    const engine = new MemoryRelevanceEngine(queryFn);

    const result = await engine.findRelevant("test", [makeHeader({ filename: "a.md" })]);
    expect(result).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// AutoMemoryExtractor
// ════════════════════════════════════════════════════════════════════════════

import { AutoMemoryExtractor, type MessageLike } from "../memory/autoExtract.js";

function makeMsgs(n: number, startRole = "user"): MessageLike[] {
  return Array.from({ length: n }, (_, i) => ({
    role: i % 2 === 0 ? "user" : "assistant",
    content: `Message ${i}`,
    id: `msg-${i}`,
  }));
}

/** Creates a mock extraction strategy */
function mockStrategy(shouldExtract = true, extracted = true) {
  return {
    shouldExtract: vi.fn(async () => shouldExtract),
    extract: vi.fn(async () => ({ extracted, memories: [] })),
  };
}

describe("AutoMemoryExtractor", () => {
  it("triggers extraction after turnInterval", () => {
    const strategy = mockStrategy();
    const extractor = new AutoMemoryExtractor({
      extractionStrategy: strategy,
      turnInterval: 2,
      minNewMessages: 1,
    });

    // Turn 1: should NOT trigger (turnInterval=2)
    extractor.onTurnComplete(makeMsgs(4), "query1");
    expect(strategy.shouldExtract).not.toHaveBeenCalled();

    // Turn 2: should trigger
    extractor.onTurnComplete(makeMsgs(6), "query2");
    expect(strategy.shouldExtract).toHaveBeenCalledOnce();
  });

  it("skips when fewer than minNewMessages", () => {
    const strategy = mockStrategy();
    const extractor = new AutoMemoryExtractor({
      extractionStrategy: strategy,
      turnInterval: 1,
      minNewMessages: 5,
    });

    // Only 2 messages (below minNewMessages=5)
    extractor.onTurnComplete(makeMsgs(2), "query");
    expect(strategy.shouldExtract).not.toHaveBeenCalled();
  });

  it("calls onExtracted when memories are found", async () => {
    const onExtracted = vi.fn();
    const strategy = mockStrategy(true, true);
    const extractor = new AutoMemoryExtractor({
      extractionStrategy: strategy,
      turnInterval: 1,
      minNewMessages: 1,
      onExtracted,
    });

    extractor.onTurnComplete(makeMsgs(4), "query");
    await extractor.drain();

    expect(onExtracted).toHaveBeenCalledOnce();
  });

  it("calls onError on extraction failure", async () => {
    const onError = vi.fn();
    const strategy = {
      shouldExtract: vi.fn(async () => true),
      extract: vi.fn(async () => {
        throw new Error("LLM failed");
      }),
    };
    const extractor = new AutoMemoryExtractor({
      extractionStrategy: strategy,
      turnInterval: 1,
      minNewMessages: 1,
      onError,
    });

    extractor.onTurnComplete(makeMsgs(4), "query");
    await extractor.drain();

    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0]![0].message).toBe("LLM failed");
  });

  it("skips when strategy says shouldExtract=false", async () => {
    const strategy = mockStrategy(false);
    const extractor = new AutoMemoryExtractor({
      extractionStrategy: strategy,
      turnInterval: 1,
      minNewMessages: 1,
    });

    extractor.onTurnComplete(makeMsgs(4), "query");
    await extractor.drain();

    expect(strategy.shouldExtract).toHaveBeenCalledOnce();
    expect(strategy.extract).not.toHaveBeenCalled();
  });

  it("forceExtract bypasses throttle", async () => {
    const strategy = mockStrategy();
    const extractor = new AutoMemoryExtractor({
      extractionStrategy: strategy,
      turnInterval: 100, // very high threshold
      minNewMessages: 1,
    });

    await extractor.forceExtract(makeMsgs(4), "force");
    expect(strategy.shouldExtract).toHaveBeenCalledOnce();
  });

  it("queues pending when already in progress", async () => {
    let resolveFirst: () => void;
    const firstPromise = new Promise<void>((r) => {
      resolveFirst = r;
    });

    const calls: string[] = [];
    const strategy = {
      shouldExtract: vi.fn(async () => true),
      extract: vi.fn(async () => {
        if (calls.length === 0) {
          calls.push("first");
          await firstPromise;
        } else {
          calls.push("trailing");
        }
        return { extracted: false, memories: [] };
      }),
    };

    const extractor = new AutoMemoryExtractor({
      extractionStrategy: strategy,
      turnInterval: 1,
      minNewMessages: 1,
    });

    // Start first extraction
    extractor.onTurnComplete(makeMsgs(4), "query1");
    // While in progress, queue another
    extractor.onTurnComplete(makeMsgs(6), "query2");

    // Release first
    resolveFirst!();
    await extractor.drain();

    // Both should have run (first + trailing)
    expect(calls).toEqual(["first", "trailing"]);
  });

  it("drain resolves immediately when nothing in flight", async () => {
    const strategy = mockStrategy();
    const extractor = new AutoMemoryExtractor({
      extractionStrategy: strategy,
    });
    // Should not hang
    await extractor.drain(100);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// SecurityAuditLog
// ════════════════════════════════════════════════════════════════════════════

import { SecurityAuditLog, securityAuditLog } from "../security/auditLog.js";

describe("SecurityAuditLog", () => {
  // ── Logging ─────────────────────────────────────────────────────────────

  it("log creates entry with correct fields", () => {
    const audit = new SecurityAuditLog();
    const entry = audit.log("warning", "prompt_injection", "PromptGuard", "Injection detected");

    expect(entry).not.toBeNull();
    expect(entry!.id).toMatch(/^audit_/);
    expect(entry!.severity).toBe("warning");
    expect(entry!.category).toBe("prompt_injection");
    expect(entry!.source).toBe("PromptGuard");
    expect(entry!.summary).toBe("Injection detected");
    expect(entry!.timestamp).toBeInstanceOf(Date);
  });

  it("info/warn/critical shorthands set correct severity", () => {
    const audit = new SecurityAuditLog();
    expect(audit.info("pii_detected", "src", "test")!.severity).toBe("info");
    expect(audit.warn("pii_redacted", "src", "test")!.severity).toBe("warning");
    expect(audit.critical("access_denied", "src", "test")!.severity).toBe("critical");
  });

  it("calls onEntry callback for each log", () => {
    const entries: any[] = [];
    const audit = new SecurityAuditLog({ onEntry: (e) => entries.push(e) });

    audit.log("info", "custom", "test", "event 1");
    audit.log("warning", "custom", "test", "event 2");

    expect(entries).toHaveLength(2);
  });

  it("respects minSeverity filter (returns null for filtered)", () => {
    const audit = new SecurityAuditLog({ minSeverity: "warning" });

    const filtered = audit.log("info", "custom", "test", "should not store");
    const stored = audit.log("warning", "custom", "test", "should store");

    expect(filtered).toBeNull();
    expect(stored).not.toBeNull();
    expect(audit.count).toBe(1);
  });

  it("attaches sessionId from constructor", () => {
    const audit = new SecurityAuditLog({ sessionId: "sess-123" });
    const entry = audit.log("info", "custom", "test", "event");
    expect(entry).not.toBeNull();
    expect(entry!.sessionId).toBe("sess-123");
  });

  it("per-entry sessionId overrides constructor sessionId", () => {
    const audit = new SecurityAuditLog({ sessionId: "global" });
    const entry = audit.log("info", "custom", "test", "event", { sessionId: "override" });
    expect(entry).not.toBeNull();
    expect(entry!.sessionId).toBe("override");
  });

  it("attaches data and userId", () => {
    const audit = new SecurityAuditLog();
    const entry = audit.log("info", "custom", "test", "event", {
      data: { foo: "bar" },
      userId: "user-1",
    });
    expect(entry).not.toBeNull();
    expect(entry!.data).toEqual({ foo: "bar" });
    expect(entry!.userId).toBe("user-1");
  });

  // ── Capacity ────────────────────────────────────────────────────────────

  it("evicts oldest entries when maxEntries exceeded", () => {
    const audit = new SecurityAuditLog({ maxEntries: 3 });

    audit.log("info", "custom", "src", "event 1");
    audit.log("info", "custom", "src", "event 2");
    audit.log("info", "custom", "src", "event 3");
    audit.log("info", "custom", "src", "event 4");

    expect(audit.count).toBe(3);
    // Oldest should be evicted
    const entries = audit.query();
    expect(entries[0]!.summary).toBe("event 2");
  });

  it("clear removes all entries", () => {
    const audit = new SecurityAuditLog();
    audit.log("info", "custom", "test", "event");
    audit.clear();
    expect(audit.count).toBe(0);
  });

  // ── Query ───────────────────────────────────────────────────────────────

  it("query by severity returns entries at or above", () => {
    const audit = new SecurityAuditLog();
    audit.log("info", "custom", "src", "info event");
    audit.log("warning", "custom", "src", "warn event");
    audit.log("critical", "custom", "src", "critical event");

    const warnings = audit.query({ severity: "warning" });
    expect(warnings).toHaveLength(2); // warning + critical
  });

  it("query by category", () => {
    const audit = new SecurityAuditLog();
    audit.log("info", "pii_detected", "src", "pii");
    audit.log("info", "custom", "src", "other");

    expect(audit.query({ category: "pii_detected" })).toHaveLength(1);
  });

  it("query by source", () => {
    const audit = new SecurityAuditLog();
    audit.log("info", "custom", "PromptGuard", "from guard");
    audit.log("info", "custom", "PiiRedactor", "from redactor");

    expect(audit.query({ source: "PromptGuard" })).toHaveLength(1);
  });

  it("query by userId", () => {
    const audit = new SecurityAuditLog();
    audit.log("info", "custom", "src", "event", { userId: "alice" });
    audit.log("info", "custom", "src", "event", { userId: "bob" });

    expect(audit.query({ userId: "alice" })).toHaveLength(1);
  });

  it("query with limit", () => {
    const audit = new SecurityAuditLog();
    for (let i = 0; i < 10; i++) {
      audit.log("info", "custom", "src", `event ${i}`);
    }

    expect(audit.query({ limit: 3 })).toHaveLength(3);
  });

  // ── Stats ───────────────────────────────────────────────────────────────

  it("stats aggregates correctly", () => {
    const audit = new SecurityAuditLog();
    audit.log("info", "pii_detected", "src", "e1", { userId: "alice" });
    audit.log("warning", "prompt_injection", "guard", "e2", { userId: "alice" });
    audit.log("critical", "prompt_injection", "guard", "e3", { userId: "bob" });

    const s = audit.stats();
    expect(s.totalEntries).toBe(3);
    expect(s.bySeverity.info).toBe(1);
    expect(s.bySeverity.warning).toBe(1);
    expect(s.bySeverity.critical).toBe(1);
    expect(s.byCategory["prompt_injection"]).toBe(2);
    expect(s.bySource["guard"]).toBe(2);
    expect(s.topUsers[0]!.userId).toBe("alice");
    expect(s.timeRange).not.toBeNull();
  });

  it("stats returns null timeRange when empty", () => {
    const audit = new SecurityAuditLog();
    expect(audit.stats().timeRange).toBeNull();
  });

  // ── Export ──────────────────────────────────────────────────────────────

  it("toJSON serializes entries", () => {
    const audit = new SecurityAuditLog();
    audit.log("info", "custom", "src", "event");

    const json = audit.toJSON();
    expect(json).toHaveLength(1);
    expect(typeof (json[0] as any).timestamp).toBe("string"); // ISO string
  });

  it("toNDJSON produces newline-delimited JSON", () => {
    const audit = new SecurityAuditLog();
    audit.log("info", "custom", "src", "event 1");
    audit.log("info", "custom", "src", "event 2");

    const ndjson = audit.toNDJSON();
    const lines = ndjson.split("\n");
    expect(lines).toHaveLength(2);
    expect(() => JSON.parse(lines[0]!)).not.toThrow();
  });

  // ── Callbacks ──────────────────────────────────────────────────────────

  it("createCallbacks returns wired callbacks", () => {
    const audit = new SecurityAuditLog();
    const cb = audit.createCallbacks("user-1");

    cb.promptGuard({ patternName: "sql_injection", severity: "high", action: "blocked" });

    expect(audit.count).toBe(1);
    const entry = audit.query()[0]!;
    expect(entry.category).toBe("prompt_injection");
    expect(entry.severity).toBe("critical");
    expect(entry.userId).toBe("user-1");
  });

  it("createCallbacks.piiRedactor logs correctly", () => {
    const audit = new SecurityAuditLog();
    const cb = audit.createCallbacks();

    cb.piiRedactor({ category: "email", direction: "output", count: 2, action: "redacted" });

    expect(audit.query()[0]!.category).toBe("pii_redacted");
  });

  // ── Factory ────────────────────────────────────────────────────────────

  it("securityAuditLog factory creates instance", () => {
    const audit = securityAuditLog({ maxEntries: 100 });
    expect(audit).toBeInstanceOf(SecurityAuditLog);
    audit.log("info", "custom", "test", "event");
    expect(audit.count).toBe(1);
  });
});
