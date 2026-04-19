/**
 * L1-12: Knowledge Pipeline E2E
 *
 * Tests real wiring between KBStore and KBTools.
 */

import { describe, it, expect, afterEach } from "vitest";
import { KBStore, createKBTools } from "../../../knowledge/store/index.js";
import { createTestDir } from "../_fixtures/helpers.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

describe("L1-12: Knowledge Pipeline E2E", () => {
  let cleanup: () => void;
  let dir: string;

  afterEach(() => cleanup?.());

  it("KBStore loads and searches compiled markdown documents", async () => {
    ({ dir, cleanup } = createTestDir());

    // KBStore expects kbDir with a "compiled" subdirectory containing .md files
    const kbDir = join(dir, "kb");
    const compiledDir = join(kbDir, "compiled");
    mkdirSync(compiledDir, { recursive: true });

    // Write compiled markdown documents with YAML frontmatter
    writeFileSync(
      join(compiledDir, "typescript-basics.md"),
      [
        "---",
        "title: TypeScript Basics",
        "entity_type: concept",
        "---",
        "",
        "TypeScript is a typed superset of JavaScript.",
        "It adds static type checking to the language.",
        "Generics allow flexible and reusable components.",
      ].join("\n"),
    );

    writeFileSync(
      join(compiledDir, "react-hooks.md"),
      [
        "---",
        "title: React Hooks",
        "entity_type: concept",
        "---",
        "",
        "React hooks let you use state and lifecycle features in functional components.",
        "useState and useEffect are the most common hooks.",
      ].join("\n"),
    );

    // KBStore constructor: (kbDir, compiledDirName?, pluginHost?, options?)
    // Fix L-4: use eager mode so sync search() works in tests
    const store = new KBStore(kbDir, "compiled", undefined, { maxCachedBodies: Infinity });
    await store.load();

    // Should have loaded 2 documents
    expect(store.size).toBe(2);

    // Search for TypeScript
    const results = store.search("typescript types");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.title).toContain("TypeScript");
    expect(results[0]!.score).toBeGreaterThan(0);
  });

  it("KBStore buildIndex produces structured index", async () => {
    ({ dir, cleanup } = createTestDir());
    const kbDir = join(dir, "kb");
    const compiledDir = join(kbDir, "compiled");
    mkdirSync(compiledDir, { recursive: true });

    writeFileSync(
      join(compiledDir, "node-streams.md"),
      [
        "---",
        "title: Node.js Streams",
        "entity_type: api",
        "---",
        "",
        "Node.js streams are a way to process data in chunks.",
        "They are efficient for handling large amounts of data.",
      ].join("\n"),
    );

    const store = new KBStore(kbDir);
    await store.load();

    const index = store.buildIndex();
    expect(index.totalDocuments).toBe(1);
    expect(index.entries.length).toBe(1);
    expect(index.entries[0]!.title).toContain("Node.js");
    expect(index.totalTokenEstimate).toBeGreaterThan(0);
  });

  it("KBStore formatIndexAsLlmsTxt produces human-readable index", async () => {
    ({ dir, cleanup } = createTestDir());
    const kbDir = join(dir, "kb");
    const compiledDir = join(kbDir, "compiled");
    mkdirSync(compiledDir, { recursive: true });

    writeFileSync(
      join(compiledDir, "testing-patterns.md"),
      [
        "---",
        "title: Testing Patterns",
        "entity_type: guide",
        "---",
        "",
        "Unit tests should be fast and isolated.",
        "Integration tests verify component wiring.",
      ].join("\n"),
    );

    const store = new KBStore(kbDir);
    await store.load();

    const txt = store.formatIndexAsLlmsTxt();
    expect(txt).toContain("Knowledge Base");
    expect(txt).toContain("Testing Patterns");
  });

  it("KBStore search returns empty array for no matches", async () => {
    ({ dir, cleanup } = createTestDir());
    const kbDir = join(dir, "kb");
    const compiledDir = join(kbDir, "compiled");
    mkdirSync(compiledDir, { recursive: true });

    writeFileSync(
      join(compiledDir, "python-basics.md"),
      [
        "---",
        "title: Python Basics",
        "entity_type: concept",
        "---",
        "",
        "Python is a dynamically typed language.",
      ].join("\n"),
    );

    // Fix L-4: use eager mode so sync search() works in tests
    const store = new KBStore(kbDir, "compiled", undefined, { maxCachedBodies: Infinity });
    await store.load();

    const results = store.search("quantum entanglement");
    expect(results.length).toBe(0);
  });

  it("createKBTools produces functional search tool", async () => {
    ({ dir, cleanup } = createTestDir());
    const kbDir = join(dir, "kb");
    const compiledDir = join(kbDir, "compiled");
    mkdirSync(compiledDir, { recursive: true });

    writeFileSync(
      join(compiledDir, "api-reference.md"),
      [
        "---",
        "title: API Reference",
        "entity_type: reference",
        "---",
        "",
        "The API provides CRUD operations for managing resources.",
      ].join("\n"),
    );

    const store = new KBStore(kbDir);
    await store.load();
    const tools = createKBTools(store);

    expect(tools.length).toBeGreaterThan(0);
    // Tool name should contain "kb"
    const hasKbTool = tools.some((t) => t.name.toLowerCase().includes("kb"));
    expect(hasKbTool).toBe(true);
  });
});
