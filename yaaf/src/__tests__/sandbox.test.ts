/**
 * Sandbox test suite
 *
 * The Sandbox wraps tool execution with:
 * - Execution timeout (hard kill after N ms)
 * - Path guard (restrict FS access to allowed directories)
 * - Network guard (block outbound fetch)
 * - Resource tracking (call count, duration, violations)
 *
 * This is a security boundary — bugs here mean tools can escape
 * their confinement and access files/network they shouldn't.
 *
 * ⚠️ Previously had ZERO test coverage.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  Sandbox,
  SandboxError,
  timeoutSandbox,
  strictSandbox,
  projectSandbox,
} from "../sandbox.js";

// ── Helpers ─────────────────────────────────────────────────────────────────

const noop = async (args: Record<string, unknown>) => args;
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ════════════════════════════════════════════════════════════════════════════
// Basic execution
// ════════════════════════════════════════════════════════════════════════════

describe("Sandbox — basic execution", () => {
  it("executes a function and returns result + duration", async () => {
    const sb = new Sandbox();
    const result = await sb.execute("test", { x: 1 }, async (args) => {
      return { computed: (args.x as number) * 2 };
    });

    expect(result.value).toEqual({ computed: 2 });
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("tracks call count and total duration", async () => {
    const sb = new Sandbox();
    await sb.execute("a", {}, async () => "ok");
    await sb.execute("b", {}, async () => "ok");

    const stats = sb.stats();
    expect(stats.callCount).toBe(2);
    expect(stats.totalDurationMs).toBeGreaterThanOrEqual(0);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Timeout
// ════════════════════════════════════════════════════════════════════════════

describe("Sandbox — timeout", () => {
  it("kills execution after timeoutMs", async () => {
    const sb = new Sandbox({ timeoutMs: 50 });

    await expect(
      sb.execute("slow_tool", {}, async () => {
        await delay(5000);
        return "should not reach";
      }),
    ).rejects.toThrow(SandboxError);
  });

  it("timeout SandboxError has correct violation type and toolName", async () => {
    const sb = new Sandbox({ timeoutMs: 50 });

    try {
      await sb.execute("slow", {}, () => delay(5000) as Promise<any>);
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(SandboxError);
      expect((err as SandboxError).violation.type).toBe("timeout");
      expect((err as SandboxError).violation.toolName).toBe("slow");
    }
  });

  it("calls onViolation callback on timeout", async () => {
    const violations: any[] = [];
    const sb = new Sandbox({
      timeoutMs: 50,
      onViolation: (v) => violations.push(v),
    });

    try {
      await sb.execute("sleepy", {}, () => delay(5000) as Promise<any>);
    } catch {}

    expect(violations).toHaveLength(1);
    expect(violations[0].type).toBe("timeout");
  });

  it("tracks timeout in violation count", async () => {
    const sb = new Sandbox({ timeoutMs: 50 });
    try {
      await sb.execute("a", {}, () => delay(5000) as any);
    } catch {}
    expect(sb.stats().violationCount).toBe(1);
  });

  it("does not timeout fast executions", async () => {
    const sb = new Sandbox({ timeoutMs: 5000 });
    const result = await sb.execute("fast", {}, async () => "quick");
    expect(result.value).toBe("quick");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Path guard
// ════════════════════════════════════════════════════════════════════════════

describe("Sandbox — path guard", () => {
  it("allows paths within allowedPaths", async () => {
    const sb = new Sandbox({ allowedPaths: ["/home/user/project"] });
    const result = await sb.execute("read", { path: "/home/user/project/src/index.ts" }, noop);
    expect(result.value).toBeTruthy();
  });

  it("blocks paths outside allowedPaths", async () => {
    const sb = new Sandbox({ allowedPaths: ["/home/user/project"] });

    await expect(sb.execute("read", { path: "/etc/passwd" }, noop)).rejects.toThrow(SandboxError);
  });

  it("blocks paths on blockedPaths even if inside allowedPaths", async () => {
    const sb = new Sandbox({
      allowedPaths: ["/home/user"],
      blockedPaths: ["/home/user/.ssh"],
    });

    await expect(sb.execute("read", { file: "/home/user/.ssh/id_rsa" }, noop)).rejects.toThrow(
      SandboxError,
    );
  });

  it("path traversal via ../ is normalized and blocked", async () => {
    const sb = new Sandbox({ allowedPaths: ["/home/user/project"] });

    await expect(
      sb.execute("read", { path: "/home/user/project/../../etc/passwd" }, noop),
    ).rejects.toThrow(SandboxError);
  });

  it("scans nested argument objects for path-like values", async () => {
    const sb = new Sandbox({ allowedPaths: ["/safe"] });

    await expect(
      sb.execute(
        "write",
        {
          options: {
            target: "/etc/shadow",
          },
        },
        noop,
      ),
    ).rejects.toThrow(SandboxError);
  });

  it("scans arrays for path-like values", async () => {
    const sb = new Sandbox({ allowedPaths: ["/safe"] });

    await expect(
      sb.execute(
        "multi",
        {
          files: ["/safe/ok.txt", "/etc/passwd"],
        },
        noop,
      ),
    ).rejects.toThrow(SandboxError);
  });

  it("allows all paths when allowedPaths is empty (default)", async () => {
    const sb = new Sandbox(); // no allowedPaths
    const result = await sb.execute("read", { path: "/any/where" }, noop);
    expect(result.value).toBeTruthy();
  });

  it("validate() returns null for valid paths", () => {
    const sb = new Sandbox({ allowedPaths: ["/safe"] });
    expect(sb.validate("tool", { path: "/safe/file.txt" })).toBeNull();
  });

  it("validate() returns error string for denied paths", () => {
    const sb = new Sandbox({ allowedPaths: ["/safe"] });
    const err = sb.validate("tool", { path: "/etc/passwd" });
    expect(err).toContain("outside allowed");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Network guard
// ════════════════════════════════════════════════════════════════════════════

describe("Sandbox — network guard", () => {
  it("blocks when URL is detected in tool arguments", async () => {
    const sb = new Sandbox({ blockNetwork: true });

    // sandbox now checks arguments for URLs instead of patching fetch
    await expect(
      sb.execute("api_call", { url: "https://example.com" }, async () => {
        return "should not reach";
      }),
    ).rejects.toThrow(SandboxError);
  });

  it("blocks when URL pattern is detected in string values", async () => {
    const sb = new Sandbox({ blockNetwork: true });

    await expect(
      sb.execute("scraper", { target: "fetch https://evil.com/data" }, async () => {
        return "should not reach";
      }),
    ).rejects.toThrow(SandboxError);
  });

  it("blocks nested URL arguments", async () => {
    const sb = new Sandbox({ blockNetwork: true });

    await expect(
      sb.execute("nested", { options: { endpoint: "https://api.example.com" } }, async () => {
        return "should not reach";
      }),
    ).rejects.toThrow(SandboxError);
  });

  it("allows execution when no URL in arguments", async () => {
    const sb = new Sandbox({ blockNetwork: true });

    const result = await sb.execute("safe_tool", { text: "hello world" }, async () => {
      return "no network needed";
    });
    expect(result.value).toBe("no network needed");
  });

  it("allows URL arguments when blockNetwork is false", async () => {
    const sb = new Sandbox({ blockNetwork: false });

    const result = await sb.execute("api_call", { url: "https://example.com" }, async () => {
      return "allowed";
    });
    expect(result.value).toBe("allowed");
  });

  it("does not modify globalThis.fetch", async () => {
    const originalFetch = globalThis.fetch;
    const sb = new Sandbox({ blockNetwork: true });

    try {
      await sb.execute("test", { url: "https://evil.com" }, async () => "x");
    } catch {
      /* expected */
    }

    // W-17: fetch should NOT be patched
    expect(globalThis.fetch).toBe(originalFetch);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Violation handling
