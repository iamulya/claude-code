/**
 * Integration Tests — Cross-Subsystem Real I/O
 *
 * end-to-end tests that exercise multiple subsystems together
 * with real file I/O, no mocked internals.
 *
 * Tests:
 * IT1 AuditLog filePath → real NDJSON file written and readable
 * IT2 AuditLog onSinkError fires on write failure (permissions)
 * IT3 VectorMemory + MemoryStore: documents survive a simulated restart
 * IT4 VectorMemory eviction observed via onSearch after reload
 * IT5 InProcessIPC + AuditLog: unauthorized message triggers audit entry
 * IT6 IPC backpressure + AuditLog: overflow events surfaced in audit trail
 * IT7 GroundingValidator → AuditLog pipeline: failed grounding is audited
 */

import { describe, it, expect, afterEach } from "vitest";
import { mkdtemp, rm, readFile, chmod } from "fs/promises";
import { join } from "path";
import { tmpdir, platform } from "os";
import { SecurityAuditLog } from "../security/auditLog.js";
import { VectorMemoryPlugin } from "../memory/vectorMemory.js";
import { MemoryStore } from "../memory/memoryStore.js";
import { InProcessIPCPlugin } from "../integrations/inProcessIPC.js";
import { GroundingValidator } from "../security/groundingValidator.js";
import type { ChatMessage } from "../agents/runner.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

const dirs: string[] = [];

async function makeTmpDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "yaaf-it-"));
  dirs.push(dir);
  return dir;
}

afterEach(async () => {
  // Clean up all temp dirs created during the test
  for (const dir of dirs.splice(0)) {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
});

function toolMsg(content: string): ChatMessage {
  return { role: "tool", toolCallId: "tc1", name: "test_tool", content };
}

// ── IT1: AuditLog real NDJSON file sink ──────────────────────────────────────

describe("IT1: AuditLog writes NDJSON to a real file", () => {
  it("appends parseable NDJSON lines for each logged event", async () => {
    const dir = await makeTmpDir();
    const filePath = join(dir, "audit.ndjson");

    const log = new SecurityAuditLog({ filePath });

    log.warn("prompt_injection", "test", "Injection attempt detected", { userId: "user-1" });
    log.critical("access_denied", "test", "Access denied to restricted tool", { userId: "user-1" });

    // Give the async file appends time to flush
    await new Promise((r) => setTimeout(r, 50));

    const raw = await readFile(filePath, "utf8");
    const lines = raw.trim().split("\n").filter(Boolean);

    expect(lines).toHaveLength(2);

    const entry1 = JSON.parse(lines[0]!);
    expect(entry1.severity).toBe("warning");
    expect(entry1.category).toBe("prompt_injection");
    expect(entry1.userId).toBe("user-1");

    const entry2 = JSON.parse(lines[1]!);
    expect(entry2.severity).toBe("critical");
    expect(entry2.category).toBe("access_denied");
  });
});

// ── IT2: AuditLog onSinkError on write failure ────────────────────────────────

describe("IT2: AuditLog onSinkError fires when file write fails", () => {
  it("calls onSinkError and never throws when appendFile errors", async () => {
    const sinkErrors: Array<{ category: string }> = [];

    // Provide a broken filePath that cannot be opened (directory instead of file)
    const dir = await makeTmpDir();
    // Point filePath at the directory itself — fsAppendFile to a dir path always fails
    const log = new SecurityAuditLog({
      filePath: dir, // a directory, not a writable file
      onSinkError: (_err, entry) => sinkErrors.push({ category: entry.category }),
    });

    log.warn("prompt_injection", "test", "Attempt 1");
    log.warn("access_denied", "test", "Attempt 2");

    // Wait for async file appends to fail
    await new Promise((r) => setTimeout(r, 150));

    // onSinkError should have been called for both entries
    expect(sinkErrors.length).toBeGreaterThanOrEqual(1);
    // In-memory entries are unaffected
    expect(log.query({}).length).toBe(2);
  });
});

// ── IT3: VectorMemory + MemoryStore: crash recovery ──────────────────────────

describe("IT3: VectorMemory documents survive a simulated restart (MemoryStore)", () => {
  it("restores all documents via initialize() after a fresh VectorMemoryPlugin instance", async () => {
    const dir = await makeTmpDir();
    const store = new MemoryStore({ privateDir: dir });
    await store.initialize();

    // "Session 1" — write three documents
    const v1 = new VectorMemoryPlugin({ persistTo: store });
    await v1.upsert("doc-alpha", "neural network machine learning deep learning", {});
    await v1.upsert("doc-beta", "database relational sql transactions", {});
    await v1.upsert("doc-gamma", "kubernetes orchestration containerization docker", {});
    expect(v1.size()).toBe(3);

    // "Session 2" — fresh instance, same MemoryStore → should reload
    const v2 = new VectorMemoryPlugin({ persistTo: store });
    expect(v2.size()).toBe(0); // before initialize(), nothing loaded

    await v2.initialize();
    expect(v2.size()).toBe(3); // after initialize(), all three restored

    // Search works after restore (content is the same, just under safeFilename ids)
    const results = await v2.search("machine learning", 5);
    // At least one result returned (TF-IDF on restored content)
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.score).toBeGreaterThan(0);
  });
});

// ── IT4: VectorMemory eviction visible in onSearch after reload ───────────────

