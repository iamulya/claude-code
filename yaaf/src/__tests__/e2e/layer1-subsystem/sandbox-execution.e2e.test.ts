/**
 * L1-09: Sandbox Execution E2E
 *
 * Tests real wiring between Sandbox and tool execution.
 * Note: On macOS, Sandbox runs tools inline (not Firecracker/worker).
 */

import { describe, it, expect } from "vitest";
import {
  Sandbox,
  timeoutSandbox,
  strictSandbox,
  projectSandbox,
  SandboxError,
} from "../../../sandbox.js";
import { createTestDir } from "../_fixtures/helpers.js";
import { afterEach } from "vitest";

describe("L1-09: Sandbox Execution E2E", () => {
  let cleanup: () => void;

  afterEach(() => cleanup?.());

  it("timeoutSandbox() → tool runs within timeout and returns result", async () => {
    const sandbox = timeoutSandbox(5_000);

    const result = await sandbox.execute<{ computed: number }>(
      "fast_compute",
      {},
      async () => ({ computed: 42 }),
    );
    expect(result.value.computed).toBe(42);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("timeoutSandbox() → long-running tool is killed", async () => {
    const sandbox = timeoutSandbox(100); // 100ms timeout

    await expect(
      sandbox.execute(
        "slow_compute",
        {},
        async () => {
          await new Promise((r) => setTimeout(r, 10_000)); // 10s
          return "should not reach";
        },
      ),
    ).rejects.toThrow(/timed out/);
  });

  it("strictSandbox() creates a path-restricted sandbox", () => {
    let dir: string;
    ({ dir, cleanup } = createTestDir());
    const sandbox = strictSandbox(dir, { timeoutMs: 5_000 });
    expect(sandbox).toBeDefined();

    // validate() checks args for path violations without executing
    const violation = sandbox.validate("test_tool", {
      file: "../../etc/passwd",
    });
    // Should detect the path traversal attempt
    expect(violation).not.toBeNull();
  });

  it("strictSandbox() allows paths within root dir", () => {
    let dir: string;
    ({ dir, cleanup } = createTestDir());
    const sandbox = strictSandbox(dir, { timeoutMs: 5_000 });

    // Path within the allowed directory — uses raw dir path.
    // Production normalizePath now resolves symlinks consistently for
    // non-existing paths by walking up to the closest existing ancestor.
    const ok = sandbox.validate("test_tool", {
      file: `${dir}/src/index.ts`,
    });
    expect(ok).toBeNull(); // No violation
  });

  it("projectSandbox() creates a project-scoped sandbox", () => {
    let dir: string;
    ({ dir, cleanup } = createTestDir());
    const sandbox = projectSandbox(dir, { timeoutMs: 5_000 });
    expect(sandbox).toBeDefined();
  });

  it("Sandbox tracks execution stats", async () => {
    const sandbox = timeoutSandbox(5_000);

    await sandbox.execute("tool1", {}, async () => "result1");
    await sandbox.execute("tool2", {}, async () => "result2");

    const s = sandbox.stats();
    expect(s.callCount).toBe(2);
    expect(s.totalDurationMs).toBeGreaterThanOrEqual(0);
  });

  it("Sandbox network blocking rejects URLs in arguments", async () => {
    const sandbox = new Sandbox({
      blockNetwork: true,
      timeoutMs: 5_000,
    });

    // Try to execute a tool that has a URL in its args
    await expect(
      sandbox.execute(
        "web_tool",
        { url: "https://evil.example.com/data" },
        async () => "should not reach",
      ),
    ).rejects.toThrow(/blocked/i);
  });
});
