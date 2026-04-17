/**
 * KB Linter test suite
 *
 * Tests all 13 static lint checks plus auto-fix and KBLinter orchestration.
 * Uses compiled article fixtures written to a tmpdir — no real KB required.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { tmpdir } from "os";
import { join } from "path";
import { mkdir, writeFile, readFile } from "fs/promises";

import {
  extractWikilinks,
  buildLinkGraph,
  checkMissingEntityType,
  checkUnknownEntityType,
  checkMissingRequiredFields,
  checkInvalidFieldValues,
  checkBrokenWikilinks,
  checkNonCanonicalWikilinks,
  checkUnlinkedMentions,
  checkOrphanedArticle,
  checkLowArticleQuality,
  checkDuplicateCandidates,
} from "../knowledge/compiler/linter/checks.js";
import { parseCompiledArticle, readCompiledArticles } from "../knowledge/compiler/linter/reader.js";
import { applyFixes } from "../knowledge/compiler/linter/fixer.js";
import { KBLinter } from "../knowledge/compiler/linter/linter.js";
import { buildAliasIndex } from "../knowledge/ontology/index.js";
import type { KBOntology, ConceptRegistry } from "../knowledge/ontology/index.js";
import type { ParsedCompiledArticle } from "../knowledge/compiler/linter/reader.js";

// ── Test ontology and registry ────────────────────────────────────────────────

const TEST_ONTOLOGY: KBOntology = {
  domain: "Test AI domain",
  entityTypes: {
    concept: {
      description: "A core idea",
      frontmatter: {
        fields: {
          title: { description: "Title", type: "string", required: true },
          entity_type: { description: "Type", type: "string", required: true },
          status: {
            description: "Status",
            type: "enum",
            required: false,
            enum: ["active", "deprecated"],
          },
        },
      },
      articleStructure: [{ heading: "Overview", description: "What is it?", required: true }],
      linkableTo: ["concept"],
      indexable: true,
    },
    tool: {
      description: "A software tool",
      frontmatter: {
        fields: {
          title: { description: "Title", type: "string", required: true },
          entity_type: { description: "Type", type: "string", required: true },
          homepage: { description: "URL", type: "url", required: false },
        },
      },
      articleStructure: [{ heading: "Overview", description: "What does it do?", required: true }],
      linkableTo: ["concept"],
      indexable: true,
    },
  },
  relationshipTypes: [
    {
      name: "IMPLEMENTS",
      from: "tool",
      to: "concept",
      description: "Tool implements concept",
      reciprocal: "IMPLEMENTED_BY",
    },
  ],
  vocabulary: {
    transformer: {
      aliases: ["transformer model", "transformer architecture"],
      entityType: "concept",
      docId: "concepts/transformer",
    },
    "attention mechanism": {
      aliases: ["attention", "self-attention"],
      entityType: "concept",
      docId: "concepts/attention-mechanism",
    },
    pytorch: {
      aliases: ["torch", "PyTorch"],
      entityType: "tool",
      docId: "tools/pytorch",
    },
  },
  budget: { textDocumentTokens: 4096, imageTokens: 1200, maxImagesPerFetch: 3 },
  compiler: { extractionModel: "gemini-2.5-flash", synthesisModel: "gemini-2.5-pro" },
};

const TEST_REGISTRY: ConceptRegistry = new Map([
  [
    "concepts/transformer",
    {
      docId: "concepts/transformer",
      canonicalTitle: "Transformer",
      entityType: "concept",
      aliases: ["transformer", "transformer model"],
      compiledAt: Date.now(),
      isStub: false,
    },
  ],
  [
    "concepts/attention-mechanism",
    {
      docId: "concepts/attention-mechanism",
      canonicalTitle: "Attention Mechanism",
      entityType: "concept",
      aliases: ["attention mechanism", "self-attention"],
      compiledAt: Date.now(),
      isStub: false,
    },
  ],
  [
    "tools/pytorch",
    {
      docId: "tools/pytorch",
      canonicalTitle: "PyTorch",
      entityType: "tool",
      aliases: ["pytorch", "torch"],
      compiledAt: Date.now(),
      isStub: false,
    },
  ],
]);

const ALIAS_INDEX = buildAliasIndex(TEST_ONTOLOGY);

// ── Article fixtures ──────────────────────────────────────────────────────────

function makeArticle(overrides: Partial<ParsedCompiledArticle> = {}): ParsedCompiledArticle {
  return {
    docId: "concepts/transformer",
    filePath: "/compiled/concepts/transformer.md",
    frontmatter: {
      title: "Transformer",
      entity_type: "concept",
      stub: false,
      compiled_at: "2024-01-01T00:00:00.000Z",
    },
    body: "## Overview\nThe Transformer is a neural network architecture that uses the [[Attention Mechanism]].",
    ...overrides,
  };
}

// ── extractWikilinks ──────────────────────────────────────────────────────────

describe("extractWikilinks", () => {
  it("extracts simple wikilinks", () => {
    const links = extractWikilinks("See [[Attention Mechanism]] for details.");
    expect(links).toHaveLength(1);
    expect(links[0]!.target).toBe("Attention Mechanism");
  });

  it("extracts pipe-style wikilinks (takes target, not display)", () => {
    const links = extractWikilinks("See [[Attention Mechanism|attention]] for details.");
    expect(links[0]!.target).toBe("Attention Mechanism");
  });

  it("extracts multiple wikilinks", () => {
    const links = extractWikilinks("Uses [[Transformer]] and [[PyTorch]].");
    expect(links).toHaveLength(2);
  });

  it("returns empty for text with no wikilinks", () => {
    const links = extractWikilinks("No links here.");
    expect(links).toHaveLength(0);
  });
});

// ── parseCompiledArticle ──────────────────────────────────────────────────────

describe("parseCompiledArticle", () => {
  it("parses frontmatter and body", () => {
    const raw = `---
title: "Transformer"
entity_type: concept
stub: false
---

## Overview
Content here.`;
    const article = parseCompiledArticle("concepts/transformer", "/path/to/file.md", raw);
    expect(article.frontmatter["title"]).toBe("Transformer");
    expect(article.frontmatter["entity_type"]).toBe("concept");
    expect(article.frontmatter["stub"]).toBe(false);
    expect(article.body).toContain("## Overview");
  });

  it("returns empty frontmatter for articles without frontmatter", () => {
    const raw = "## Overview\nContent here.";
    const article = parseCompiledArticle("concepts/test", "/path/to/file.md", raw);
    expect(article.frontmatter).toEqual({});
    expect(article.body).toContain("## Overview");
  });

  it("parses array frontmatter fields", () => {
    const raw = `---
tags:
 - nlp
 - ml
---
content`;
    const article = parseCompiledArticle("concepts/t", "/f.md", raw);
    expect(Array.isArray(article.frontmatter["tags"])).toBe(true);
    expect(article.frontmatter["tags"] as string[]).toContain("nlp");
  });
});

// ── MISSING_ENTITY_TYPE ───────────────────────────────────────────────────────

describe("checkMissingEntityType", () => {
  it("returns null when entity_type is present", () => {
    const article = makeArticle({ frontmatter: { title: "T", entity_type: "concept" } });
    expect(checkMissingEntityType(article)).toBeNull();
  });

  it("returns issue when entity_type is missing", () => {
    const article = makeArticle({ frontmatter: { title: "T" } });
    const issue = checkMissingEntityType(article);
    expect(issue).not.toBeNull();
    expect(issue!.code).toBe("MISSING_ENTITY_TYPE");
    expect(issue!.severity).toBe("error");
  });

  it("returns issue when entity_type is empty string", () => {
    const article = makeArticle({ frontmatter: { title: "T", entity_type: "" } });
    const issue = checkMissingEntityType(article);
    expect(issue?.code).toBe("MISSING_ENTITY_TYPE");
  });
});

// ── UNKNOWN_ENTITY_TYPE ───────────────────────────────────────────────────────

describe("checkUnknownEntityType", () => {
  it("returns null for valid entity type", () => {
    const article = makeArticle();
    expect(checkUnknownEntityType(article, TEST_ONTOLOGY)).toBeNull();
  });

  it("returns issue for unknown entity type", () => {
    const article = makeArticle({ frontmatter: { title: "T", entity_type: "NONEXISTENT" } });
    const issue = checkUnknownEntityType(article, TEST_ONTOLOGY);
    expect(issue?.code).toBe("UNKNOWN_ENTITY_TYPE");
    expect(issue?.severity).toBe("error");
  });
});

// ── MISSING_REQUIRED_FIELD ────────────────────────────────────────────────────

describe("checkMissingRequiredFields", () => {
  it("returns no issues when all required fields present", () => {
    const article = makeArticle();
    const issues = checkMissingRequiredFields(article, TEST_ONTOLOGY);
    expect(issues).toHaveLength(0);
  });

  it("returns issue when required field is missing", () => {
    const article = makeArticle({ frontmatter: { entity_type: "concept" } });
    const issues = checkMissingRequiredFields(article, TEST_ONTOLOGY);
    expect(issues.some((i) => i.field?.includes("title"))).toBe(true);
  });
});

// ── INVALID_FIELD_VALUE ───────────────────────────────────────────────────────

describe("checkInvalidFieldValues", () => {
  it("returns no issues for valid enum value", () => {
    const article = makeArticle({
      frontmatter: { title: "T", entity_type: "concept", status: "active" },
    });
    const issues = checkInvalidFieldValues(article, TEST_ONTOLOGY);
    expect(issues).toHaveLength(0);
  });

  it("returns issue for invalid enum value", () => {
    const article = makeArticle({
      frontmatter: { title: "T", entity_type: "concept", status: "invalid_status" },
    });
    const issues = checkInvalidFieldValues(article, TEST_ONTOLOGY);
    expect(
      issues.some((i) => i.code === "INVALID_FIELD_VALUE" && i.field?.includes("status")),
    ).toBe(true);
  });
});

// ── BROKEN_WIKILINK ───────────────────────────────────────────────────────────

describe("checkBrokenWikilinks", () => {
  it("returns no issues for valid wikilinks", () => {
    const article = makeArticle({
      body: "Uses [[Attention Mechanism]] as its core.",
    });
    const issues = checkBrokenWikilinks(article, TEST_REGISTRY);
    expect(issues).toHaveLength(0);
  });

  it("returns issue for unresolvable wikilink", () => {
    const article = makeArticle({
      body: "Uses [[NonExistentConcept]] as its core.",
    });
    const issues = checkBrokenWikilinks(article, TEST_REGISTRY);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.code).toBe("BROKEN_WIKILINK");
    expect(issues[0]!.severity).toBe("error");
    expect(issues[0]!.relatedTarget).toBe("NonExistentConcept");
  });

  it("resolves wikilinks by alias", () => {
    const article = makeArticle({
      body: "Uses [[self-attention]] as its core.",
    });
    // "self-attention" is an alias for "Attention Mechanism"
    const issues = checkBrokenWikilinks(article, TEST_REGISTRY);
    expect(issues).toHaveLength(0);
  });
});

// ── NON_CANONICAL_WIKILINK ────────────────────────────────────────────────────

describe("checkNonCanonicalWikilinks", () => {
  it("returns no issues for canonical wikilinks", () => {
    const article = makeArticle({
      body: "Uses [[Attention Mechanism]].",
    });
    const issues = checkNonCanonicalWikilinks(article, TEST_REGISTRY, ALIAS_INDEX);
    expect(issues).toHaveLength(0);
  });

  it("returns issue when using alias instead of canonical title", () => {
    const article = makeArticle({
      body: "Uses [[self-attention]].",
    });
    const issues = checkNonCanonicalWikilinks(article, TEST_REGISTRY, ALIAS_INDEX);
    expect(issues.some((i) => i.code === "NON_CANONICAL_WIKILINK")).toBe(true);
  });

  it("marks the issue as auto-fixable with a fix object", () => {
    const article = makeArticle({ body: "Uses [[self-attention]]." });
    const issues = checkNonCanonicalWikilinks(article, TEST_REGISTRY, ALIAS_INDEX);
    const issue = issues.find((i) => i.code === "NON_CANONICAL_WIKILINK")!;
    expect(issue.autoFixable).toBe(true);
    expect(issue.fix).toBeDefined();
    expect(issue.fix!.findText).toBe("[[self-attention]]");
    expect(issue.fix!.replaceWith).toBe("[[Attention Mechanism]]");
  });
});

// ── UNLINKED_MENTION ──────────────────────────────────────────────────────────

describe("checkUnlinkedMentions", () => {
  it("returns no issues when all mentions are wikilinked", () => {
    const article = makeArticle({
      body: "The [[Transformer]] uses the [[Attention Mechanism]].",
    });
    const issues = checkUnlinkedMentions(article, TEST_ONTOLOGY, TEST_REGISTRY, ALIAS_INDEX);
    expect(issues).toHaveLength(0);
  });

  it("detects unlinked entity mentions", () => {
    const article = makeArticle({
      body: "The transformer uses attention mechanism without any wikilinks.",
    });
    const issues = checkUnlinkedMentions(article, TEST_ONTOLOGY, TEST_REGISTRY, ALIAS_INDEX);
    expect(issues.some((i) => i.code === "UNLINKED_MENTION")).toBe(true);
  });

  it("marks UNLINKED_MENTION as auto-fixable", () => {
    const article = makeArticle({
      body: "The transformer uses the attention mechanism.",
    });
    const issues = checkUnlinkedMentions(article, TEST_ONTOLOGY, TEST_REGISTRY, ALIAS_INDEX);
    const issue = issues.find((i) => i.code === "UNLINKED_MENTION");
    expect(issue?.autoFixable).toBe(true);
    expect(issue?.fix?.firstOccurrenceOnly).toBe(true);
  });

  it("does not flag self-references", () => {
    // An article about Transformer shouldn't get UNLINKED_MENTION for "Transformer"
    const article = makeArticle({
      docId: "concepts/transformer",
      body: "The transformer architecture is widely used.",
    });
    const issues = checkUnlinkedMentions(article, TEST_ONTOLOGY, TEST_REGISTRY, ALIAS_INDEX);
    const transformerIssues = issues.filter((i) => i.relatedTarget === "concepts/transformer");
    expect(transformerIssues).toHaveLength(0);
  });
});

// ── ORPHANED_ARTICLE ──────────────────────────────────────────────────────────

describe("checkOrphanedArticle", () => {
  it("returns null for article with incoming links", () => {
    const article = makeArticle({ docId: "concepts/attention-mechanism" });
    const articles = [
      article,
      makeArticle({ docId: "concepts/transformer", body: "Uses [[Attention Mechanism]]." }),
    ];
    const graph = buildLinkGraph(articles, TEST_REGISTRY);
    const issue = checkOrphanedArticle(article, graph);
    expect(issue).toBeNull();
  });

  it("returns issue for article with no incoming links", () => {
    // Use an article whose body has NO wikilinks pointing back to it
    const article = makeArticle({
      docId: "concepts/attention-mechanism",
      body: "This article has no wikilinks to others.",
    });
    const articles = [article];
    const graph = buildLinkGraph(articles, TEST_REGISTRY);
    const issue = checkOrphanedArticle(article, graph);
    expect(issue?.code).toBe("ORPHANED_ARTICLE");
  });

  it("does not flag stub articles as orphans", () => {
    const article = makeArticle({
      docId: "concepts/attention-mechanism",
      frontmatter: { title: "Attention", entity_type: "concept", stub: true },
    });
    const graph = buildLinkGraph([article], TEST_REGISTRY);
    const issue = checkOrphanedArticle(article, graph);
    expect(issue).toBeNull();
  });
});

// ── LOW_ARTICLE_QUALITY ───────────────────────────────────────────────────────

describe("checkLowArticleQuality", () => {
  it("returns null for articles with enough words", () => {
    const article = makeArticle({ body: "A ".repeat(100) });
    expect(checkLowArticleQuality(article, 50)).toBeNull();
  });

  it("returns issue for very short non-stub articles", () => {
    const article = makeArticle({ body: "Short." });
    const issue = checkLowArticleQuality(article, 50);
    expect(issue?.code).toBe("LOW_ARTICLE_QUALITY");
  });

  it("returns null for stubs regardless of word count", () => {
    const article = makeArticle({
      body: "Short.",
      frontmatter: { title: "T", entity_type: "concept", stub: true },
    });
    expect(checkLowArticleQuality(article, 50)).toBeNull();
  });
});

// ── DUPLICATE_CANDIDATE ───────────────────────────────────────────────────────

describe("checkDuplicateCandidates", () => {
  it("detects very similar titles", () => {
    const articles = [
      makeArticle({
        docId: "concepts/a",
        frontmatter: { title: "Attention Mechanism", entity_type: "concept" },
      }),
      makeArticle({
        docId: "concepts/b",
        frontmatter: { title: "Attention Mechanisms", entity_type: "concept" },
      }),
    ];
    const issues = checkDuplicateCandidates(articles, 0.15);
    expect(issues.some((i) => i.code === "DUPLICATE_CANDIDATE")).toBe(true);
  });

  it("does not flag clearly different titles", () => {
    const articles = [
      makeArticle({
        docId: "concepts/a",
        frontmatter: { title: "Transformer", entity_type: "concept" },
      }),
      makeArticle({
        docId: "concepts/b",
        frontmatter: { title: "Recurrent Neural Network", entity_type: "concept" },
      }),
    ];
    const issues = checkDuplicateCandidates(articles, 0.15);
    expect(issues).toHaveLength(0);
  });
});

// ── applyFixes ────────────────────────────────────────────────────────────────

describe("applyFixes", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = join(tmpdir(), `yaaf-linter-test-${Date.now()}`);
    await mkdir(join(tmpDir, "concepts"), { recursive: true });
  });

  it("fixes NON_CANONICAL_WIKILINK in the file", async () => {
    const content = '---\ntitle: "T"\nentity_type: concept\n---\nUses [[self-attention]].';
    await writeFile(join(tmpDir, "concepts/transformer.md"), content, "utf-8");

    const issue = {
      code: "NON_CANONICAL_WIKILINK" as const,
      severity: "warning" as const,
      message: "test",
      docId: "concepts/transformer",
      autoFixable: true,
      fix: {
        findText: "[[self-attention]]",
        replaceWith: "[[Attention Mechanism]]",
        firstOccurrenceOnly: false,
      },
    };

    const result = await applyFixes([issue], tmpDir);
    expect(result.fixedCount).toBe(1);

    const fixed = await readFile(join(tmpDir, "concepts/transformer.md"), "utf-8");
    expect(fixed).toContain("[[Attention Mechanism]]");
    expect(fixed).not.toContain("[[self-attention]]");
  });

  it("fixes UNLINKED_MENTION (first occurrence only)", async () => {
    const content =
      '---\ntitle: "T"\nentity_type: concept\n---\nThe transformer is a transformer model.';
    await writeFile(join(tmpDir, "concepts/attention.md"), content, "utf-8");

    const issue = {
      code: "UNLINKED_MENTION" as const,
      severity: "info" as const,
      message: "test",
      docId: "concepts/attention",
      autoFixable: true,
      fix: { findText: "transformer", replaceWith: "[[Transformer]]", firstOccurrenceOnly: true },
    };

    const result = await applyFixes([issue], tmpDir);
    expect(result.fixedCount).toBe(1);

    const fixed = await readFile(join(tmpDir, "concepts/attention.md"), "utf-8");
    // First occurrence should be linked
    expect(fixed).toContain("[[Transformer]]");
    // Second occurrence should NOT be linked (firstOccurrenceOnly: true)
    expect(fixed).toContain("a transformer model");
  });

  it("skips issues where target text not found", async () => {
    const content = '---\ntitle: "T"\nentity_type: concept\n---\nNo matches here.';
    await writeFile(join(tmpDir, "concepts/empty.md"), content, "utf-8");

    const issue = {
      code: "NON_CANONICAL_WIKILINK" as const,
      severity: "warning" as const,
      message: "test",
      docId: "concepts/empty",
      autoFixable: true,
      fix: { findText: "[[nonexistent]]", replaceWith: "[[Other]]", firstOccurrenceOnly: false },
    };

    const result = await applyFixes([issue], tmpDir);
    expect(result.fixedCount).toBe(0);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0]!.reason).toContain("not found");
  });

  it("dry run does not write files", async () => {
    const content = '---\ntitle: "T"\nentity_type: concept\n---\nUses [[self-attention]].';
    await writeFile(join(tmpDir, "concepts/dryrun.md"), content, "utf-8");

    const issue = {
      code: "NON_CANONICAL_WIKILINK" as const,
      severity: "warning" as const,
      message: "test",
      docId: "concepts/dryrun",
      autoFixable: true,
      fix: {
        findText: "[[self-attention]]",
        replaceWith: "[[Attention Mechanism]]",
        firstOccurrenceOnly: false,
      },
    };

    const result = await applyFixes([issue], tmpDir, true /* dryRun */);
    expect(result.fixedCount).toBe(1); // Still reports as fixed...

    const unchanged = await readFile(join(tmpDir, "concepts/dryrun.md"), "utf-8");
    expect(unchanged).toContain("[[self-attention]]"); // ...but file unchanged
  });
});

