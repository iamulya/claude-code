/**
 * Shared test helpers for E2E tests.
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AgentRunner, RunnerEvents } from "../../../agents/runner.js";

/**
 * Create a temporary directory for test isolation.
 * Returns { dir, cleanup }.
 */
export function createTestDir(prefix = "yaaf-e2e-"): {
  dir: string;
  cleanup: () => void;
} {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  return {
    dir,
    cleanup: () => {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        /* best-effort */
      }
    },
  };
}

/**
 * Subscribe to a runner event and collect all occurrences.
 */
export function collectEvents<K extends keyof RunnerEvents>(
  runner: AgentRunner,
  event: K,
): Array<RunnerEvents[K]> {
  const collected: Array<RunnerEvents[K]> = [];
  runner.on(event, (data) => collected.push(data));
  return collected;
}

/**
 * Async sleep helper.
 */
export function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
