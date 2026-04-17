/**
 * FirecrackerSandboxBackend — interface contract + Sandbox routing tests.
 *
 * These tests verify:
 * FC1 SandboxExternalBackend interface is exported and structurally correct
 * FC2 Sandbox routes to backend when sandboxRuntime='external'
 * FC3 Sandbox throws a clear error when runtime='external' but no backend is set
 * FC4 setBackend() allows late injection of the backend
 * FC5 FirecrackerSandboxBackend class implements SandboxExternalBackend
 * FC6 FirecrackerSandboxBackend.initialize() throws on non-Linux (no /dev/kvm)
 * FC7 FirecrackerSandboxBackend extends PluginBase (pluggable lifecycle)
 * FC8 'sandbox_backend' is a valid PluginCapability
 *
 * NOTE: Tests that need actual Firecracker (FC6) are skipped on non-Linux hosts.
 * All other tests use a mock backend — no /dev/kvm required.
 */

import { describe, it, expect, vi } from "vitest";
import { Sandbox, type SandboxExternalBackend } from "../sandbox.js";
import { FirecrackerSandboxBackend } from "../integrations/sandbox.firecracker.js";
import { PluginBase } from "../plugin/base.js";
import type { PluginCapability } from "../plugin/types.js";

// ── Mock backend ───────────────────────────────────────────────────────────────

/** Minimal in-process mock that satisfies SandboxExternalBackend. */
class MockSandboxBackend implements SandboxExternalBackend {
  readonly calls: Array<{ toolName: string; fnSrc: string; args: Record<string, unknown> }> = [];
  private _result: unknown = "mock-result";
  private _shouldThrow: Error | null = null;

  setResult(v: unknown) {
    this._result = v;
  }
  setThrow(e: Error) {
    this._shouldThrow = e;
  }

  async execute<T>(toolName: string, fnSrc: string, args: Record<string, unknown>): Promise<T> {
    this.calls.push({ toolName, fnSrc, args });
    if (this._shouldThrow) throw this._shouldThrow;
    return this._result as T;
  }

  async dispose() {}
}

// ── FC1: SandboxExternalBackend interface ──────────────────────────────────────

describe("FC1: SandboxExternalBackend — interface contract", () => {
  it("is satisfied by an object with execute() and dispose()", () => {
    const backend: SandboxExternalBackend = new MockSandboxBackend();
    expect(typeof backend.execute).toBe("function");
    expect(typeof backend.dispose).toBe("function");
  });

  it("execute() accepts toolName, fnSrc, args and returns a Promise", async () => {
    const backend = new MockSandboxBackend();
    backend.setResult(42);
    const result = await backend.execute<number>("test", "async (args) => args.x", { x: 21 });
    expect(result).toBe(42);
  });
});

// ── FC2: Sandbox routing with external backend ─────────────────────────────────

describe("FC2: Sandbox routes execute() to backend when sandboxRuntime=external", () => {
  it("delegates to backend.execute() and returns SandboxResult", async () => {
    const backend = new MockSandboxBackend();
    backend.setResult({ answer: 42 });

    const sandbox = new Sandbox({ sandboxRuntime: "external", sandboxBackend: backend });
    const result = await sandbox.execute("myTool", { x: 21 }, async (args) => ({
      answer: (args["x"] as number) * 2,
    }));

    expect(result.value).toEqual({ answer: 42 });
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(backend.calls).toHaveLength(1);
    expect(backend.calls[0]!.toolName).toBe("myTool");
  });

  it("passes serialized fnSrc to the backend (fn.toString())", async () => {
    const backend = new MockSandboxBackend();
    backend.setResult(null);

    const sandbox = new Sandbox({ sandboxRuntime: "external", sandboxBackend: backend });
    const myFn = async (args: Record<string, unknown>) => String(args["x"]);
    await sandbox.execute("serialize-test", { x: 1 }, myFn);

    expect(backend.calls[0]!.fnSrc).toContain("String(args");
  });

  it("passes only JSON-serializable args to the backend (strips non-serializable)", async () => {
    const backend = new MockSandboxBackend();
    backend.setResult(null);

    const sandbox = new Sandbox({ sandboxRuntime: "external", sandboxBackend: backend });
    const args = { x: 1, fn: () => {} }; // fn is not JSON-serializable
    await sandbox.execute("strip-test", args as never, async () => null);

    const sentArgs = backend.calls[0]!.args;
    expect(sentArgs["x"]).toBe(1);
    expect("fn" in sentArgs).toBe(false);
  });

  it("propagates errors thrown by the backend", async () => {
    const backend = new MockSandboxBackend();
    backend.setThrow(new Error("backend failure"));

    const sandbox = new Sandbox({ sandboxRuntime: "external", sandboxBackend: backend });
    await expect(sandbox.execute("fail-tool", {}, async () => null)).rejects.toThrow(
      "backend failure",
    );
  });

  it("increments callCount on each execute()", async () => {
    const backend = new MockSandboxBackend();
    backend.setResult(null);
    const sandbox = new Sandbox({ sandboxRuntime: "external", sandboxBackend: backend });

    await sandbox.execute("a", {}, async () => null);
    await sandbox.execute("b", {}, async () => null);
    expect(sandbox.stats().callCount).toBe(2);
  });
});

// ── FC3: Error when backend not configured ─────────────────────────────────────

