/**
 * OS-Level Sandbox — Test Suite
 *
 * Tests for the kernel-enforced process isolation layer.
 * Covers: shell quoting, backend command generation, platform detection,
 * domain proxy filtering, and manager orchestration.
 *
 * These tests verify command GENERATION (the wrapped command strings),
 * not execution — actual sandbox execution requires platform-specific
 * binaries (bwrap, sandbox-exec, docker) that may not be available in CI.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ════════════════════════════════════════════════════════════════════════════
// Shell quoting
// ════════════════════════════════════════════════════════════════════════════

import { shellQuote, shellEscapeInSingleQuotes } from "../sandbox/os/shellQuote.js";

describe("shellQuote", () => {
  it("wraps simple strings in single quotes", () => {
    expect(shellQuote("hello")).toBe("'hello'");
  });

  it("handles empty string", () => {
    expect(shellQuote("")).toBe("''");
  });

  it("escapes embedded single quotes", () => {
    expect(shellQuote("it's")).toBe("'it'\\''s'");
  });

  it("handles multiple single quotes", () => {
    expect(shellQuote("a'b'c")).toBe("'a'\\''b'\\''c'");
  });

  it("preserves spaces and special chars (inside single quotes they're literal)", () => {
    expect(shellQuote("hello world $HOME `cmd`")).toBe("'hello world $HOME `cmd`'");
  });

  it("handles path-like strings", () => {
    expect(shellQuote("/home/user/my project")).toBe("'/home/user/my project'");
  });

  it("prevents shell injection via semicolons", () => {
    const malicious = "echo safe; rm -rf /";
    const quoted = shellQuote(malicious);
    // Inside single quotes, everything is literal
    expect(quoted).toBe("'echo safe; rm -rf /'");
  });

  it("prevents shell injection via backticks", () => {
    const malicious = "echo `whoami`";
    const quoted = shellQuote(malicious);
    expect(quoted).toBe("'echo `whoami`'");
  });

  it("prevents shell injection via $(...)", () => {
    const malicious = "echo $(cat /etc/passwd)";
    const quoted = shellQuote(malicious);
    expect(quoted).toBe("'echo $(cat /etc/passwd)'");
  });
});

describe("shellEscapeInSingleQuotes", () => {
  it("escapes single quotes for inclusion in an already-quoted context", () => {
    expect(shellEscapeInSingleQuotes("it's")).toBe("it'\\''s");
  });

  it("leaves strings without single quotes unchanged", () => {
    expect(shellEscapeInSingleQuotes("hello world")).toBe("hello world");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Default blocked paths
// ════════════════════════════════════════════════════════════════════════════

import { getDefaultBlockedPaths } from "../sandbox/os/types.js";

describe("getDefaultBlockedPaths", () => {
  it("returns an array of path strings", () => {
    const paths = getDefaultBlockedPaths("/home/testuser");
    expect(paths).toBeInstanceOf(Array);
    expect(paths.length).toBeGreaterThan(10);
  });

  it("includes SSH keys", () => {
    const paths = getDefaultBlockedPaths("/home/testuser");
    expect(paths).toContain("/home/testuser/.ssh");
  });

  it("includes AWS credentials", () => {
    const paths = getDefaultBlockedPaths("/home/testuser");
    expect(paths).toContain("/home/testuser/.aws/credentials");
  });

  it("includes shell config files", () => {
    const paths = getDefaultBlockedPaths("/home/testuser");
    expect(paths).toContain("/home/testuser/.bashrc");
    expect(paths).toContain("/home/testuser/.zshrc");
  });

  it("includes git config", () => {
    const paths = getDefaultBlockedPaths("/home/testuser");
    expect(paths).toContain("/home/testuser/.gitconfig");
  });

  it("uses provided homedir, not process.env.HOME", () => {
    const paths = getDefaultBlockedPaths("/custom/home");
    expect(paths.every((p) => p.startsWith("/custom/home"))).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Bwrap backend
// ════════════════════════════════════════════════════════════════════════════

import { BwrapBackend } from "../sandbox/os/backends/bwrap.js";

describe("BwrapBackend", () => {
  const backend = new BwrapBackend();

  it("has name 'bwrap'", () => {
    expect(backend.name).toBe("bwrap");
  });

  it("wraps a simple command", () => {
    const cmd = backend.wrapCommand("echo hello", "/bin/sh", {
      projectDir: "/home/user/project",
    });
    expect(cmd).toContain("'bwrap'");
    expect(cmd).toContain("'echo hello'");
    expect(cmd).toContain("'/bin/sh'");
  });

  it("mounts root filesystem read-only", () => {
    const cmd = backend.wrapCommand("ls", "/bin/sh", {
      projectDir: "/project",
    });
    expect(cmd).toContain("'--ro-bind'");
    // The root bind: --ro-bind / /
    expect(cmd).toMatch(/'--ro-bind'\s+'\/'\s+'\/'/);
  });

  it("mounts project dir writable", () => {
    const cmd = backend.wrapCommand("ls", "/bin/sh", {
      projectDir: "/home/user/myproject",
    });
    expect(cmd).toContain("'--bind'");
    const bindPattern = /'--bind'\s+'\/home\/user\/myproject'\s+'\/home\/user\/myproject'/;
    expect(cmd).toMatch(bindPattern);
  });

  it("unshares PID namespace", () => {
    const cmd = backend.wrapCommand("ls", "/bin/sh", {
      projectDir: "/project",
    });
    expect(cmd).toContain("'--unshare-pid'");
  });

  it("unshares network when blockNetwork is true", () => {
    const cmd = backend.wrapCommand("ls", "/bin/sh", {
      projectDir: "/project",
      blockNetwork: true,
    });
    expect(cmd).toContain("'--unshare-net'");
  });

  it("does not unshare network when blockNetwork is false and no proxy", () => {
    const cmd = backend.wrapCommand("ls", "/bin/sh", {
      projectDir: "/project",
      blockNetwork: false,
    });
    expect(cmd).not.toContain("'--unshare-net'");
  });

  it("unshares network when proxy port is set", () => {
    const cmd = backend.wrapCommand("ls", "/bin/sh", {
      projectDir: "/project",
      proxyPort: 12345,
    });
    expect(cmd).toContain("'--unshare-net'");
  });

  it("injects HTTP_PROXY env vars when proxy port is set", () => {
    const cmd = backend.wrapCommand("ls", "/bin/sh", {
      projectDir: "/project",
      proxyPort: 12345,
    });
    expect(cmd).toContain("'HTTP_PROXY'");
    expect(cmd).toContain("'http://127.0.0.1:12345'");
    expect(cmd).toContain("'HTTPS_PROXY'");
  });

  it("mounts /tmp writable", () => {
    const cmd = backend.wrapCommand("ls", "/bin/sh", {
      projectDir: "/project",
    });
    const tmpPattern = /'--bind'\s+'\/tmp'\s+'\/tmp'/;
    expect(cmd).toMatch(tmpPattern);
  });

  it("supports additional writable paths", () => {
    const cmd = backend.wrapCommand("ls", "/bin/sh", {
      projectDir: "/project",
      writablePaths: ["/data/output", "/var/cache"],
    });
    expect(cmd).toContain("'/data/output'");
    expect(cmd).toContain("'/var/cache'");
  });

  it("blocks default dangerous paths with --ro-bind-try", () => {
    const cmd = backend.wrapCommand("ls", "/bin/sh", {
      projectDir: "/project",
    });
    expect(cmd).toContain("'--ro-bind-try'");
    expect(cmd).toContain("'/dev/null'");
  });

  it("uses custom blocked paths when provided", () => {
    const cmd = backend.wrapCommand("ls", "/bin/sh", {
      projectDir: "/project",
      blockedPaths: ["/custom/secret"],
    });
    expect(cmd).toContain("'/custom/secret'");
  });

  it("uses custom bwrap path", () => {
    const cmd = backend.wrapCommand("ls", "/bin/sh", {
      projectDir: "/project",
      bwrapPath: "/usr/local/bin/bwrap",
    });
    expect(cmd).toContain("'/usr/local/bin/bwrap'");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// SandboxExec backend
// ════════════════════════════════════════════════════════════════════════════

import { SandboxExecBackend } from "../sandbox/os/backends/sandboxExec.js";

describe("SandboxExecBackend", () => {
  const backend = new SandboxExecBackend();

  it("has name 'sandbox-exec'", () => {
    expect(backend.name).toBe("sandbox-exec");
  });

  it("wraps a command with sandbox-exec -p", () => {
    const cmd = backend.wrapCommand("echo hello", "/bin/sh", {
      projectDir: "/Users/dev/project",
    });
    expect(cmd).toContain("sandbox-exec -p");
    expect(cmd).toContain("echo hello");
  });

  it("includes SBPL version header", () => {
    const cmd = backend.wrapCommand("ls", "/bin/sh", {
      projectDir: "/project",
    });
    expect(cmd).toContain("(version 1)");
  });

  it("includes deny default (fail-closed)", () => {
    const cmd = backend.wrapCommand("ls", "/bin/sh", {
      projectDir: "/project",
    });
    expect(cmd).toContain("(deny default)");
  });

  it("allows file-read* globally", () => {
    const cmd = backend.wrapCommand("ls", "/bin/sh", {
      projectDir: "/project",
    });
    expect(cmd).toContain("(allow file-read*)");
  });

  it("allows file-write* only to project dir and /tmp", () => {
    const cmd = backend.wrapCommand("ls", "/bin/sh", {
      projectDir: "/Users/dev/myapp",
    });
    expect(cmd).toContain('(allow file-write* (subpath "/Users/dev/myapp"))');
    expect(cmd).toContain('(allow file-write* (subpath "/tmp"))');
  });

  it("denies all network when blockNetwork is true", () => {
    const cmd = backend.wrapCommand("ls", "/bin/sh", {
      projectDir: "/project",
      blockNetwork: true,
    });
    expect(cmd).toContain("(deny network*)");
  });

  it("allows only proxy port when proxyPort is set", () => {
    const cmd = backend.wrapCommand("ls", "/bin/sh", {
      projectDir: "/project",
      proxyPort: 54321,
    });
    expect(cmd).toContain("(deny network-outbound)");
    expect(cmd).toContain('(allow network-outbound (remote tcp "localhost:54321"))');
  });

  it("allows all network when no restriction set", () => {
    const cmd = backend.wrapCommand("ls", "/bin/sh", {
      projectDir: "/project",
      blockNetwork: false,
    });
    expect(cmd).toContain("(allow network*)");
  });

  it("allows process execution", () => {
    const cmd = backend.wrapCommand("ls", "/bin/sh", {
      projectDir: "/project",
    });
    expect(cmd).toContain("(allow process-exec)");
    expect(cmd).toContain("(allow process-fork)");
  });

  it("denies reading blocked paths", () => {
    const cmd = backend.wrapCommand("ls", "/bin/sh", {
      projectDir: "/project",
      blockedPaths: ["/Users/dev/.ssh"],
    });
    expect(cmd).toContain('(deny file-read* (subpath "/Users/dev/.ssh"))');
  });

  it("includes additional writable paths", () => {
    const cmd = backend.wrapCommand("ls", "/bin/sh", {
      projectDir: "/project",
      writablePaths: ["/data/output"],
    });
    expect(cmd).toContain('(allow file-write* (subpath "/data/output"))');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Docker backend
// ════════════════════════════════════════════════════════════════════════════

import { DockerBackend } from "../sandbox/os/backends/docker.js";

describe("DockerBackend", () => {
  it("has the runtime name", () => {
    expect(new DockerBackend().name).toBe("docker");
    expect(new DockerBackend("podman").name).toBe("podman");
  });

  it("wraps a command with docker run --rm --read-only", () => {
    const backend = new DockerBackend();
    const cmd = backend.wrapCommand("echo hello", "/bin/sh", {
      projectDir: "/project",
    });
    expect(cmd).toContain("'docker'");
    expect(cmd).toContain("'run'");
    expect(cmd).toContain("'--rm'");
    expect(cmd).toContain("'--read-only'");
  });

  it("mounts project dir writable", () => {
    const backend = new DockerBackend();
    const cmd = backend.wrapCommand("ls", "/bin/sh", {
      projectDir: "/home/user/project",
    });
    expect(cmd).toContain("'/home/user/project:/home/user/project:rw'");
  });

  it("uses --network=none when blockNetwork is true", () => {
    const backend = new DockerBackend();
    const cmd = backend.wrapCommand("ls", "/bin/sh", {
      projectDir: "/project",
      blockNetwork: true,
    });
    expect(cmd).toContain("'--network=none'");
  });

  it("drops all capabilities", () => {
    const backend = new DockerBackend();
    const cmd = backend.wrapCommand("ls", "/bin/sh", {
      projectDir: "/project",
    });
    expect(cmd).toContain("'--cap-drop=ALL'");
  });

  it("prevents privilege escalation", () => {
    const backend = new DockerBackend();
    const cmd = backend.wrapCommand("ls", "/bin/sh", {
      projectDir: "/project",
    });
    expect(cmd).toContain("'--security-opt=no-new-privileges'");
  });

  it("sets memory and CPU limits", () => {
    const backend = new DockerBackend();
    const cmd = backend.wrapCommand("ls", "/bin/sh", {
      projectDir: "/project",
    });
    expect(cmd).toContain("'--memory=512m'");
    expect(cmd).toContain("'--cpus=2'");
  });

  it("uses custom container runtime", () => {
    const backend = new DockerBackend("podman");
    const cmd = backend.wrapCommand("ls", "/bin/sh", {
      projectDir: "/project",
    });
    expect(cmd).toContain("'podman'");
    expect(cmd).not.toContain("'docker'");
  });

  it("uses custom image", () => {
    const backend = new DockerBackend("docker", "alpine:latest");
    const cmd = backend.wrapCommand("ls", "/bin/sh", {
      projectDir: "/project",
    });
    expect(cmd).toContain("'alpine:latest'");
  });

  it("mounts additional writable paths", () => {
    const backend = new DockerBackend();
    const cmd = backend.wrapCommand("ls", "/bin/sh", {
      projectDir: "/project",
      writablePaths: ["/data/output"],
    });
    expect(cmd).toContain("'/data/output:/data/output:rw'");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Domain filter proxy
// ════════════════════════════════════════════════════════════════════════════

import { DomainFilterProxy } from "../sandbox/os/proxy.js";

describe("DomainFilterProxy — domain matching", () => {
  it("allows exact domain match", () => {
    const proxy = new DomainFilterProxy({
      allowedDomains: ["api.openai.com"],
    });
    expect(proxy.isDomainAllowed("api.openai.com")).toBe(true);
  });

  it("blocks domain not in allowlist", () => {
    const proxy = new DomainFilterProxy({
      allowedDomains: ["api.openai.com"],
    });
    expect(proxy.isDomainAllowed("evil.com")).toBe(false);
  });

  it("is case-insensitive", () => {
    const proxy = new DomainFilterProxy({
      allowedDomains: ["API.OpenAI.com"],
    });
    expect(proxy.isDomainAllowed("api.openai.com")).toBe(true);
  });

  it("supports dot-prefix wildcard (.example.com)", () => {
    const proxy = new DomainFilterProxy({
      allowedDomains: [".example.com"],
    });
    expect(proxy.isDomainAllowed("sub.example.com")).toBe(true);
    expect(proxy.isDomainAllowed("deep.sub.example.com")).toBe(true);
    expect(proxy.isDomainAllowed("example.com")).toBe(false); // dot-prefix doesn't match root
  });

  it("supports star-wildcard (*.example.com)", () => {
    const proxy = new DomainFilterProxy({
      allowedDomains: ["*.example.com"],
    });
    expect(proxy.isDomainAllowed("sub.example.com")).toBe(true);
    expect(proxy.isDomainAllowed("a.b.example.com")).toBe(true);
    expect(proxy.isDomainAllowed("example.com")).toBe(false);
  });

  it("blocks all when allowlist is empty", () => {
    const proxy = new DomainFilterProxy({
      allowedDomains: [],
    });
    expect(proxy.isDomainAllowed("google.com")).toBe(false);
    expect(proxy.isDomainAllowed("localhost")).toBe(false);
  });

  it("denylist takes precedence over allowlist", () => {
    const proxy = new DomainFilterProxy({
      allowedDomains: ["*.example.com"],
      deniedDomains: ["evil.example.com"],
    });
    expect(proxy.isDomainAllowed("good.example.com")).toBe(true);
    expect(proxy.isDomainAllowed("evil.example.com")).toBe(false);
  });

  it("denylist supports wildcards", () => {
    const proxy = new DomainFilterProxy({
      allowedDomains: ["*.example.com"],
      deniedDomains: [".internal.example.com"],
    });
    expect(proxy.isDomainAllowed("public.example.com")).toBe(true);
    expect(proxy.isDomainAllowed("secret.internal.example.com")).toBe(false);
  });
});

describe("DomainFilterProxy — lifecycle", () => {
  let proxy: DomainFilterProxy;

  afterEach(async () => {
    if (proxy) await proxy.stop();
  });

  it("starts on a random port", async () => {
    proxy = new DomainFilterProxy({ allowedDomains: ["example.com"] });
    const port = await proxy.start();
    expect(port).toBeGreaterThan(0);
    expect(port).toBeLessThan(65536);
    expect(proxy.getPort()).toBe(port);
  });

  it("port is 0 before start", () => {
    proxy = new DomainFilterProxy({ allowedDomains: [] });
    expect(proxy.getPort()).toBe(0);
  });

  it("port is 0 after stop", async () => {
    proxy = new DomainFilterProxy({ allowedDomains: [] });
    await proxy.start();
    await proxy.stop();
    expect(proxy.getPort()).toBe(0);
  });

  it("tracks blocked requests", () => {
    proxy = new DomainFilterProxy({ allowedDomains: ["good.com"] });
    // isDomainAllowed doesn't track — only actual proxy requests do
    expect(proxy.getBlockedRequests()).toHaveLength(0);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// OsSandboxManager
// ════════════════════════════════════════════════════════════════════════════

import { OsSandboxManager } from "../sandbox/os/manager.js";

describe("OsSandboxManager", () => {
  it("creates an instance with config", () => {
    const mgr = new OsSandboxManager({
      projectDir: "/project",
    });
    expect(mgr).toBeInstanceOf(OsSandboxManager);
  });

  it("detects platform capabilities", async () => {
    const mgr = new OsSandboxManager({
      projectDir: "/project",
    });
    const caps = await mgr.detect();
    expect(caps.platform).toBeDefined();
    expect(caps.availableBackends).toBeInstanceOf(Array);
    expect(caps.warnings).toBeInstanceOf(Array);
  });

  it("isAvailable returns a boolean", async () => {
    const mgr = new OsSandboxManager({
      projectDir: "/project",
    });
    const available = await mgr.isAvailable();
    expect(typeof available).toBe("boolean");
  });

  it("wrapCommand returns a string", async () => {
    const mgr = new OsSandboxManager({
      projectDir: "/project",
    });
    // Even if no backend is available, it should return the original command
    const wrapped = await mgr.wrapCommand("echo hello");
    expect(typeof wrapped).toBe("string");
    expect(wrapped).toContain("echo hello");
  });

  it("throws with failIfUnavailable when no backend", async () => {
    const mgr = new OsSandboxManager({
      projectDir: "/project",
      failIfUnavailable: true,
      // Use a non-existent bwrap path and container runtime to force no backends
      bwrapPath: "/nonexistent/bwrap12345",
      containerRuntime: "/nonexistent/docker12345",
    });

    // This test only works on platforms where sandbox-exec is also not available.
    // We detect and skip on macOS where sandbox-exec is always present.
    const caps = await mgr.detect();
    if (caps.selectedBackend) {
      // A backend IS available (e.g. on macOS with sandbox-exec), so wrapCommand won't throw
      const result = await mgr.wrapCommand("echo test");
      expect(result).toContain("echo test");
    } else {
      // No backend — should throw
      await expect(mgr.wrapCommand("echo test")).rejects.toThrow(
        /No OS-level sandbox backend available/,
      );
    }
  });

  it("caches detection results", async () => {
    const mgr = new OsSandboxManager({
      projectDir: "/project",
    });
    const caps1 = await mgr.detect();
    const caps2 = await mgr.detect();
    // Same object reference (cached)
    expect(caps1).toBe(caps2);
  });

  it("dispose is safe to call multiple times", async () => {
    const mgr = new OsSandboxManager({
      projectDir: "/project",
    });
    await mgr.dispose();
    await mgr.dispose(); // No error
  });

  it("getProxy returns undefined before any proxy-needing wrapCommand", async () => {
    const mgr = new OsSandboxManager({
      projectDir: "/project",
    });
    expect(mgr.getProxy()).toBeUndefined();
    await mgr.dispose();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Barrel exports
// ════════════════════════════════════════════════════════════════════════════

describe("barrel exports", () => {
  it("exports all public API from index", async () => {
    const mod = await import("../sandbox/os/index.js");
    expect(mod.OsSandboxManager).toBeDefined();
    expect(mod.DomainFilterProxy).toBeDefined();
    expect(mod.detectPlatformCapabilities).toBeDefined();
    expect(mod.BwrapBackend).toBeDefined();
    expect(mod.SandboxExecBackend).toBeDefined();
    expect(mod.SandboxInitBackend).toBeDefined();
    expect(mod.DockerBackend).toBeDefined();
    expect(mod.LandlockBackend).toBeDefined();
    expect(mod.shellQuote).toBeDefined();
    expect(mod.getDefaultBlockedPaths).toBeDefined();
    expect(mod.isLandlockAvailable).toBeDefined();
  });
});