// ── KBLinter integration ──────────────────────────────────────────────────────

describe("KBLinter integration", () => {
  let compiledDir: string;

  beforeEach(async () => {
    compiledDir = join(tmpdir(), `yaaf-kblinter-test-${Date.now()}`);
    await mkdir(join(compiledDir, "concepts"), { recursive: true });
    await mkdir(join(compiledDir, "tools"), { recursive: true });
  });

  async function writeArticle(docId: string, content: string) {
    await writeFile(join(compiledDir, `${docId}.md`), content, "utf-8");
  }

  it("produces a report with correct article count", async () => {
    await writeArticle(
      "concepts/transformer",
      [
        "---",
        'title: "Transformer"',
        "entity_type: concept",
        "stub: false",
        'compiled_at: "2024-01-01"',
        "compiled_from: []",
        "confidence: 0.9",
        "---",
        "",
        "## Overview",
        "The Transformer uses [[Attention Mechanism]]. " + "word ".repeat(60),
      ].join("\n"),
    );

    await writeArticle(
      "concepts/attention-mechanism",
      [
        "---",
        'title: "Attention Mechanism"',
        "entity_type: concept",
        "stub: false",
        'compiled_at: "2024-01-01"',
        "compiled_from: []",
        "confidence: 0.9",
        "---",
        "",
        "## Overview",
        "Attention is the core of the [[Transformer]]. " + "word ".repeat(60),
      ].join("\n"),
    );

    const linter = new KBLinter(TEST_ONTOLOGY, TEST_REGISTRY, compiledDir);
    const report = await linter.lint({ skipDocIds: ["tools/pytorch"] });

    expect(report.articlesChecked).toBe(2);
    expect(report.generatedAt).toBeGreaterThan(0);
  });

  it("detects BROKEN_WIKILINK in compiled articles", async () => {
    await writeArticle(
      "concepts/transformer",
      [
        "---",
        'title: "Transformer"',
        "entity_type: concept",
        "stub: false",
        'compiled_at: "2024-01-01"',
        "compiled_from: []",
        "confidence: 0.9",
        "---",
        "",
        "## Overview",
        "Uses [[NonExistentThing]]. " + "word ".repeat(60),
      ].join("\n"),
    );

    const miniRegistry: ConceptRegistry = new Map([
      ["concepts/transformer", TEST_REGISTRY.get("concepts/transformer")!],
    ]);

    const linter = new KBLinter(TEST_ONTOLOGY, miniRegistry, compiledDir);
    const report = await linter.lint();

    expect(report.issues.some((i) => i.code === "BROKEN_WIKILINK")).toBe(true);
    expect(report.summary.errors).toBeGreaterThan(0);
  });

  it("lint + fix cycle resolves NON_CANONICAL_WIKILINK", async () => {
    await writeArticle(
      "concepts/transformer",
      [
        "---",
        'title: "Transformer"',
        "entity_type: concept",
        "stub: false",
        'compiled_at: "2024-01-01"',
        "compiled_from: []",
        "confidence: 0.9",
        "---",
        "",
        "## Overview",
        "Uses [[self-attention]] as its core. " + "word ".repeat(60),
      ].join("\n"),
    );

    const miniRegistry: ConceptRegistry = new Map([
      ["concepts/transformer", TEST_REGISTRY.get("concepts/transformer")!],
      ["concepts/attention-mechanism", TEST_REGISTRY.get("concepts/attention-mechanism")!],
    ]);

    const linter = new KBLinter(TEST_ONTOLOGY, miniRegistry, compiledDir);
    const report = await linter.lint();

    const canonicalIssues = report.issues.filter((i) => i.code === "NON_CANONICAL_WIKILINK");
    expect(canonicalIssues.length).toBeGreaterThan(0);
    expect(report.summary.autoFixable).toBeGreaterThan(0);

    // Apply fixes
    const fixResult = await linter.fix(report);
    expect(fixResult.fixedCount).toBeGreaterThan(0);

    // Verify the file was updated
    const fixed = await readFile(join(compiledDir, "concepts/transformer.md"), "utf-8");
    expect(fixed).toContain("[[Attention Mechanism]]");
    expect(fixed).not.toContain("[[self-attention]]");
  });
});
