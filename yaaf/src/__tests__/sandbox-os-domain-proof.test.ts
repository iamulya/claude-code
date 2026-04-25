/**
 * OS-Level Sandbox — Domain Allowlist Proof Tests
 *
 * Proves that the domain allowlist ACTUALLY works end-to-end:
 * - sandbox-exec restricts network to proxy-only
 * - proxy allows traffic to allowlisted domains
 * - proxy blocks traffic to non-allowlisted domains
 *
 * Full pipeline: sandboxedExec → sandbox-exec → proxy → internet
 *
 * CRITICAL: The proxy runs in the same Node.js process. Tests that invoke
 * shell commands through the proxy MUST use async exec() (not execSync),
 * because execSync blocks the event loop and prevents the proxy from
 * accepting connections.
 */

import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { exec as execCb } from "child_process";
import { promisify } from "util";
import * as os from "os";
import * as fs from "fs";
import * as path from "path";
import * as net from "net";

import { DomainFilterProxy } from "../sandbox/os/proxy.js";
import { OsSandboxManager } from "../sandbox/os/manager.js";

const execAsync = promisify(execCb);

const isMacOS = process.platform === "darwin";

const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "yaaf-domain-proof-"));

/**
 * Async exec wrapper — MUST use this instead of execSync when the proxy
 * is running in the same process. execSync blocks the event loop.
 */
async function asyncExec(
  command: string,
  timeoutMs = 15000,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const { stdout, stderr } = await execAsync(command, { timeout: timeoutMs });
    return { stdout, stderr, exitCode: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    return {
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? "",
      exitCode: e.code ?? 1,
    };
  }
}

afterAll(() => {
  try { fs.rmSync(projectDir, { recursive: true, force: true }); } catch {}
});

// ════════════════════════════════════════════════════════════════════════════
// PROOF: Proxy allows allowed domains, blocks denied domains
// ════════════════════════════════════════════════════════════════════════════

