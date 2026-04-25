/**
 * Skills — Phase 7 tests: Hot-Reload Watcher (chokidar).
 *
 * Tests:
 * - Construction validation
 * - Lifecycle (start/stop/dispose)
 * - E2E: real filesystem watching with chokidar
 * - Event coalescing
 * - Extension filtering
 * - Manual flush
 */

import { describe, it, expect, afterEach } from "vitest";
import * as fsp from "fs/promises";
import * as path from "path";
import * as os from "os";

import {
  SkillWatcher,
  type SkillChangeEvent,
} from "../skills/index.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

let tempDirs: string[] = [];
let watchers: SkillWatcher[] = [];

async function createTempDir(prefix = "yaaf-p7-"): Promise<string> {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  // Stop all watchers
  for (const w of watchers) {
    await w.stop();
  }
  watchers = [];

  // Clean up temp dirs
  for (const dir of tempDirs) {
    await fsp.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
  tempDirs = [];
});

function createWatcher(
  dir: string,
  onChange: (event: SkillChangeEvent) => void,
  opts?: Partial<import("../skills/index.js").SkillWatcherConfig>,
): SkillWatcher {
  const w = new SkillWatcher({
    dirs: [dir],
    onChange,
    debounceMs: 50, // Fast for testing
    stabilityThreshold: 100, // Fast for testing
    pollInterval: 50,
    ...opts,
  });
  watchers.push(w);
  return w;
}

/** Wait for a specified duration */
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ══════════════════════════════════════════════════════════════════════════════
// Construction
// ══════════════════════════════════════════════════════════════════════════════

