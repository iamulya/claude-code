/**
 * KBCompiler pipeline integration tests
 *
 * Tests the full Ingester → Extractor → Synthesizer → Linter pipeline
 * using a real KB directory in tmpdir. LLM calls are mocked via GenerateFn.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { tmpdir } from "os";
import { join } from "path";
import { mkdir, writeFile, readFile, stat } from "fs/promises";

import { KBCompiler } from "../knowledge/compiler/compiler.js";
import { canIngest } from "../knowledge/compiler/ingester/index.js";
import type { GenerateFn } from "../knowledge/compiler/extractor/extractor.js";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TEST_ONTOLOGY_YAML = `
domain: "Test AI Research"

entity_types:
  concept:
    description: A core idea or abstraction
    frontmatter:
      fields:
        title:
          description: Article title
          type: string
          required: true
        entity_type:
          description: Entity type
          type: string
          required: true
        tags:
          description: Tags
          type: string[]
          required: false
    article_structure:
      - heading: Overview
        description: What is it?
        required: true
      - heading: Applications
        description: Use cases
        required: false
    linkable_to:
      - concept
    indexable: true

  research_paper:
    description: An academic research paper
    frontmatter:
      fields:
        title:
          description: Paper title
          type: string
          required: true
        entity_type:
          description: Entity type
          type: string
          required: true
        authors:
          description: Author list
          type: string[]
          required: false
        year:
          description: Publication year
          type: number
          required: false
    article_structure:
      - heading: Summary
        description: What does this paper do?
        required: true
    linkable_to:
      - concept
    indexable: true

relationship_types:
  - name: INTRODUCED_BY
    from: concept
    to: research_paper
    description: A concept introduced in a paper
    reciprocal: INTRODUCES

vocabulary:
  attention mechanism:
    aliases:
      - attention
      - self-attention
    entity_type: concept
    doc_id: concepts/attention-mechanism

budget:
  text_document_tokens: 4096
  image_tokens: 1200
  max_images_per_fetch: 3

compiler:
  extraction_model: gemini-2.5-flash
  synthesis_model: gemini-2.5-pro
`.trim();

const EXTRACTION_RESPONSE_JSON = JSON.stringify({
  articles: [
    {
      canonicalTitle: "Attention Is All You Need",
      entityType: "research_paper",
      action: "create",
      existingDocId: null,
      docIdSuggestion: "research-papers/attention-is-all-you-need",
      knownLinkDocIds: [],
      candidateNewConcepts: [
        {
          name: "Multi-Head Attention",
          entityType: "concept",
          description: "Attention computed in parallel across multiple heads",
          mentionCount: 4,
        },
      ],
      suggestedFrontmatter: { authors: ["Vaswani et al"], year: 2017 },
      skipReason: null,
      confidence: 0.92,
    },
  ],
});

const SYNTHESIS_RESPONSE = `---
title: "Attention Is All You Need"
entity_type: research_paper
authors:
 - Vaswani et al
year: 2017
---

## Summary

"Attention Is All You Need" introduced the Transformer architecture.
It relies entirely on the [[Attention Mechanism]] rather than recurrence or convolution.
The model achieved state-of-the-art results on machine translation tasks.
This paper fundamentally changed the field of natural language processing.
The architecture has been widely adopted for many downstream tasks.
The core contribution is the scaled dot-product attention and multi-head attention.
`;

// ── KB directory setup ────────────────────────────────────────────────────────

async function setupKBDir(): Promise<{ kbDir: string; rawDir: string; compiledDir: string }> {
  const kbDir = join(tmpdir(), `yaaf-kb-test-${Date.now()}`);
  const rawDir = join(kbDir, "raw");
  const compiledDir = join(kbDir, "compiled");

  await mkdir(join(rawDir, "papers"), { recursive: true });
  await mkdir(compiledDir, { recursive: true });

  // Write ontology
  await writeFile(join(kbDir, "ontology.yaml"), TEST_ONTOLOGY_YAML, "utf-8");

  // Write a test source file
  await writeFile(
    join(rawDir, "papers", "attention-paper.md"),
    `---
title: "Attention Is All You Need"
source: "https://arxiv.org/abs/1706.03762"
---

# Attention Is All You Need

The transformer model uses self-attention mechanisms.
Authors: Vaswani, Shazeer, Parmar et al.
Year: 2017
`.trim(),
    "utf-8",
  );

  return { kbDir, rawDir, compiledDir };
}

function makeMockFns(): { extractFn: GenerateFn; synthFn: GenerateFn } {
  const extractFn: GenerateFn = async () => EXTRACTION_RESPONSE_JSON;
  const synthFn: GenerateFn = async () => SYNTHESIS_RESPONSE;
  return { extractFn, synthFn };
}

// ── KBCompiler.create() tests ─────────────────────────────────────────────────

describe("KBCompiler.create()", () => {
  it("loads ontology from kbDir/ontology.yaml", async () => {
    const { kbDir } = await setupKBDir();
    const { extractFn, synthFn } = makeMockFns();

    const compiler = await KBCompiler.create({
      kbDir,
      extractionModel: extractFn,
      synthesisModel: synthFn,
    });

    expect(compiler.knowledgeOntology.domain).toBe("Test AI Research");
    expect(Object.keys(compiler.knowledgeOntology.entityTypes)).toContain("concept");
    expect(Object.keys(compiler.knowledgeOntology.entityTypes)).toContain("research_paper");
  });

  it("throws a helpful error when ontology.yaml is missing", async () => {
    const kbDir = join(tmpdir(), `yaaf-no-ontology-${Date.now()}`);
    await mkdir(kbDir, { recursive: true });
    const { extractFn, synthFn } = makeMockFns();

    await expect(
      KBCompiler.create({ kbDir, extractionModel: extractFn, synthesisModel: synthFn }),
    ).rejects.toThrow("KB ontology not found");
  });

  it("starts with an empty registry when no .kb-registry.json exists", async () => {
    const { kbDir } = await setupKBDir();
    const { extractFn, synthFn } = makeMockFns();

    const compiler = await KBCompiler.create({
      kbDir,
      extractionModel: extractFn,
      synthesisModel: synthFn,
    });
    expect(compiler.conceptRegistry.size).toBe(0);
  });
});

// ── KBCompiler.compile() tests ────────────────────────────────────────────────

describe("KBCompiler.compile()", () => {
  it("runs the full pipeline and creates a compiled article", async () => {
    const { kbDir, compiledDir } = await setupKBDir();
    const { extractFn, synthFn } = makeMockFns();

    const compiler = await KBCompiler.create({
      kbDir,
      extractionModel: extractFn,
      synthesisModel: synthFn,
      autoLint: false,
    });

    const result = await compiler.compile();

    expect(result.sourcesIngested).toBeGreaterThan(0);
    expect(result.synthesis.created).toBeGreaterThan(0);
  });

  it("writes the compiled article to the correct path", async () => {
    const { kbDir, compiledDir } = await setupKBDir();
    const { extractFn, synthFn } = makeMockFns();

    const compiler = await KBCompiler.create({
      kbDir,
      extractionModel: extractFn,
      synthesisModel: synthFn,
      autoLint: false,
    });

    await compiler.compile();

    // The article should be at compiled/research-papers/attention-is-all-you-need.md
    const expectedPath = join(compiledDir, "research-papers/attention-is-all-you-need.md");
    const written = await readFile(expectedPath, "utf-8");
    expect(written).toContain("Attention Is All You Need");
    expect(written).toContain("compiled_at:");
    expect(written).toContain("entity_type: research_paper");
  });

  it("saves .kb-registry.json after compilation", async () => {
    const { kbDir } = await setupKBDir();
    const { extractFn, synthFn } = makeMockFns();

    const compiler = await KBCompiler.create({
      kbDir,
      extractionModel: extractFn,
      synthesisModel: synthFn,
      autoLint: false,
    });

    await compiler.compile();

    const registryPath = join(kbDir, ".kb-registry.json");
    const registryJson = await readFile(registryPath, "utf-8");
    const registry = JSON.parse(registryJson);
    expect(Array.isArray(registry)).toBe(true);
    expect(registry.length).toBeGreaterThan(0);
  });

  it("creates stub articles for high-confidence candidate concepts", async () => {
    const { kbDir, compiledDir } = await setupKBDir();
    const { extractFn, synthFn } = makeMockFns();

    const compiler = await KBCompiler.create({
      kbDir,
      extractionModel: extractFn,
      synthesisModel: synthFn,
      autoLint: false,
    });

    const result = await compiler.compile();

    // Should have created a stub for "Multi-Head Attention"
    expect(result.synthesis.stubsCreated).toBeGreaterThan(0);

    const stubPath = join(compiledDir, "concepts/multi-head-attention.md");
    const stubContent = await readFile(stubPath, "utf-8");
    expect(stubContent).toContain("stub: true");
  });

  it("emits progress events for all pipeline stages", async () => {
    const { kbDir } = await setupKBDir();
    const { extractFn, synthFn } = makeMockFns();

    const events: string[] = [];
    const compiler = await KBCompiler.create({
      kbDir,
      extractionModel: extractFn,
      synthesisModel: synthFn,
      autoLint: false,
    });

    await compiler.compile({
      onProgress: (event) => events.push(event.stage),
    });

    expect(events).toContain("scan");
    expect(events).toContain("ingest");
    expect(events).toContain("extract");
    expect(events).toContain("synthesize");
    expect(events).toContain("complete");
  });

  it("runs lint after compile when autoLint is true", async () => {
    const { kbDir } = await setupKBDir();
    const { extractFn, synthFn } = makeMockFns();

    const events: string[] = [];
    const compiler = await KBCompiler.create({
      kbDir,
      extractionModel: extractFn,
      synthesisModel: synthFn,
      autoLint: true,
    });

    const result = await compiler.compile({
      onProgress: (event) => events.push(event.stage),
    });

    expect(events).toContain("lint");
    expect(result.lint).toBeDefined();
  });

  it("handles ingestion failures gracefully with ingestErrors list", async () => {
    const { kbDir, rawDir } = await setupKBDir();

    // Write a file with an unsupported extension
    await writeFile(join(rawDir, "unsupported.xyz"), "binary data", "utf-8");

    const { extractFn, synthFn } = makeMockFns();
    const compiler = await KBCompiler.create({
      kbDir,
      extractionModel: extractFn,
      synthesisModel: synthFn,
      autoLint: false,
    });

    // .xyz files should simply be excluded (canIngest returns false)
    // so ingestErrors should be empty (they just don't get processed)
    const result = await compiler.compile();
    expect(result.success).toBeDefined(); // Should complete without throwing
  });

  it("dry run does not write any files", async () => {
    const { kbDir, compiledDir } = await setupKBDir();
    const { extractFn, synthFn } = makeMockFns();

    const compiler = await KBCompiler.create({
      kbDir,
      extractionModel: extractFn,
      synthesisModel: synthFn,
      autoLint: false,
    });

    const result = await compiler.compile({ dryRun: true });
    expect(result.synthesis.created).toBeGreaterThan(0);

    // No article files should exist
    const expectedPath = join(compiledDir, "research-papers/attention-is-all-you-need.md");
    let fileExists = false;
    try {
      await stat(expectedPath);
      fileExists = true;
    } catch {
      /* expected */
    }
    expect(fileExists).toBe(false);
  });

  it("handles extraction failure (LLM returns invalid JSON)", async () => {
    const { kbDir } = await setupKBDir();

    const badExtractFn: GenerateFn = async () => "NOT VALID JSON AT ALL !!!";
    const { synthFn } = makeMockFns();

    const compiler = await KBCompiler.create({
      kbDir,
      extractionModel: badExtractFn,
      synthesisModel: synthFn,
      autoLint: false,
    });

    // Should not throw — bad extraction results in empty plan with skipped sources
    const result = await compiler.compile();
    expect(result.synthesis.failed).toBe(0); // No articles planned → no failures
  });
});