describe("PROOF: domain proxy allows/blocks correctly at network level", () => {
  let proxy: DomainFilterProxy;
  let proxyPort: number;

  beforeAll(async () => {
    proxy = new DomainFilterProxy({
      allowedDomains: ["example.com", "httpbin.org"],
    });
    proxyPort = await proxy.start();
  });

  afterAll(async () => {
    await proxy.stop();
  });

  it("CONNECT to allowed domain (example.com) returns 200", async () => {
    const response = await new Promise<string>((resolve) => {
      const socket = net.connect(proxyPort, "127.0.0.1", () => {
        socket.write("CONNECT example.com:443 HTTP/1.1\r\nHost: example.com\r\n\r\n");
      });
      let data = "";
      socket.on("data", (chunk) => {
        data += chunk.toString();
        if (data.includes("\r\n")) {
          socket.destroy();
          resolve(data.split("\r\n")[0]!);
        }
      });
      socket.on("error", () => resolve("error"));
      socket.on("close", () => resolve(data.split("\r\n")[0] ?? "closed"));
      socket.setTimeout(5000, () => { socket.destroy(); resolve("timeout"); });
    });

    expect(response).toContain("200");
    expect(response).toContain("Connection Established");
  });

  it("CONNECT to denied domain (evil.com) returns 403", async () => {
    const response = await new Promise<string>((resolve) => {
      const socket = net.connect(proxyPort, "127.0.0.1", () => {
        socket.write("CONNECT evil.com:443 HTTP/1.1\r\nHost: evil.com\r\n\r\n");
      });
      let data = "";
      socket.on("data", (chunk) => {
        data += chunk.toString();
        if (data.includes("\r\n")) {
          socket.destroy();
          resolve(data.split("\r\n")[0]!);
        }
      });
      socket.on("error", () => resolve("error"));
      socket.on("close", () => resolve(data.split("\r\n")[0] ?? "closed"));
      socket.setTimeout(5000, () => { socket.destroy(); resolve("timeout"); });
    });

    expect(response).toContain("403");
  });

  it("CONNECT to partially-matching domain (notexample.com) returns 403", async () => {
    const response = await new Promise<string>((resolve) => {
      const socket = net.connect(proxyPort, "127.0.0.1", () => {
        socket.write("CONNECT notexample.com:443 HTTP/1.1\r\nHost: notexample.com\r\n\r\n");
      });
      let data = "";
      socket.on("data", (chunk) => {
        data += chunk.toString();
        if (data.includes("\r\n")) {
          socket.destroy();
          resolve(data.split("\r\n")[0]!);
        }
      });
      socket.on("error", () => resolve("error"));
      socket.on("close", () => resolve(data.split("\r\n")[0] ?? "closed"));
      socket.setTimeout(5000, () => { socket.destroy(); resolve("timeout"); });
    });

    expect(response).toContain("403");
  });

  it("proxy records blocked requests", async () => {
    await new Promise<void>((resolve) => {
      const socket = net.connect(proxyPort, "127.0.0.1", () => {
        socket.write("CONNECT blocked-for-logging.com:443 HTTP/1.1\r\nHost: blocked-for-logging.com\r\n\r\n");
      });
      socket.on("data", () => { socket.destroy(); resolve(); });
      socket.on("close", () => resolve());
      socket.on("error", () => resolve());
      socket.setTimeout(3000, () => { socket.destroy(); resolve(); });
    });

    const blocked = proxy.getBlockedRequests();
    expect(blocked.length).toBeGreaterThan(0);
    expect(blocked.some((r) => r.domain === "blocked-for-logging.com")).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// PROOF: Full pipeline — sandbox-exec + proxy + curl (async)
//
// IMPORTANT: These tests use asyncExec (not execSync) because the proxy
// runs in the same Node.js process. execSync would block the event loop,
// preventing the proxy from processing connections.
// ════════════════════════════════════════════════════════════════════════════

describe.skipIf(!isMacOS)("PROOF: full pipeline — sandbox + proxy + curl (macOS)", () => {
  it("curl to ALLOWED domain via auto-proxy SUCCEEDS", async () => {
    const mgr = new OsSandboxManager({
      projectDir,
      allowedDomains: ["example.com"],
    });

    // wrapCommand auto-injects HTTP_PROXY/HTTPS_PROXY and restricts
    // network to localhost:proxyPort via sandbox-exec
    const cmd = await mgr.wrapCommand(
      "curl -s --connect-timeout 5 --max-time 10 https://example.com",
    );

    // MUST use async exec — proxy runs in same event loop
    const result = await asyncExec(cmd);

    // Should succeed — proxy allows example.com and relays traffic
    expect(result.stdout).toContain("Example Domain");

    await mgr.dispose();
  }, 20000);

  it("curl to DENIED domain via auto-proxy is BLOCKED", async () => {
    const mgr = new OsSandboxManager({
      projectDir,
      allowedDomains: ["example.com"],
    });

    // curl to a non-allowlisted domain — proxy returns 403
    const cmd = await mgr.wrapCommand(
      "curl -s --connect-timeout 5 --max-time 10 https://google.com 2>&1; echo EXIT:$?",
    );

    const result = await asyncExec(cmd);

    // Should NOT contain the actual Google homepage
    expect(result.stdout).not.toContain("<title>Google</title>");
    // Proxy should have recorded the block
    const proxy = mgr.getProxy();
    expect(proxy).toBeDefined();
    const blocked = proxy!.getBlockedRequests();
    expect(blocked.some((r) => r.domain === "google.com")).toBe(true);

    await mgr.dispose();
  }, 20000);

  it("direct network access (bypassing proxy env) is BLOCKED by sandbox-exec", async () => {
    const mgr = new OsSandboxManager({
      projectDir,
      allowedDomains: ["example.com"],
    });

    // Use --noproxy '*' to bypass the auto-injected HTTP_PROXY env
    // sandbox-exec blocks ALL outbound except localhost:proxyPort
    const cmd = await mgr.wrapCommand(
      "curl -s --noproxy '*' --connect-timeout 3 --max-time 5 https://example.com 2>&1; echo EXIT:$?",
    );

    const result = await asyncExec(cmd);

    // Should fail — sandbox-exec blocks direct outbound
    expect(result.stdout).toContain("EXIT:");
    const exitMatch = result.stdout.match(/EXIT:(\d+)/);
    if (exitMatch) {
      expect(parseInt(exitMatch[1]!, 10)).not.toBe(0);
    }
    // Should NOT contain the actual page
    expect(result.stdout).not.toContain("Example Domain");

    await mgr.dispose();
  }, 15000);
});
