/**
 * AuditLog Failure-Path Tests — (A1, A2, A3)
 *
 * AL1 onSinkError is called when pluginHost.emitLog() throws
 * AL2 Default onSinkError calls console.error (not silent)
 * AL3 Critical notification failure calls onSinkError
 * AL4 Queue depth exceeded → onSinkError called, critical alert not lost in queue
 * AL5 File sink: unwritable path → onSinkError called, log() still returns entry
 * AL6 File sink: concurrent log() calls produce valid NDJSON
 * AL7 onSinkError handler that throws does not crash the audit log
 * AL8 pendingNotifications counter increments and decrements correctly
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { tmpdir } from "os";
import { join } from "path";
import { readFile, unlink, writeFile } from "fs/promises";
import { SecurityAuditLog } from "../security/auditLog.js";

const makePluginHost = (
  overrides: Partial<{
    emitLog: (...args: unknown[]) => void;
    notify: (...args: unknown[]) => Promise<void>;
  }> = {},
) =>
  ({
    emitLog: overrides.emitLog ?? vi.fn(),
    notify: overrides.notify ?? vi.fn().mockResolvedValue(undefined),
  }) as unknown as import("../plugin/types.js").PluginHost;

// ── AL1: onSinkError called when emitLog throws ───────────────────────────────

describe("AL1: onSinkError called when pluginHost.emitLog() throws", () => {
  it("reports the emitLog error via onSinkError, not silently swallows it", () => {
    const sinkErrors: Array<{ err: unknown; entry: unknown }> = [];
    const auditLog = new SecurityAuditLog({
      onSinkError: (err, entry) => sinkErrors.push({ err, entry }),
    });

    const throwingHost = makePluginHost({
      emitLog: () => {
        throw new Error("emitLog connection reset");
      },
    });
    auditLog.setPluginHost(throwingHost);

    const entry = auditLog.log("info", "prompt_injection", "PromptGuard", "Test event");

    expect(entry).not.toBeNull(); // log() still returns the entry
    expect(sinkErrors).toHaveLength(1); // error was reported
    expect(String(sinkErrors[0]!.err)).toContain("emitLog connection reset");
  });
});

// ── AL2: Default onSinkError writes to console.error ─────────────────────────

describe("AL2: default onSinkError calls console.error (not silent)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("calls console.error when emitLog throws and no onSinkError is provided", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const auditLog = new SecurityAuditLog(); // no onSinkError configured
    const throwingHost = makePluginHost({
      emitLog: () => {
        throw new Error("downstream failure");
      },
    });
    auditLog.setPluginHost(throwingHost);

    auditLog.log("warning", "rate_limited", "PerUserRateLimiter", "Rate limited");

    expect(consoleSpy).toHaveBeenCalled();
    expect(String(consoleSpy.mock.calls[0]![0])).toContain("[yaaf/audit]");
  });
});

// ── AL3: Critical notification failure calls onSinkError ─────────────────────

describe("AL3: critical notification failure calls onSinkError", async () => {
  it("calls onSinkError when pluginHost.notify() rejects", async () => {
    const sinkErrors: unknown[] = [];
    const auditLog = new SecurityAuditLog({
      onSinkError: (err) => sinkErrors.push(err),
    });

    const failingHost = makePluginHost({
      emitLog: vi.fn(),
      notify: vi.fn().mockRejectedValue(new Error("PagerDuty rate limit exceeded")),
    });
    auditLog.setPluginHost(failingHost);

    auditLog.log("critical", "prompt_injection", "PromptGuard", "Critical injection detected");

    // Wait for the async notify() promise to settle
    await new Promise((r) => setTimeout(r, 50));

    expect(sinkErrors).toHaveLength(1);
    expect(String(sinkErrors[0])).toContain("PagerDuty");
  });
});

// ── AL4: Queue depth exceeded → onSinkError for overflow ─────────────────────

describe("AL4: maxQueueDepth exceeded → overflow reported via onSinkError", async () => {
  it("calls onSinkError when critical notifications exceed maxQueueDepth", async () => {
    const sinkErrors: unknown[] = [];
    const auditLog = new SecurityAuditLog({
      maxQueueDepth: 2, // only 2 in-flight notifications allowed
      onSinkError: (err) => sinkErrors.push(err),
    });

    // notify() never resolves — so pending count keeps growing
    const neverResolve = vi.fn().mockReturnValue(new Promise(() => {}));
    const host = makePluginHost({ notify: neverResolve });
    auditLog.setPluginHost(host);

    // Emit 3 critical events — the 3rd should overflow
    auditLog.log("critical", "prompt_injection", "PromptGuard", "Event 1");
    auditLog.log("critical", "prompt_injection", "PromptGuard", "Event 2");
    auditLog.log("critical", "prompt_injection", "PromptGuard", "Event 3"); // overflow

    expect(sinkErrors.length).toBeGreaterThanOrEqual(1);
    expect(String(sinkErrors[0])).toContain("queue full");
  });
});

// ── AL5: File sink: unwritable path → onSinkError, log() still works ─────────

describe("AL5: file sink with unwritable path → onSinkError called", async () => {
  it("reports file write errors via onSinkError but does not throw from log()", async () => {
    const sinkErrors: unknown[] = [];
    const auditLog = new SecurityAuditLog({
      filePath: "/nonexistent/path/that/does/not/exist/audit.ndjson",
      onSinkError: (err) => sinkErrors.push(err),
    });

    const entry = auditLog.log("info", "pii_detected", "PiiRedactor", "PII found");
    expect(entry).not.toBeNull(); // log() returns the entry synchronously

    // Wait for the async appendFile to fail
    await new Promise((r) => setTimeout(r, 60));

    expect(sinkErrors).toHaveLength(1);
    // The error should be an ENOENT or ENOTDIR from the filesystem
    expect(sinkErrors[0]).toBeInstanceOf(Error);
  });
});

// ── AL6: File sink: concurrent writes produce valid NDJSON ────────────────────

describe("AL6: concurrent file sink writes produce valid NDJSON", async () => {
  const tmpFile = join(tmpdir(), `yaaf-audit-test-${Date.now()}.ndjson`);

  afterEach(async () => {
    await unlink(tmpFile).catch(() => {});
  });

  it("all concurrent entries appear as valid NDJSON lines", async () => {
    const auditLog = new SecurityAuditLog({ filePath: tmpFile });

    // Fire 20 concurrent log() calls
    const count = 20;
    for (let i = 0; i < count; i++) {
      auditLog.log("info", "custom", `source-${i}`, `Concurrent event ${i}`);
    }

    // Wait for all appends to settle
    await new Promise((r) => setTimeout(r, 200));

    const content = await readFile(tmpFile, "utf8");
    const lines = content
      .trim()
      .split("\n")
      .filter((l) => l.length > 0);

    expect(lines).toHaveLength(count);
    for (const line of lines) {
      const parsed = JSON.parse(line); // must be valid JSON
      expect(parsed.id).toMatch(/^audit_\d+$/);
      expect(typeof parsed.timestamp).toBe("string");
    }
  });
});

// ── AL7: onSinkError that throws does not crash the audit log ─────────────────

describe("AL7: onSinkError that itself throws is safely absorbed", () => {
  it("does not propagate errors from the error handler", () => {
    const auditLog = new SecurityAuditLog({
      onSinkError: () => {
        throw new Error("Error handler also broken");
      },
    });

    const throwingHost = makePluginHost({
      emitLog: () => {
        throw new Error("primary sink failure");
      },
    });
    auditLog.setPluginHost(throwingHost);

    // Must not throw
    expect(() => auditLog.log("info", "custom", "test", "Event")).not.toThrow();
  });
});

// ── AL8: pendingNotifications tracks in-flight notifications ──────────────────

describe("AL8: pendingNotifications counter", async () => {
  it("increments while notify is pending and decrements after resolution", async () => {
    let resolve!: () => void;
    const pending = new Promise<void>((r) => {
      resolve = r;
    });

    const auditLog = new SecurityAuditLog({ maxQueueDepth: 100 });
    const host = makePluginHost({ notify: () => pending });
    auditLog.setPluginHost(host);

    // Critical event → notify() is pending
    auditLog.log("critical", "trust_violation", "TrustPolicy", "Blocked plugin");
    expect(auditLog.pendingNotifications).toBe(1);

    resolve();
    await new Promise((r) => setTimeout(r, 20));
    expect(auditLog.pendingNotifications).toBe(0);
  });
});