describe("FC3: Sandbox throws when sandboxRuntime=external but no backend", () => {
  it("throws a descriptive error immediately", async () => {
    const sandbox = new Sandbox({ sandboxRuntime: "external" });
    await expect(sandbox.execute("no-backend", {}, async () => null)).rejects.toThrow(
      /sandboxRuntime.*external.*sandboxBackend/,
    );
  });
});

// ── FC4: setBackend() late injection ──────────────────────────────────────────

describe("FC4: setBackend() allows injecting the backend after construction", () => {
  it("works when backend is set before first execute()", async () => {
    const sandbox = new Sandbox({ sandboxRuntime: "external" });
    const backend = new MockSandboxBackend();
    backend.setResult("late-injection");

    sandbox.setBackend(backend);
    const result = await sandbox.execute("late", {}, async () => "x");
    expect(result.value).toBe("late-injection");
  });

  it("replaces an existing backend", async () => {
    const backend1 = new MockSandboxBackend();
    backend1.setResult("one");
    const backend2 = new MockSandboxBackend();
    backend2.setResult("two");

    const sandbox = new Sandbox({ sandboxRuntime: "external", sandboxBackend: backend1 });
    await sandbox.execute("first", {}, async () => null);
    expect(backend1.calls).toHaveLength(1);

    sandbox.setBackend(backend2);
    await sandbox.execute("second", {}, async () => null);
    expect(backend2.calls).toHaveLength(1);
    expect(backend1.calls).toHaveLength(1); // not called again
  });
});

// ── FC5: FirecrackerSandboxBackend implements SandboxExternalBackend ──────────

describe("FC5: FirecrackerSandboxBackend class shape", () => {
  it("satisfies SandboxExternalBackend structurally", () => {
    const backend = new FirecrackerSandboxBackend({
      kernelImagePath: "/fake/vmlinux.bin",
      rootfsImagePath: "/fake/rootfs.ext4",
    });
    const typed: SandboxExternalBackend = backend; // compile-time check
    expect(typeof typed.execute).toBe("function");
    expect(typeof typed.dispose).toBe("function");
  });

  it("has the correct sandboxRuntime config option documented", () => {
    // TypeScript compile-time check — if this line compiles, the type is correct
    const _cfg: Parameters<typeof Sandbox>[0] = {
      sandboxRuntime: "external",
      sandboxBackend: new MockSandboxBackend(),
    };
    expect(_cfg.sandboxRuntime).toBe("external");
  });
});

// ── FC6: FirecrackerSandboxBackend.initialize() prerequisite check ─────────────

const isLinux = process.platform === "linux";

describe("FC6: FirecrackerSandboxBackend.initialize() pre-flight", () => {
  it.skipIf(isLinux)("throws on non-Linux (no /dev/kvm)", async () => {
    const backend = new FirecrackerSandboxBackend({
      kernelImagePath: "/fake/vmlinux.bin",
      rootfsImagePath: "/fake/rootfs.ext4",
      poolSize: 0, // don't try to boot VMs
    });
    await expect(backend.initialize()).rejects.toThrow(/\/dev\/kvm/);
  });

  it.skipIf(!isLinux)(
    "throws on Linux when /dev/kvm is inaccessible (no kernel support)",
    async () => {
      // This test is skipped unless the runner has KVM access.
      // It documents the expected error message.
      const backend = new FirecrackerSandboxBackend({
        kernelImagePath: "/nonexistent/vmlinux.bin",
        rootfsImagePath: "/nonexistent/rootfs.ext4",
        poolSize: 0,
      });
      await expect(backend.initialize()).rejects.toThrow(
        /\/dev\/kvm|kernelImagePath|rootfsImagePath/,
      );
    },
  );
});

// ── FC7: FirecrackerSandboxBackend extends PluginBase ─────────────────────────

describe("FC7: FirecrackerSandboxBackend extends PluginBase", () => {
  it("is an instance of PluginBase", () => {
    const backend = new FirecrackerSandboxBackend({
      kernelImagePath: "/fake/vmlinux.bin",
      rootfsImagePath: "/fake/rootfs.ext4",
    });
    expect(backend).toBeInstanceOf(PluginBase);
  });

  it("declares sandbox_backend capability", () => {
    const backend = new FirecrackerSandboxBackend({
      kernelImagePath: "/fake/vmlinux.bin",
      rootfsImagePath: "/fake/rootfs.ext4",
    });
    expect(backend.capabilities).toContain("sandbox_backend");
  });

  it("has healthCheck() returning false before initialize()", async () => {
    const backend = new FirecrackerSandboxBackend({
      kernelImagePath: "/fake/vmlinux.bin",
      rootfsImagePath: "/fake/rootfs.ext4",
    });
    expect(await backend.healthCheck()).toBe(false);
  });
});

// ── FC8: 'sandbox_backend' is a valid PluginCapability ────────────────────────

describe("FC8: sandbox_backend is a valid PluginCapability", () => {
  it("compiles as a PluginCapability literal", () => {
    const cap: PluginCapability = "sandbox_backend";
    expect(cap).toBe("sandbox_backend");
  });

  it("is declared in FirecrackerSandboxBackend.capabilities", () => {
    const backend = new FirecrackerSandboxBackend({
      kernelImagePath: "/fake/vmlinux.bin",
      rootfsImagePath: "/fake/rootfs.ext4",
    });
    const caps: readonly PluginCapability[] = backend.capabilities;
    expect(caps).toContain("sandbox_backend");
  });
});
