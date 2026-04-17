/**
 * L3-02: Memory Durability — Lifecycle & Durability
 *
 * Validates that MemoryStore entries survive write→read cycles, that scoped
 * team memories are correctly isolated, and that the GC system works as
 * documented.
 */

import { describe, it, expect, afterEach } from "vitest";
import { MemoryStore } from "../../../memory/memoryStore.js";
import { createTestDir } from "../_fixtures/helpers.js";
import { readFile } from "node:fs/promises";

// ── Helpers ───────────────────────────────────────────────────────────────────

let cleanups: Array<() => void> = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups = [];
});

function tmpDir() {
  const t = createTestDir("l3-memory-");
  cleanups.push(t.cleanup);
  return t.dir;
}

describe("L3-02: Memory Durability", () => {
  // ── Basic Persistence ───────────────────────────────────────────────────────

  it("write → new MemoryStore instance → read returns identical entry", async () => {
    const dir = tmpDir();

    // Write
    const store1 = new MemoryStore({ privateDir: dir });
    await store1.initialize();
    const savedPath = await store1.save({
      name: "User prefers terse output",
      description: "Skip summaries, let diffs speak",
      type: "feedback",
      content: "Lead with the change, don't explain what you did.",
    });

    // Read with a brand new instance (simulates process restart)
    const store2 = new MemoryStore({ privateDir: dir });
    const headers = await store2.scan();
    expect(headers).toHaveLength(1);
    expect(headers[0]!.name).toBe("User prefers terse output");
    expect(headers[0]!.type).toBe("feedback");

    // Full read
    const entry = await store2.read(headers[0]!.filename);
    expect(entry).not.toBeNull();
    expect(entry!.content).toContain("Lead with the change");
    expect(entry!.description).toBe("Skip summaries, let diffs speak");
  });

  // ── Frontmatter Fidelity ────────────────────────────────────────────────────

  it("preserves all frontmatter fields through roundtrip", async () => {
    const dir = tmpDir();
    const store = new MemoryStore({ privateDir: dir });
    await store.initialize();

    for (const type of ["user", "feedback", "project", "reference"] as const) {
      await store.save({
        name: `${type} memory`,
        description: `description for ${type}`,
        type,
        content: `Content for ${type} type.`,
      });
    }

    const headers = await store.scan();
    expect(headers).toHaveLength(4);

    const types = new Set(headers.map((h) => h.type));
    expect(types.size).toBe(4);
    expect(types.has("user")).toBe(true);
    expect(types.has("feedback")).toBe(true);
    expect(types.has("project")).toBe(true);
    expect(types.has("reference")).toBe(true);
  });

  // ── Team Memory Scoping ─────────────────────────────────────────────────────

  it("team vs private scoping persists independently", async () => {
    const dir = tmpDir();
    const teamDir = dir + "/team";
    const store = new MemoryStore({ privateDir: dir, teamDir });
    await store.initialize();

    // Save to private scope
    await store.save({
      name: "Private preference",
      description: "User-only",
      type: "user",
      content: "Use vim keybindings.",
      scope: "private",
    });

    // Save to team scope
    await store.save({
      name: "Team convention",
      description: "Team-wide",
      type: "project",
      content: "Use ESLint flat config.",
      scope: "team",
    });

    // Private scope should have 1 entry
    const privateHeaders = await store.scan("private");
    expect(privateHeaders).toHaveLength(1);
    expect(privateHeaders[0]!.name).toBe("Private preference");

    // Team scope should have 1 entry
    const teamHeaders = await store.scan("team");
    expect(teamHeaders).toHaveLength(1);
    expect(teamHeaders[0]!.name).toBe("Team convention");

    // scanAll should have both
    const all = await store.scanAll();
    expect(all).toHaveLength(2);
  });

  // ── GC: Age-based ───────────────────────────────────────────────────────────

  it("gc() removes entries older than maxAgeMs", async () => {
    const dir = tmpDir();
    const store = new MemoryStore({
      privateDir: dir,
      maxAgeMs: 50, // 50ms — entries will expire quickly
    });
    await store.initialize();

    await store.save({
      name: "Old memory",
      description: "Should be GC'd",
      type: "feedback",
      content: "Stale content",
    });

    // Wait for entry to exceed maxAge
    await new Promise((r) => setTimeout(r, 100));

    const deleted = await store.gc();
    expect(deleted).toBe(1);

    const remaining = await store.scan();
    expect(remaining).toHaveLength(0);
  });

  // ── GC: Count-based ─────────────────────────────────────────────────────────

  it("gc() removes oldest entries when maxEntries is exceeded", async () => {
    const dir = tmpDir();
    const store = new MemoryStore({
      privateDir: dir,
      maxEntries: 2,
    });
    await store.initialize();

    // Create 4 entries with different timestamps
    for (let i = 0; i < 4; i++) {
      await store.save({
        name: `Memory ${i}`,
        description: `Entry ${i}`,
        type: "feedback",
        content: `Content ${i}`,
        filename: `entry_${i}.md`,
      });
      // Small delay to ensure different mtime
      await new Promise((r) => setTimeout(r, 20));
    }

    const deleted = await store.gc();
    expect(deleted).toBe(2);

    const remaining = await store.scan();
    expect(remaining).toHaveLength(2);

    // The two newest should survive
    const names = remaining.map((h) => h.name).sort();
    expect(names).toContain("Memory 2");
    expect(names).toContain("Memory 3");
  });

  // ── Overwrite ───────────────────────────────────────────────────────────────

  it("save with explicit filename overwrites existing entry", async () => {
    const dir = tmpDir();
    const store = new MemoryStore({ privateDir: dir });
    await store.initialize();

    await store.save({
      name: "Version 1",
      description: "Original",
      type: "feedback",
      content: "First draft",
      filename: "my-note.md",
    });

    await store.save({
      name: "Version 2",
      description: "Updated",
      type: "feedback",
      content: "Second draft",
      filename: "my-note.md",
    });

    const headers = await store.scan();
    expect(headers).toHaveLength(1);

    const entry = await store.read("my-note.md");
    expect(entry!.name).toBe("Version 2");
    expect(entry!.content).toBe("Second draft");
  });

  // ── Index ──────────────────────────────────────────────────────────────────

  it("setIndex/getIndex roundtrips", async () => {
    const dir = tmpDir();
    const store = new MemoryStore({ privateDir: dir });
    await store.initialize();

    await store.setIndex("# My Memories\n- Item 1\n- Item 2");

    const { content, wasTruncated } = await store.getIndex();
    expect(content).toBe("# My Memories\n- Item 1\n- Item 2");
    expect(wasTruncated).toBe(false);
  });

  it("getIndex truncates when content exceeds maxIndexLines", async () => {
    const dir = tmpDir();
    const store = new MemoryStore({ privateDir: dir, maxIndexLines: 3 });
    await store.initialize();

    await store.setIndex("Line 1\nLine 2\nLine 3\nLine 4\nLine 5");

    const { content, wasTruncated } = await store.getIndex();
    expect(wasTruncated).toBe(true);
    expect(content).toContain("truncated");
    // Should have at most 3 content lines + warning
    const lines = content.split("\n").filter((l) => !l.includes("truncated") && l.trim());
    expect(lines.length).toBeLessThanOrEqual(3);
  });

  // ── Remove ──────────────────────────────────────────────────────────────────

  it("remove() deletes a memory file", async () => {
    const dir = tmpDir();
    const store = new MemoryStore({ privateDir: dir });
    await store.initialize();

    await store.save({
      name: "To be removed",
      description: "Disposable",
      type: "feedback",
      content: "Goodbye",
      filename: "disposable.md",
    });

    const removed = await store.remove("disposable.md");
    expect(removed).toBe(true);

    const entry = await store.read("disposable.md");
    expect(entry).toBeNull();
  });

  // ── Path Traversal Prevention ───────────────────────────────────────────────

  it("save() rejects path traversal in filename", async () => {
    const dir = tmpDir();
    const store = new MemoryStore({ privateDir: dir });
    await store.initialize();

    await expect(
      store.save({
        name: "Evil",
        description: "Traversal attempt",
        type: "feedback",
        content: "Payload",
        filename: "../../etc/evil.md",
      }),
    ).rejects.toThrow(/invalid filename|path separator/i);
  });
});