describe("SkillWatcher construction", () => {
  it("throws if dirs is empty", () => {
    expect(
      () =>
        new SkillWatcher({
          dirs: [],
          onChange: () => {},
        }),
    ).toThrow("dirs must be a non-empty array");
  });

  it("creates with valid config", async () => {
    const dir = await createTempDir();
    const w = createWatcher(dir, () => {});
    expect(w.isWatching).toBe(false);
    expect(w.pendingCount).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Lifecycle
// ══════════════════════════════════════════════════════════════════════════════

describe("SkillWatcher lifecycle", () => {
  it("starts and becomes isWatching", async () => {
    const dir = await createTempDir();
    const w = createWatcher(dir, () => {});
    expect(w.isWatching).toBe(false);
    await w.start();
    expect(w.isWatching).toBe(true);
  });

  it("stops and becomes not isWatching", async () => {
    const dir = await createTempDir();
    const w = createWatcher(dir, () => {});
    await w.start();
    await w.stop();
    expect(w.isWatching).toBe(false);
  });

  it("stop is idempotent", async () => {
    const dir = await createTempDir();
    const w = createWatcher(dir, () => {});
    await w.start();
    await w.stop();
    await w.stop(); // No error
    expect(w.isWatching).toBe(false);
  });

  it("throws on double start", async () => {
    const dir = await createTempDir();
    const w = createWatcher(dir, () => {});
    await w.start();
    await expect(w.start()).rejects.toThrow("already started");
  });

  it("throws on start after dispose", async () => {
    const dir = await createTempDir();
    const w = createWatcher(dir, () => {});
    await w.start();
    await w.stop();
    await expect(w.start()).rejects.toThrow("disposed");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// E2E: Real filesystem watching
// ══════════════════════════════════════════════════════════════════════════════

describe("E2E: filesystem watching", () => {
  it("detects a new .md file", async () => {
    const dir = await createTempDir();
    const events: SkillChangeEvent[] = [];
    const w = createWatcher(dir, (e) => events.push(e));
    await w.start();

    // Create a skill file
    await fsp.writeFile(path.join(dir, "test-skill.md"), "# Test Skill\n");

    // Wait for stability + debounce
    await wait(400);
    await w.flush();

    expect(events.length).toBeGreaterThanOrEqual(1);
    const allAdded = events.flatMap((e) => e.added);
    expect(allAdded.some((p) => p.includes("test-skill.md"))).toBe(true);
  });

  it("detects file modification", async () => {
    const dir = await createTempDir();
    const filePath = path.join(dir, "modify-test.md");

    // Pre-create the file before starting watcher
    await fsp.writeFile(filePath, "# Original\n");

    const events: SkillChangeEvent[] = [];
    const w = createWatcher(dir, (e) => events.push(e));
    await w.start();

    // Modify the file
    await fsp.writeFile(filePath, "# Modified content here\n");

    await wait(400);
    await w.flush();

    expect(events.length).toBeGreaterThanOrEqual(1);
    const allChanged = events.flatMap((e) => e.changed);
    expect(allChanged.some((p) => p.includes("modify-test.md"))).toBe(true);
  });

  it("detects file deletion", async () => {
    const dir = await createTempDir();
    const filePath = path.join(dir, "delete-test.md");

    // Pre-create the file
    await fsp.writeFile(filePath, "# Will be deleted\n");

    const events: SkillChangeEvent[] = [];
    const w = createWatcher(dir, (e) => events.push(e));
    await w.start();

    // Delete the file
    await fsp.unlink(filePath);

    await wait(400);
    await w.flush();

    expect(events.length).toBeGreaterThanOrEqual(1);
    const allRemoved = events.flatMap((e) => e.removed);
    expect(allRemoved.some((p) => p.includes("delete-test.md"))).toBe(true);
  });

  it("ignores non-.md files", async () => {
    const dir = await createTempDir();
    const events: SkillChangeEvent[] = [];
    const w = createWatcher(dir, (e) => events.push(e));
    await w.start();

    // Create non-skill files
    await fsp.writeFile(path.join(dir, "script.js"), "// JS file\n");
    await fsp.writeFile(path.join(dir, "data.json"), "{}\n");
    await fsp.writeFile(path.join(dir, "readme.txt"), "text\n");

    await wait(400);
    await w.flush();

    // Should have no events (all filtered out)
    const allPaths = events.flatMap((e) => [...e.added, ...e.changed, ...e.removed]);
    expect(allPaths.length).toBe(0);
  });

  it("ignores dotfiles", async () => {
    const dir = await createTempDir();
    const events: SkillChangeEvent[] = [];
    const w = createWatcher(dir, (e) => events.push(e));
    await w.start();

    // Create dotfile
    await fsp.writeFile(path.join(dir, ".hidden-skill.md"), "# Hidden\n");

    await wait(400);
    await w.flush();

    const allPaths = events.flatMap((e) => [...e.added, ...e.changed, ...e.removed]);
    expect(allPaths.length).toBe(0);
  });

  it("batches rapid changes within debounce window", async () => {
    const dir = await createTempDir();
    const events: SkillChangeEvent[] = [];
    const w = createWatcher(dir, (e) => events.push(e), {
      debounceMs: 200,
    });
    await w.start();

    // Create multiple files rapidly
    await fsp.writeFile(path.join(dir, "file1.md"), "# File 1\n");
    await fsp.writeFile(path.join(dir, "file2.md"), "# File 2\n");
    await fsp.writeFile(path.join(dir, "file3.md"), "# File 3\n");

    // Wait for stability + debounce
    await wait(600);
    await w.flush();

    // Should be batched into few events
    expect(events.length).toBeLessThanOrEqual(2);

    // But all files should be represented
    const allPaths = events.flatMap((e) => [...e.added, ...e.changed]);
    expect(allPaths.some((p) => p.includes("file1.md"))).toBe(true);
    expect(allPaths.some((p) => p.includes("file2.md"))).toBe(true);
    expect(allPaths.some((p) => p.includes("file3.md"))).toBe(true);
  });

  it("handles onChange errors gracefully", async () => {
    const dir = await createTempDir();
    const w = createWatcher(dir, () => {
      throw new Error("Handler exploded");
    });
    await w.start();

    // Create a file — should not crash the watcher
    await fsp.writeFile(path.join(dir, "error-test.md"), "# Error\n");

    await wait(400);
    await w.flush();

    // Watcher should still be running
    expect(w.isWatching).toBe(true);
  });

  it("detects files in subdirectories", { retry: 2 }, async () => {
    const dir = await createTempDir();

    const events: SkillChangeEvent[] = [];
    const w = createWatcher(dir, (e) => events.push(e));
    await w.start();

    // Create the subdirectory AFTER starting the watcher
    const subDir = path.join(dir, "my-skill");
    await fsp.mkdir(subDir);

    // Wait for chokidar to register the new subdirectory
    await wait(300);

    // Create a skill file in the newly-watched subdirectory
    await fsp.writeFile(path.join(subDir, "SKILL.md"), "# Skill\n");

    // Poll for the event (handles timing variance across CI environments)
    let found = false;
    for (let attempt = 0; attempt < 5 && !found; attempt++) {
      await wait(200);
      await w.flush();
      const allPaths = events.flatMap((e) => [...e.added, ...e.changed]);
      found = allPaths.some((p) => p.includes("SKILL.md"));
    }

    expect(found).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Manual flush
// ══════════════════════════════════════════════════════════════════════════════

describe("flush", () => {
  it("flush on empty pending is a no-op", async () => {
    const dir = await createTempDir();
    const events: SkillChangeEvent[] = [];
    const w = createWatcher(dir, (e) => events.push(e));
    await w.start();

    // Flush with no changes
    await w.flush();
    expect(events.length).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Filtering edge cases
// ══════════════════════════════════════════════════════════════════════════════

describe("filtering edge cases", () => {
  it("ignores underscore-prefixed files", async () => {
    const dir = await createTempDir();
    const events: SkillChangeEvent[] = [];
    const w = createWatcher(dir, (e) => events.push(e));
    await w.start();

    // Create underscore-prefixed file
    await fsp.writeFile(path.join(dir, "_draft-skill.md"), "# Draft\n");

    await wait(400);
    await w.flush();

    const allPaths = events.flatMap((e) => [...e.added, ...e.changed, ...e.removed]);
    expect(allPaths.length).toBe(0);
  });

  it("detects .mdx files (default extensions)", async () => {
    const dir = await createTempDir();
    const events: SkillChangeEvent[] = [];
    const w = createWatcher(dir, (e) => events.push(e));
    await w.start();

    await fsp.writeFile(path.join(dir, "component-skill.mdx"), "# MDX Skill\n");

    await wait(400);
    await w.flush();

    expect(events.length).toBeGreaterThanOrEqual(1);
    const allPaths = events.flatMap((e) => [...e.added, ...e.changed]);
    expect(allPaths.some((p) => p.includes("component-skill.mdx"))).toBe(true);
  });

  it("respects custom extensions config", async () => {
    const dir = await createTempDir();
    const events: SkillChangeEvent[] = [];
    const w = createWatcher(dir, (e) => events.push(e), {
      extensions: [".txt"], // Only watch .txt, NOT .md
    });
    await w.start();

    // .md should be ignored, .txt should be detected
    await fsp.writeFile(path.join(dir, "skill.md"), "# Ignored\n");
    await fsp.writeFile(path.join(dir, "skill.txt"), "Detected\n");

    await wait(400);
    await w.flush();

    const allPaths = events.flatMap((e) => [...e.added, ...e.changed]);
    expect(allPaths.some((p) => p.includes("skill.txt"))).toBe(true);
    expect(allPaths.some((p) => p.includes("skill.md"))).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Event shape
// ══════════════════════════════════════════════════════════════════════════════

describe("event shape", () => {
  it("includes a reasonable timestamp", async () => {
    const dir = await createTempDir();
    const events: SkillChangeEvent[] = [];
    const w = createWatcher(dir, (e) => events.push(e));
    await w.start();

    const before = Date.now();
    await fsp.writeFile(path.join(dir, "ts-test.md"), "# Timestamp\n");

    await wait(400);
    await w.flush();
    const after = Date.now();

    expect(events.length).toBeGreaterThanOrEqual(1);
    const ts = events[0]!.timestamp;
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after + 500); // small grace for async
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Multiple directories
// ══════════════════════════════════════════════════════════════════════════════

describe("multiple directories", () => {
  it("watches multiple directories simultaneously", async () => {
    const dir1 = await createTempDir();
    const dir2 = await createTempDir();
    const events: SkillChangeEvent[] = [];
    const w = new SkillWatcher({
      dirs: [dir1, dir2],
      onChange: (e) => events.push(e),
      debounceMs: 50,
      stabilityThreshold: 100,
      pollInterval: 50,
    });
    watchers.push(w);
    await w.start();

    await fsp.writeFile(path.join(dir1, "skill-a.md"), "# A\n");
    await fsp.writeFile(path.join(dir2, "skill-b.md"), "# B\n");

    await wait(400);
    await w.flush();

    const allPaths = events.flatMap((e) => [...e.added, ...e.changed]);
    expect(allPaths.some((p) => p.includes("skill-a.md"))).toBe(true);
    expect(allPaths.some((p) => p.includes("skill-b.md"))).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Async onChange handler
// ══════════════════════════════════════════════════════════════════════════════

describe("async onChange", () => {
  it("handles async onChange callbacks", async () => {
    const dir = await createTempDir();
    const results: string[] = [];
    const w = createWatcher(dir, async (e) => {
      // Simulate async work
      await wait(10);
      results.push(...e.added.map((p) => path.basename(p)));
    });
    await w.start();

    await fsp.writeFile(path.join(dir, "async-test.md"), "# Async\n");

    await wait(400);
    await w.flush();

    expect(results).toContain("async-test.md");
  });
});
