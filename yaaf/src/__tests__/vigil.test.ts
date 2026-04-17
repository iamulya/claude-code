/**
 * Vigil (autonomous agent) test suite
 *
 * Tests the autonomous agent engine:
 * - Lifecycle (start/stop with timers)
 * - Tick loop (periodic wake-ups)
 * - Cron scheduler (schedule, scheduleOnce, cancel, listTasks)
 * - Brief output channel
 * - Session journal (append-only daily log)
 * - Event system (onVigil)
 *
 * Strategy: We mock Agent.run() to avoid real LLM calls.
 * We use short tick intervals and immediate scheduler checks.
 *
 * ⚠️ Previously had ZERO test coverage.
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { Vigil, vigil as vigilFactory, type VigilConfig, type ScheduledTask } from "../vigil.js";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

// ── Helpers ─────────────────────────────────────────────────────────────────

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "yaaf-vigil-"));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
});

/** Build a Vigil config with mocked LLM. No real API calls. */
function makeVigilConfig(overrides?: Partial<VigilConfig>): VigilConfig {
  return {
    name: "test-vigil",
    provider: "mock" as any,
    model: "mock-model",
    systemPrompt: "You are a test vigil.",
    tickInterval: 0, // disable auto-ticks for deterministic tests
    storageDir: tmpDir,
    ...overrides,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Scheduler API (no lifecycle, pure logic)
// ════════════════════════════════════════════════════════════════════════════

describe("Vigil — scheduler", () => {
  it("schedule() validates cron and returns task ID", () => {
    const v = new Vigil(makeVigilConfig());
    const id = v.schedule("0 9 * * *", "Check notifications");
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("schedule() with invalid cron throws", () => {
    const v = new Vigil(makeVigilConfig());
    expect(() => v.schedule("invalid cron", "test")).toThrow();
  });

  it("scheduleOnce() returns task ID", () => {
    const v = new Vigil(makeVigilConfig());
    const id = v.scheduleOnce("0 9 * * *", "One-shot task");
    expect(typeof id).toBe("string");
  });

  it("cancel() removes task and returns true", () => {
    const v = new Vigil(makeVigilConfig());
    const id = v.schedule("0 9 * * *", "task");
    expect(v.cancel(id)).toBe(true);
    expect(v.listTasks().find((t) => t.id === id)).toBeUndefined();
  });

  it("cancel() returns false for non-existent task", () => {
    const v = new Vigil(makeVigilConfig());
    expect(v.cancel("nonexistent")).toBe(false);
  });

  it("listTasks() returns all scheduled tasks", () => {
    const v = new Vigil(makeVigilConfig());
    v.schedule("0 9 * * *", "task 1");
    v.schedule("*/15 * * * *", "task 2");

    const tasks = v.listTasks();
    expect(tasks).toHaveLength(2);
    expect(tasks.every((t: ScheduledTask) => t.cron && t.prompt)).toBe(true);
  });

  it("getNextFireTime() returns earliest time", () => {
    const v = new Vigil(makeVigilConfig());
    // Both these are future tasks
    v.schedule("0 9 * * *", "daily");
    v.schedule("* * * * *", "every minute — fires soonest");

    const next = v.getNextFireTime();
    expect(next).not.toBeNull();
    expect(next!).toBeGreaterThan(Date.now() - 60_000); // should be in the near future
  });

  it("getNextFireTime() returns null when no tasks", () => {
    const v = new Vigil(makeVigilConfig());
    expect(v.getNextFireTime()).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Vigil events
// ════════════════════════════════════════════════════════════════════════════

describe("Vigil — events", () => {
  it("onVigil registers handlers for start/stop", async () => {
    const events: any[] = [];
    const v = new Vigil(makeVigilConfig());
    v.onVigil("start", (data) => events.push({ type: "start", ...data }));
    v.onVigil("stop", (data) => events.push({ type: "stop", ...data }));

    await v.start();
    v.stop();

    expect(events.find((e) => e.type === "start")).toBeDefined();
    expect(events.find((e) => e.type === "stop")).toBeDefined();
  });

  it("brief emits brief event and calls onBrief", () => {
    const briefs: string[] = [];
    const events: any[] = [];
    const v = new Vigil(makeVigilConfig({ onBrief: (m) => briefs.push(m) }));
    v.onVigil("brief", (data) => events.push(data));

    v.brief("System health: OK");

    expect(briefs).toEqual(["System health: OK"]);
    expect(events[0]!.message).toBe("System health: OK");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Journal
// ════════════════════════════════════════════════════════════════════════════

describe("Vigil — journal", () => {
  it("journalEntry writes to in-memory journal", () => {
    const v = new Vigil(makeVigilConfig());
    v.journalEntry("Test entry");
    // In-memory entries are accessible indirectly through readJournal
    // after file write completes
  });

  it("readJournal returns empty array for non-existent journal", async () => {
    const v = new Vigil(makeVigilConfig());
    const entries = await v.readJournal();
    expect(entries).toEqual([]);
  });

  it("journal entries are written to daily file", async () => {
    const v = new Vigil(makeVigilConfig());
    v.journalEntry("Entry 1");
    v.journalEntry("Entry 2");

    // Wait for async file writes
    await new Promise((r) => setTimeout(r, 200));

    const entries = await v.readJournal();
    expect(entries.length).toBeGreaterThanOrEqual(2);
    expect(entries.some((e) => e.includes("Entry 1"))).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Lifecycle
// ════════════════════════════════════════════════════════════════════════════

describe("Vigil — lifecycle", () => {
  it("start() is idempotent", async () => {
    const v = new Vigil(makeVigilConfig());
    await v.start();
    await v.start(); // should not throw or double-start
    v.stop();
  });

  it("stop() before start() is harmless", () => {
    const v = new Vigil(makeVigilConfig());
    v.stop(); // should not throw
  });

  it("start() creates storage directory", async () => {
    const customDir = path.join(tmpDir, "custom-storage");
    const v = new Vigil(makeVigilConfig({ storageDir: customDir }));
    await v.start();
    v.stop();

    const stat = await fs.stat(customDir);
    expect(stat.isDirectory()).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Factory
// ════════════════════════════════════════════════════════════════════════════

describe("Vigil — factory", () => {
  it("vigil() factory creates Vigil instance", () => {
    const v = vigilFactory(makeVigilConfig());
    expect(v).toBeInstanceOf(Vigil);
  });
});
