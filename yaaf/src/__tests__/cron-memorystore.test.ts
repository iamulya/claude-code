/**
 * Cron parser + Vigil scheduler test suite
 *
 * The cron module is pure-logic (no IO, no external deps). It MUST be
 * tested exhaustively because Vigil's autonomous loop depends on it to
 * decide when to wake the agent. A bug here means tasks fire at the
 * wrong time, or never fire at all.
 *
 * Vigil is the autonomous agent engine with:
 * - Tick-driven proactive loop
 * - Cron task scheduler
 * - Brief output channel
 * - Session journal
 *
 * ⚠️ Both had ZERO test coverage.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { validateCron, nextCronRunMs, describeCron } from "../utils/cron.js";

// ════════════════════════════════════════════════════════════════════════════
// validateCron
// ════════════════════════════════════════════════════════════════════════════

describe("validateCron", () => {
  it.each([
    ["* * * * *", "every minute"],
    ["0 9 * * *", "daily at 9am"],
    ["0 9 * * 1-5", "9am weekdays"],
    ["*/15 * * * *", "every 15 minutes"],
    ["0 0 1 * *", "midnight 1st of month"],
    ["30 4 * * 0", "4:30am Sunday"],
    ["0 0 * * 7", "Sunday (7 = 0 alias)"],
    ["0,15,30,45 * * * *", "every quarter hour"],
    ["0 9-17 * * *", "9am-5pm hourly"],
    ["0 9-17/2 * * *", "9am-5pm every 2 hours"],
    ["* * * * * *", "6-field with seconds (croner extension)"],
  ])('accepts valid: "%s" (%s)', (expr) => {
    expect(validateCron(expr)).toBe(true);
  });

  it.each([
    ["", "empty string"],
    ["* * *", "too few fields"],
    ["60 * * * *", "minute 60 out of range"],
    ["-1 * * * *", "negative minute"],
    ["* 24 * * *", "hour 24 out of range"],
    ["* * 0 * *", "day 0 out of range (1-31)"],
    ["* * * 0 *", "month 0 out of range (1-12)"],
    ["* * * 13 *", "month 13 out of range"],
    ["abc * * * *", "non-numeric"],
    ["*/0 * * * *", "step of zero"],
    ["5-3 * * * *", "inverted range"],
  ])('rejects invalid: "%s" (%s)', (expr) => {
    expect(validateCron(expr)).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// nextCronRunMs
// ════════════════════════════════════════════════════════════════════════════

describe("nextCronRunMs", () => {
  it("returns next matching minute", () => {
    // "every minute" → next minute from now
    const from = new Date("2026-04-15T10:30:45Z").getTime();
    const next = nextCronRunMs("* * * * *", from);
    expect(next).not.toBeNull();
    // Must be strictly after `from`
    expect(next!).toBeGreaterThan(from);
    // Must be within 2 minutes
    expect(next! - from).toBeLessThan(2 * 60_000);
  });

  it("returns correct next time for daily schedule", () => {
    // "0 9 * * *" = daily at 9am local
    const from = new Date("2026-04-15T06:00:00").getTime();
    const next = nextCronRunMs("0 9 * * *", from);
    expect(next).not.toBeNull();
    const d = new Date(next!);
    expect(d.getHours()).toBe(9);
    expect(d.getMinutes()).toBe(0);
  });

  it("skips to next day if time already passed", () => {
    const from = new Date("2026-04-15T10:00:00").getTime();
    // 9am already passed → should be tomorrow at 9am
    const next = nextCronRunMs("0 9 * * *", from);
    expect(next).not.toBeNull();
    const d = new Date(next!);
    expect(d.getDate()).toBe(16);
    expect(d.getHours()).toBe(9);
  });

  it("handles day-of-week constraints", () => {
    // "0 9 * * 1" = Monday at 9am
    // 2026-04-15 is a Wednesday
    const from = new Date("2026-04-15T00:00:00").getTime();
    const next = nextCronRunMs("0 9 * * 1", from);
    expect(next).not.toBeNull();
    const d = new Date(next!);
    expect(d.getDay()).toBe(1); // Monday
  });

  it("returns null for invalid cron", () => {
    expect(nextCronRunMs("invalid", Date.now())).toBeNull();
  });

  it("respects step intervals", () => {
    // "*/15 * * * *" = every 15 minutes (0, 15, 30, 45)
    const from = new Date("2026-04-15T10:05:00").getTime();
    const next = nextCronRunMs("*/15 * * * *", from);
    const d = new Date(next!);
    expect(d.getMinutes()).toBe(15); // next 15-min boundary
  });

  it("handles comma-separated lists", () => {
    // "0,30 * * * *" = at :00 and :30
    const from = new Date("2026-04-15T10:15:00").getTime();
    const next = nextCronRunMs("0,30 * * * *", from);
    const d = new Date(next!);
    expect(d.getMinutes()).toBe(30);
  });

  it("handles day-of-week 7 as Sunday (alias for 0)", () => {
    // "0 0 * * 7" = Sunday midnight
    const from = new Date("2026-04-15T00:00:00").getTime(); // Wednesday
    const next = nextCronRunMs("0 0 * * 7", from);
    expect(next).not.toBeNull();
    const d = new Date(next!);
    expect(d.getDay()).toBe(0); // Sunday
  });
});

// ════════════════════════════════════════════════════════════════════════════
// describeCron
// ════════════════════════════════════════════════════════════════════════════

describe("describeCron", () => {
  it("returns human-readable next fire description", () => {
    const str = describeCron("0 9 * * *", Date.now());
    expect(str).not.toBeNull();
    expect(str!).toContain("Next:");
  });

  it("returns null for invalid cron", () => {
    expect(describeCron("not a cron")).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// MemoryStore — file-based persistence with frontmatter
// ════════════════════════════════════════════════════════════════════════════

import { MemoryStore, MEMORY_TYPES, type MemoryType } from "../memory/memoryStore.js";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

describe("MemoryStore", () => {
  let tmpDir: string;
  let store: MemoryStore;

  // Create a fresh temp directory for each test
  afterEach(async () => {
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  async function setup(config?: { teamDir?: string }) {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "yaaf-memory-"));
    const privateDir = path.join(tmpDir, "private");
    const teamDir = config?.teamDir ?? path.join(tmpDir, "team");
    store = new MemoryStore({ privateDir, teamDir });
    await store.initialize();
    return { privateDir, teamDir };
  }

  // ── CRUD ────────────────────────────────────────────────────────────────

  it("save and read a memory entry", async () => {
    await setup();

    const filePath = await store.save({
      name: "User prefers TypeScript",
      description: "Coding preference",
      type: "user",
      content: "Always use TypeScript with strict mode.",
    });

    expect(filePath).toContain(".md");

    const entry = await store.read(path.basename(filePath));
    expect(entry).not.toBeNull();
    expect(entry!.name).toBe("User prefers TypeScript");
    expect(entry!.type).toBe("user");
    expect(entry!.content).toBe("Always use TypeScript with strict mode.");
  });

  it("save with explicit filename", async () => {
    await setup();

    await store.save({
      name: "Test",
      description: "Test entry",
      type: "feedback",
      content: "Test content",
      filename: "custom-name.md",
    });

    const entry = await store.read("custom-name.md");
    expect(entry).not.toBeNull();
    expect(entry!.name).toBe("Test");
  });

  it("auto-generates filename from name + type", async () => {
    await setup();

    const filePath = await store.save({
      name: "Multi Word Name With Caps",
      description: "test",
      type: "project",
      content: "content",
    });

    const base = path.basename(filePath);
    expect(base).toMatch(/^project_/);
    expect(base).toMatch(/\.md$/);
    // Slugified: lowercase, underscores
    expect(base).not.toMatch(/[A-Z]/);
  });

  it("remove deletes a memory file", async () => {
    await setup();

    await store.save({
      name: "To Delete",
      description: "will be removed",
      type: "user",
      content: "temporary",
      filename: "to-delete.md",
    });

    const removed = await store.remove("to-delete.md");
    expect(removed).toBe(true);

    const entry = await store.read("to-delete.md");
    expect(entry).toBeNull();
  });

  it("remove returns false for non-existent file", async () => {
    await setup();
    expect(await store.remove("nonexistent.md")).toBe(false);
  });

  it("read returns null for non-existent file", async () => {
    await setup();
    expect(await store.read("nonexistent.md")).toBeNull();
  });

  // ── Scan ────────────────────────────────────────────────────────────────

  it("scan returns all memory headers", async () => {
    await setup();

    await store.save({ name: "A", description: "a", type: "user", content: "a" });
    await store.save({ name: "B", description: "b", type: "feedback", content: "b" });
    await store.save({ name: "C", description: "c", type: "project", content: "c" });

    const headers = await store.scan();
    expect(headers).toHaveLength(3);
    expect(headers.every((h) => h.filename && h.name && h.type)).toBe(true);
  });

  it("scan skips non-markdown files", async () => {
    const { privateDir } = await setup();

    // Create a non-md file alongside memories
    await fs.writeFile(path.join(privateDir, "notes.txt"), "not a memory");
    await store.save({ name: "Valid", description: "v", type: "user", content: "v" });

    const headers = await store.scan();
    expect(headers.every((h) => h.filename.endsWith(".md"))).toBe(true);
    expect(headers.find((h) => h.filename === "notes.txt")).toBeUndefined();
  });

  it("scan skips MEMORY.md index file", async () => {
    const { privateDir } = await setup();

    await fs.writeFile(path.join(privateDir, "MEMORY.md"), "# Index");
    await store.save({ name: "Valid", description: "v", type: "user", content: "v" });

    const headers = await store.scan();
    expect(headers.find((h) => h.filename === "MEMORY.md")).toBeUndefined();
  });

  it("scan skips files with invalid frontmatter type", async () => {
    const { privateDir } = await setup();

    // Create a .md file with invalid type
    await fs.writeFile(
      path.join(privateDir, "bad-type.md"),
      "---\nname: Bad\ndescription: bad\ntype: invalid_type\n---\n\nContent",
    );
    await store.save({ name: "Good", description: "g", type: "user", content: "g" });

    const headers = await store.scan();
    expect(headers).toHaveLength(1);
    expect(headers[0]!.name).toBe("Good");
  });

  it("scanAll returns memories from both private and team scopes", async () => {
    await setup();

    await store.save({
      name: "Private",
      description: "p",
      type: "user",
      content: "p",
      scope: "private",
    });
    await store.save({
      name: "Team",
      description: "t",
      type: "project",
      content: "t",
      scope: "team",
    });

    const all = await store.scanAll();
    expect(all).toHaveLength(2);
    const names = all.map((h) => h.name);
    expect(names).toContain("Private");
    expect(names).toContain("Team");
  });

  // ── Index ───────────────────────────────────────────────────────────────

  it("getIndex returns empty message when MEMORY.md does not exist", async () => {
    await setup();
    const { content, wasTruncated } = await store.getIndex();
    expect(content).toContain("empty");
    expect(wasTruncated).toBe(false);
  });

  it("setIndex and getIndex round-trip", async () => {
    await setup();
    await store.setIndex("# Memories\n\n- User likes cats\n- Project uses TypeScript");
    const { content } = await store.getIndex();
    expect(content).toContain("User likes cats");
    expect(content).toContain("Project uses TypeScript");
  });

  it("getIndex truncates when content exceeds maxIndexLines", async () => {
    await setup();
    const longContent = Array.from({ length: 500 }, (_, i) => `Line ${i}`).join("\n");
    await store.setIndex(longContent);

    const { content, wasTruncated } = await store.getIndex();
    expect(wasTruncated).toBe(true);
    expect(content).toContain("truncated");
  });

  // ── buildPrompt ─────────────────────────────────────────────────────────

  it("buildPrompt returns structured memory system prompt", async () => {
    await setup();
    const prompt = store.buildPrompt();

    expect(prompt).toContain("# Memory");
    expect(prompt).toContain("user");
    expect(prompt).toContain("feedback");
    expect(prompt).toContain("project");
    expect(prompt).toContain("reference");
    expect(prompt).toContain("Frontmatter");
  });

  // ── Team scope ──────────────────────────────────────────────────────────

  it("save to team scope writes to teamDir", async () => {
    const { teamDir } = await setup();

    const filePath = await store.save({
      name: "Team decision",
      description: "Architecture choice",
      type: "project",
      content: "Using microservices.",
      scope: "team",
    });

    expect(filePath).toContain(teamDir);
    const entry = await store.read(path.basename(filePath), "team");
    expect(entry).not.toBeNull();
    expect(entry!.name).toBe("Team decision");
  });

  // ── Memory types ────────────────────────────────────────────────────────

  it("MEMORY_TYPES constant has 4 types", () => {
    expect(MEMORY_TYPES).toHaveLength(4);
    expect(MEMORY_TYPES).toEqual(["user", "feedback", "project", "reference"]);
  });
});