// ════════════════════════════════════════════════════════════════════════════

describe("Sandbox — violation handling", () => {
  it("calls onViolation callback before throwing", async () => {
    const violations: any[] = [];
    const sb = new Sandbox({
      allowedPaths: ["/safe"],
      onViolation: (v) => violations.push(v),
    });

    try {
      await sb.execute("read", { path: "/etc/passwd" }, noop);
    } catch {
      // expected
    }

    expect(violations).toHaveLength(1);
    expect(violations[0].type).toBe("path");
    expect(violations[0].toolName).toBe("read");
  });

  it("tracks violation count in stats", async () => {
    const sb = new Sandbox({ allowedPaths: ["/safe"] });

    try {
      await sb.execute("read", { path: "/etc/x" }, noop);
    } catch {}
    try {
      await sb.execute("read", { path: "/etc/y" }, noop);
    } catch {}

    expect(sb.stats().violationCount).toBe(2);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Factory helpers
// ════════════════════════════════════════════════════════════════════════════

describe("Sandbox — factories", () => {
  it("timeoutSandbox creates sandbox with only timeout protection", async () => {
    const sb = timeoutSandbox(100);
    // Should NOT block paths (no allowedPaths set)
    const result = await sb.execute("read", { path: "/etc/anything" }, noop);
    expect(result.value).toBeTruthy();
  });

  it("strictSandbox restricts to rootDir and blocks network", async () => {
    const sb = strictSandbox("/project");

    // Allowed path
    const r = await sb.execute("read", { path: "/project/src/main.ts" }, noop);
    expect(r.value).toBeTruthy();

    // Blocked system path
    await expect(sb.execute("read", { path: "/etc/passwd" }, noop)).rejects.toThrow();

    // Blocked path (/proc is in blockedPaths)
    await expect(sb.execute("read", { path: "/proc/self/environ" }, noop)).rejects.toThrow();
  });

  it("projectSandbox restricts to project dir", async () => {
    const sb = projectSandbox("/my/project");

    const r = await sb.execute("read", { path: "/my/project/package.json" }, noop);
    expect(r.value).toBeTruthy();

    await expect(sb.execute("read", { path: "/other/place" }, noop)).rejects.toThrow();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Stats
// ════════════════════════════════════════════════════════════════════════════

describe("Sandbox — stats", () => {
  it("avgDurationMs is 0 when no calls made", () => {
    const sb = new Sandbox();
    expect(sb.stats().avgDurationMs).toBe(0);
  });

  it("avgDurationMs is computed correctly", async () => {
    const sb = new Sandbox();
    await sb.execute("a", {}, () => delay(10).then(() => "ok"));
    await sb.execute("b", {}, () => delay(10).then(() => "ok"));

    const stats = sb.stats();
    expect(stats.callCount).toBe(2);
    expect(stats.avgDurationMs).toBeGreaterThanOrEqual(5); // generous bound
  });
});
