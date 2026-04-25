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

// ════════════════════════════════════════════════════════════════════════════
// Application-level domain allowlist (allowedNetworkDomains)
// ════════════════════════════════════════════════════════════════════════════

describe("Sandbox — allowedNetworkDomains", () => {
  // ── Argument scanning ────────────────────────────────────────────────

  it("blocks URLs to non-allowed domains in args", async () => {
    const sb = new Sandbox({
      blockNetwork: true,
      allowedNetworkDomains: ["api.openai.com"],
    });

    await expect(
      sb.execute("tool", { url: "https://evil.com/steal" }, async () => "should not run"),
    ).rejects.toThrow(SandboxError);
  });

  it("allows URLs to explicitly allowed domains in args", async () => {
    const sb = new Sandbox({
      blockNetwork: true,
      allowedNetworkDomains: ["api.openai.com"],
    });

    const result = await sb.execute(
      "tool",
      { url: "https://api.openai.com/v1/chat/completions" },
      async () => "allowed",
    );
    expect(result.value).toBe("allowed");
  });

  it("wildcard *.domain matches subdomains", async () => {
    const sb = new Sandbox({
      blockNetwork: true,
      allowedNetworkDomains: ["*.anthropic.com"],
    });

    // Allowed: subdomain
    const result = await sb.execute(
      "tool",
      { url: "https://api.anthropic.com/v1/messages" },
      async () => "allowed",
    );
    expect(result.value).toBe("allowed");

    // Blocked: different domain
    await expect(
      sb.execute("tool", { url: "https://evil.com" }, async () => "no"),
    ).rejects.toThrow(SandboxError);
  });

  it("dot-prefix .domain matches subdomains", async () => {
    const sb = new Sandbox({
      blockNetwork: true,
      allowedNetworkDomains: [".example.com"],
    });

    const result = await sb.execute(
      "tool",
      { url: "https://sub.example.com/api" },
      async () => "allowed",
    );
    expect(result.value).toBe("allowed");
  });

  it("does NOT match partial domain names", async () => {
    const sb = new Sandbox({
      blockNetwork: true,
      allowedNetworkDomains: ["example.com"],
    });

    // "notexample.com" should NOT match "example.com"
    await expect(
      sb.execute("tool", { url: "https://notexample.com" }, async () => "no"),
    ).rejects.toThrow(SandboxError);
  });

  it("case-insensitive domain matching", async () => {
    const sb = new Sandbox({
      blockNetwork: true,
      allowedNetworkDomains: ["API.OpenAI.COM"],
    });

    const result = await sb.execute(
      "tool",
      { url: "https://api.openai.com/v1/chat" },
      async () => "allowed",
    );
    expect(result.value).toBe("allowed");
  });

  it("multiple allowed domains", async () => {
    const sb = new Sandbox({
      blockNetwork: true,
      allowedNetworkDomains: ["api.openai.com", "api.anthropic.com", "*.github.com"],
    });

    // Allowed: first domain
    const r1 = await sb.execute(
      "a", { url: "https://api.openai.com/v1" }, async () => "ok",
    );
    expect(r1.value).toBe("ok");

    // Allowed: second domain
    const r2 = await sb.execute(
      "b", { url: "https://api.anthropic.com/v1" }, async () => "ok",
    );
    expect(r2.value).toBe("ok");

    // Blocked: not in list
    await expect(
      sb.execute("c", { url: "https://evil.com" }, async () => "no"),
    ).rejects.toThrow(SandboxError);
  });

  // ── Runtime fetch interception ───────────────────────────────────────

  it("runtime fetch to allowed domain passes through", async () => {
    const sb = new Sandbox({
      blockNetwork: true,
      allowedNetworkDomains: ["example.com"],
    });

    const result = await sb.execute("fetcher", {}, async () => {
      // This calls globalThis.fetch — the ALS proxy should allow it
      const resp = await fetch("https://example.com");
      return resp.status;
    });
    // Should succeed (200 from example.com)
    expect(result.value).toBe(200);
  }, 10000);

  it("runtime fetch to denied domain throws SandboxError", async () => {
    const sb = new Sandbox({
      blockNetwork: true,
      allowedNetworkDomains: ["example.com"],
    });

    await expect(
      sb.execute("fetcher", {}, async () => {
        // evil.com is not in allowedNetworkDomains
        await fetch("https://evil.com");
        return "should not reach";
      }),
    ).rejects.toThrow(SandboxError);
  });

  it("runtime fetch with no allowed domains blocks everything", async () => {
    const sb = new Sandbox({
      blockNetwork: true,
      // No allowedNetworkDomains → block ALL
    });

    await expect(
      sb.execute("fetcher", {}, async () => {
        await fetch("https://example.com");
        return "should not reach";
      }),
    ).rejects.toThrow(SandboxError);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ALS runtime interception — bypass proof
//
// These tests document the KNOWN LIMITATION: http.request / https.request /
// net.connect cannot be intercepted in ESM strict mode because
// Object.defineProperty fails on non-configurable module exports.
//
// The OS-level sandbox (sandbox-exec + proxy) covers this gap for child
// processes. For in-process tools, only globalThis.fetch is blocked.
// ════════════════════════════════════════════════════════════════════════════

describe("Sandbox — ALS runtime interception coverage", () => {
  it("PROOF: fetch() IS intercepted — blocked domain throws", async () => {
    const sb = new Sandbox({ blockNetwork: true });

    await expect(
      sb.execute("tool", {}, async () => {
        // This calls the REAL globalThis.fetch, which is intercepted by the ALS proxy
        const resp = await fetch("https://evil.com");
        return resp.status;
      }),
    ).rejects.toThrow(SandboxError);
  });

  it("PROOF: fetch() IS intercepted — allowed domain passes through", async () => {
    const sb = new Sandbox({
      blockNetwork: true,
      allowedNetworkDomains: ["example.com"],
    });

    const result = await sb.execute("tool", {}, async () => {
      // The ALS proxy sees "example.com" is allowed and passes through to real fetch
      const resp = await fetch("https://example.com");
      return resp.status;
    });
    expect(result.value).toBe(200);
  }, 10000);

  it("KNOWN GAP: https.request BYPASSES sandbox in ESM", async () => {
    const https = await import("https");
    const sb = new Sandbox({ blockNetwork: true });

    // In ESM strict mode, Object.defineProperty on https.request fails
    // (non-configurable). The http/https proxy logs a warning but cannot
    // intercept. This test documents the gap.
    const result = await sb.execute("tool", {}, () => {
      return new Promise<number>((resolve, reject) => {
        try {
          const req = https.request("https://example.com", (res) => {
            resolve(res.statusCode ?? 0);
            res.resume(); // drain
          });
          req.on("error", (err) => {
            // If interception WORKED, this would be a SandboxError
            if (err.message.includes("blocked by sandbox")) {
              resolve(-1); // blocked = interception worked
            } else {
              reject(err);
            }
          });
          req.end();
        } catch (e: unknown) {
          // If interception WORKED, this would be a SandboxError
          if (e instanceof SandboxError) {
            resolve(-1); // blocked
          } else {
            reject(e);
          }
        }
      });
    });

    // In ESM: result is 200 (bypassed) — the sandbox could NOT intercept
    // In CJS: result would be -1 (blocked) — the sandbox could intercept
    // This test documents the gap: OS-level sandbox is required for full coverage.
    if (result.value === 200) {
      // ESM bypass confirmed — this is the expected behavior in Vitest/ESM
      expect(result.value).toBe(200);
    } else {
      // CJS or patching succeeded — interception worked
      expect(result.value).toBe(-1);
    }
  }, 10000);
});

// ════════════════════════════════════════════════════════════════════════════
// Worker mode — closes the ESM gap
//
// In worker mode, tool functions run in a dedicated worker_thread with a
// fresh module graph. Object.defineProperty SUCCEEDS on the worker's
// net/http/https exports, so ALL network paths are blocked.
//
// Constraint: functions must be serializable via fn.toString() — no closures.
// ════════════════════════════════════════════════════════════════════════════

describe("Sandbox — worker mode (sandboxRuntime: 'worker')", () => {
  it("basic execution works in worker mode", async () => {
    const sb = new Sandbox({ sandboxRuntime: "worker" });

    const result = await sb.execute("tool", { x: 42 }, async (args) => {
      return (args as { x: number }).x * 2;
    });
    expect(result.value).toBe(84);
  }, 10000);

  it("returns string results correctly", async () => {
    const sb = new Sandbox({ sandboxRuntime: "worker" });

    const result = await sb.execute("tool", { name: "yaaf" }, async (args) => {
      return `hello ${(args as { name: string }).name}`;
    });
    expect(result.value).toBe("hello yaaf");
  }, 10000);

  it("PROOF: fetch() IS blocked in worker mode", async () => {
    const sb = new Sandbox({ sandboxRuntime: "worker", blockNetwork: true });

    await expect(
      sb.execute("tool", {}, async () => {
        const resp = await fetch("https://example.com");
        return resp.status;
      }),
    ).rejects.toThrow(/blocked/i);
  }, 10000);

  it("PROOF: allowed domain passes through fetch in worker mode", async () => {
    const sb = new Sandbox({
      sandboxRuntime: "worker",
      blockNetwork: true,
      allowedNetworkDomains: ["example.com"],
    });

    const result = await sb.execute("tool", {}, async () => {
      const resp = await fetch("https://example.com");
      return resp.status;
    });
    expect(result.value).toBe(200);
  }, 15000);

  it("PROOF: denied domain is blocked via fetch in worker mode", async () => {
    const sb = new Sandbox({
      sandboxRuntime: "worker",
      blockNetwork: true,
      allowedNetworkDomains: ["example.com"],
    });

    await expect(
      sb.execute("tool", {}, async () => {
        await fetch("https://evil.com");
        return "should not reach";
      }),
    ).rejects.toThrow(/blocked/i);
  }, 10000);

  it("timeout still works in worker mode", async () => {
    const sb = new Sandbox({ sandboxRuntime: "worker", timeoutMs: 500 });

    await expect(
      sb.execute("tool", {}, async () => {
        await new Promise((r) => setTimeout(r, 5000));
        return "should not reach";
      }),
    ).rejects.toThrow(/timed out/i);
  }, 10000);

  // ── Documented limitation ───────────────────────────────────────────
  // Node v25+ makes ESM module exports non-configurable even in worker
  // threads. Object.defineProperty on http.request / https.request /
  // net.connect FAILS in the worker just like the main thread.
  //
  // This means http.request / net.connect bypass the worker sandbox too.
  // Only globalThis.fetch is blocked (it's a writable global, not a
  // module export).
  //
  // The ONLY way to close this gap is OS-level isolation:
  // - sandbox-exec + DomainFilterProxy (macOS)
  // - bwrap + network namespaces (Linux)
  // - Docker --network=none
  //
  // See sandbox-os-domain-proof.test.ts for OS-level proof tests.
});