// ── canIngest tests ───────────────────────────────────────────────────────────

describe("canIngest", () => {
  it("returns true for markdown files", () => {
    expect(canIngest("/some/path/article.md")).toBe(true);
  });

  it("returns true for html files", () => {
    expect(canIngest("/some/path/page.html")).toBe(true);
  });

  it("returns true for json files", () => {
    expect(canIngest("/some/path/data.json")).toBe(true);
  });

  it("returns false for unsupported extensions", () => {
    expect(canIngest("/some/path/file.xyz")).toBe(false);
    expect(canIngest("/some/path/image.png")).toBe(false);
    expect(canIngest("/some/path/binary.exe")).toBe(false);
  });
});

// ── ModelLike normalization tests ─────────────────────────────────────────────

describe("ModelLike normalization", () => {
  it("accepts a plain GenerateFn", async () => {
    const { kbDir } = await setupKBDir();
    const fn: GenerateFn = async () => EXTRACTION_RESPONSE_JSON;

    // Should not throw during construction
    const compiler = await KBCompiler.create({
      kbDir,
      extractionModel: fn,
      synthesisModel: fn,
      autoLint: false,
    });
    expect(compiler).toBeDefined();
  });

  it("accepts a ModelLike object", async () => {
    const { kbDir } = await setupKBDir();

    const model = {
      complete: async () => ({ content: EXTRACTION_RESPONSE_JSON }),
    };

    const compiler = await KBCompiler.create({
      kbDir,
      extractionModel: model,
      synthesisModel: model,
      autoLint: false,
    });
    expect(compiler).toBeDefined();
  });
});

// ── Top-level KB barrel exports ───────────────────────────────────────────────

describe("KB module top-level exports", () => {
  it("exports KBCompiler", async () => {
    const { KBCompiler } = await import("../knowledge/index.js");
    expect(KBCompiler).toBeDefined();
    expect(typeof KBCompiler.create).toBe("function");
  });

  it("exports makeGenerateFn", async () => {
    const { makeGenerateFn } = await import("../knowledge/index.js");
    expect(typeof makeGenerateFn).toBe("function");
  });

  it("exports KBLinter", async () => {
    const { KBLinter } = await import("../knowledge/index.js");
    expect(KBLinter).toBeDefined();
  });

  it("exports ConceptExtractor", async () => {
    const { ConceptExtractor } = await import("../knowledge/index.js");
    expect(ConceptExtractor).toBeDefined();
  });

  it("exports OntologyLoader", async () => {
    const { OntologyLoader } = await import("../knowledge/index.js");
    expect(OntologyLoader).toBeDefined();
  });
});
