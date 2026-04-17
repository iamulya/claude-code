/**
 * L1-02: Agent + Memory E2E
 *
 * Tests real wiring between MemoryStore and memory strategies.
 */

import { describe, it, expect, afterEach } from "vitest";
import { MemoryStore } from "../../../memory/memoryStore.js";
import { EphemeralBufferStrategy } from "../../../memory/strategies.js";
import { createTestDir } from "../_fixtures/helpers.js";

describe("L1-02: Agent + Memory E2E", () => {
  let cleanup: () => void;
  let dir: string;

  afterEach(() => cleanup?.());

  it("MemoryStore persistence: save → read roundtrip", async () => {
    ({ dir, cleanup } = createTestDir());
    const store = new MemoryStore({ privateDir: dir });
    await store.initialize();

    // Save memories
    await store.save({
      name: "User prefers dark mode",
      description: "Visual preference",
      type: "user",
      content: "The user explicitly stated they prefer dark mode for all interfaces.",
    });
    await store.save({
      name: "TypeScript strict mode",
      description: "Project preference",
      type: "feedback",
      content: "User prefers strict TypeScript mode with no implicit any.",
    });

    // Scan should find both entries
    const entries = await store.scan();
    expect(entries.length).toBe(2);

    // Read back the dark mode entry
    const darkEntry = entries.find((e) => e.filename.includes("dark"));
    expect(darkEntry).toBeDefined();
    const darkMem = await store.read(darkEntry!.filename);
    expect(darkMem).not.toBeNull();
    expect(darkMem!.content).toContain("dark mode");
  });

  it("MemoryStore save → remove → scan verifies removal", async () => {
    ({ dir, cleanup } = createTestDir());
    const store = new MemoryStore({ privateDir: dir });
    await store.initialize();

    await store.save({
      name: "Temporary fact",
      description: "Will be removed",
      type: "project",
      content: "This will be removed.",
    });

    const before = await store.scan();
    expect(before.length).toBe(1);

    await store.remove(before[0]!.filename);

    const after = await store.scan();
    expect(after.length).toBe(0);
  });

  it("MemoryStore GC removes old entries when maxEntries exceeded", async () => {
    ({ dir, cleanup } = createTestDir());
    const store = new MemoryStore({ privateDir: dir, maxEntries: 2 });
    await store.initialize();

    // Save 3 entries (exceeds max of 2)
    await store.save({
      name: "Fact 1",
      description: "First",
      type: "user",
      content: "First fact.",
    });
    // Small delay to ensure different mtime
    await new Promise((r) => setTimeout(r, 50));
    await store.save({
      name: "Fact 2",
      description: "Second",
      type: "user",
      content: "Second fact.",
    });
    await new Promise((r) => setTimeout(r, 50));
    await store.save({
      name: "Fact 3",
      description: "Third",
      type: "user",
      content: "Third fact.",
    });

    const deleted = await store.gc();
    expect(deleted).toBe(1); // Should remove oldest to get to maxEntries=2

    const remaining = await store.scan();
    expect(remaining.length).toBe(2);
  });

  it("MemoryStore getIndex returns MEMORY.md contents", async () => {
    ({ dir, cleanup } = createTestDir());
    const store = new MemoryStore({ privateDir: dir });
    await store.initialize();

    // Set index
    await store.setIndex("# Memory Index\n\nUser prefers dark mode.");

    // Get index
    const { content, wasTruncated } = await store.getIndex();
    expect(content).toContain("dark mode");
    expect(wasTruncated).toBe(false);
  });

  it("MemoryStore buildPrompt returns memory system instructions", () => {
    const store = new MemoryStore({ privateDir: "/fake/dir" });
    const prompt = store.buildPrompt();
    expect(prompt).toContain("Memory");
    expect(prompt).toContain("user");
    expect(prompt).toContain("feedback");
    expect(prompt).toContain("project");
    expect(prompt).toContain("reference");
  });

  it("EphemeralBufferStrategy maintains facts with addFact/retrieve", async () => {
    const buffer = new EphemeralBufferStrategy({ maxFacts: 3 });

    buffer.addFact("User prefers TypeScript.");
    buffer.addFact("Project uses Vitest.");
    buffer.addFact("Deploy to Cloudflare.");
    buffer.addFact("Agent uses YAAF."); // Exceeds max → oldest evicted

    const result = await buffer.retrieve();

    // Should have at most 3 facts (maxFacts=3)
    expect(result.selectedMemories.length).toBeLessThanOrEqual(3);
    expect(result.systemPromptSection).toContain("Working Memory");
  });

  it("EphemeralBufferStrategy reset clears all facts", async () => {
    const buffer = new EphemeralBufferStrategy();
    buffer.addFact("fact1");
    buffer.addFact("fact2");

    buffer.reset();

    const result = await buffer.retrieve();
    expect(result.selectedMemories.length).toBe(0);
  });

});