describe("IT4: maxDocuments eviction + reload via MemoryStore keeps only surviving docs", () => {
  it("VectorMemory reloads persisted docs and respects maxDocuments cap", async () => {
    const dir = await makeTmpDir();
    const store = new MemoryStore({ privateDir: dir });
    await store.initialize();

    // Session 1: 3 docs persisted to MemoryStore (no in-memory cap yet)
    const v1 = new VectorMemoryPlugin({ persistTo: store });
    await v1.upsert("keep-a", "javascript typescript frameworks development", {});
    await v1.upsert("keep-b", "react components hooks frontend rendering", {});
    await v1.upsert("keep-c", "quantum physics entanglement superposition", {});
    expect(v1.size()).toBe(3);

    // Session 2: fresh instance with maxDocuments=2 — initialize() should load
    // docs from MemoryStore but cap at maxDocuments (2) via eviction
    const v2 = new VectorMemoryPlugin({ maxDocuments: 2, persistTo: store });
    await v2.initialize();

    // All 3 were persisted, but maxDocuments=2 enforced oldest-first eviction
    expect(v2.size()).toBe(2);
  });
});

// ── IT5: IPC + AuditLog pipeline: unauthorized sender audited ─────────────────

describe("IT5: IPC allowedSenders violation flows through to AuditLog", () => {
  it("unauthorized IPC message triggers an audit entry", async () => {
    const entries: Array<{ category: string; summary: string }> = [];
    const audit = new SecurityAuditLog({
      onEntry: (e) => entries.push({ category: e.category, summary: e.summary }),
    });

    const ipc = new InProcessIPCPlugin({
      onEvent: (ev) => {
        if (ev.type === "ipc:dlq") {
          audit.warn(
            "access_denied",
            "inProcessIPC",
            `Unauthorized sender blocked: ${JSON.stringify(ev)}`,
          );
        }
      },
    });

    // Subscribe with allowedSenders whitelist
    const received: string[] = [];
    ipc.subscribe("secure-inbox", (msg) => received.push(msg.from), {
      allowedSenders: ["agent-trusted"],
    });

    // Authorized sender
    await ipc.send("secure-inbox", {
      from: "agent-trusted",
      to: "secure-inbox",
      body: "hello",
      maxAttempts: 1,
    });
    // Unauthorized sender — should DLQ + fire onEvent → audit entry
    await ipc.send("secure-inbox", {
      from: "agent-evil",
      to: "secure-inbox",
      body: "exploit",
      maxAttempts: 1,
    });

    await new Promise((r) => setTimeout(r, 20));

    expect(received).toEqual(["agent-trusted"]);
    expect(entries.some((e) => e.category === "access_denied")).toBe(true);
  });
});

// ── IT6: IPC backpressure + AuditLog ─────────────────────────────────────────

describe("IT6: IPC backpressure overflow appears in AuditLog", () => {
  it("drop-oldest overflow emits an audit entry via onEvent → AuditLog", async () => {
    const warnings: string[] = [];
    const audit = new SecurityAuditLog({
      onEntry: (e) => {
        if (e.severity === "warning") warnings.push(e.summary);
      },
    });

    const ipc = new InProcessIPCPlugin({
      maxInboxSize: 2,
      fullPolicy: "drop-oldest",
      onEvent: (ev) => {
        if (ev.type === "ipc:backpressure") {
          audit.warn(
            "input_anomaly",
            "inProcessIPC",
            `IPC backpressure triggered: inbox full on "${ev.inbox}"`,
          );
        }
      },
    });

    // Fill inbox
    await ipc.send("bp-box", { from: "src", to: "bp-box", body: "msg1", maxAttempts: 1 });
    await ipc.send("bp-box", { from: "src", to: "bp-box", body: "msg2", maxAttempts: 1 });
    // Third message triggers backpressure
    await ipc.send("bp-box", { from: "src", to: "bp-box", body: "msg3", maxAttempts: 1 });

    expect(warnings.some((w) => w.includes("backpressure"))).toBe(true);
  });
});

// ── IT7: GroundingValidator → AuditLog pipeline ───────────────────────────────

describe("IT7: GroundingValidator failed grounding is surfaced in AuditLog", () => {
  it("a grounding failure below threshold triggers an audit warning", async () => {
    const grounded: Array<{ score: number; action: string }> = [];
    const audit = new SecurityAuditLog({
      onEntry: (e) => {
        if (e.category === "grounding_failed") grounded.push(e.data as never);
      },
    });

    const validator = new GroundingValidator({
      mode: "strict",
      minCoverage: 0.95, // very high — almost everything will fail
      minOverlapTokens: 10, // hard to satisfy
      onAssessment: (ev) => {
        if (ev.action === "overridden") {
          audit.warn(
            "grounding_failed",
            "groundingValidator",
            "LLM response failed grounding check",
            {
              score: ev.score,
              action: ev.action,
            },
          );
        }
      },
    });

    // Evidence: very brief. Response: long and hallucinated.
    const messages: ChatMessage[] = [
      { role: "tool", toolCallId: "tc1", name: "api", content: "Revenue: $5M" },
    ];
    const response =
      "The company expanded to 47 countries and hired 12,000 new employees. Their quantum computing division achieved a major breakthrough. Stock price rose 340% in Q3.";

    await validator.assess(response, messages);

    // The 'grounding_failed' audit entry should have been created
    expect(grounded.length).toBeGreaterThan(0);
  });
});
