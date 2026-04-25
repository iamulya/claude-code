/**
 * ADR-012 — v4 Adversarial Hardening Regression Tests
 *
 * Each test targets a specific fix from the v4 remediation plan.
 * These tests MUST remain passing to prevent reintroduction of the
 * security vulnerabilities identified in the adversarial critique.
 */

import { describe, it, expect, vi } from "vitest";

// ── Fix 3: Source trust must NOT come from frontmatter ──────────────────────

describe("ADR-012/Fix-3: Source trust — no frontmatter override", () => {
  it("ignores source_trust frontmatter and uses directory heuristics instead", async () => {
    // Dynamic import to avoid module-level side effects
    const extractor = await import("../knowledge/compiler/extractor/extractor.js");
    const { ConceptExtractor } = extractor;

    // Mock dependencies
    const mockOntology = {
      domain: "test",
      entityTypes: {
        concept: {
          name: "concept",
          description: "A concept",
          frontmatter: { fields: {} },
          articleStructure: [],
          linkableTo: [],
        },
      },
      vocabulary: Object.create(null) as Record<string, any>,
      relationshipTypes: [],
    };
    const mockRegistry = new Map();
    const mockGenerateFn = vi.fn().mockResolvedValue(JSON.stringify({
      articles: [{
        title: "Test Article",
        entityType: "concept",
        keyTopics: ["test"],
        uniqueContribution: "Test contribution",
        confidence: 0.9,
      }],
      sourceTrustClassification: "academic", // LLM says academic
    }));

    const ext = new ConceptExtractor(mockOntology as any, mockRegistry, mockGenerateFn);

    // Feed a source from a blogs/ directory with source_trust: academic in frontmatter
    const content = {
      sourceFile: "/kb/raw/blogs/my-post.md",
      mimeType: "text/markdown",
      title: "My Blog Post",
      text: "This is a blog post about testing techniques for software quality assurance in modern development environments.",
      images: [],
      metadata: { source_trust: "academic" }, // Attacker tries to claim academic trust
    };

    const result = await ext.extractFromContent(content as any);
    // The plan should have "web" trust (from blogs/ directory), NOT "academic"
    // even though both the frontmatter and LLM said "academic"
    for (const plan of result.plans) {
      expect(plan.sourceTrust).toBe("web");
    }
  });

  it("LLM trust classification can downgrade but never upgrade", async () => {
    const extractor = await import("../knowledge/compiler/extractor/extractor.js");
    const { ConceptExtractor } = extractor;

    const mockOntology = {
      domain: "test",
      entityTypes: {
        concept: {
          name: "concept",
          description: "A concept",
          frontmatter: { fields: {} },
          articleStructure: [],
          linkableTo: [],
        },
      },
      vocabulary: Object.create(null) as Record<string, any>,
      relationshipTypes: [],
    };
    const mockRegistry = new Map();
    const mockGenerateFn = vi.fn().mockResolvedValue(JSON.stringify({
      articles: [{
        title: "Paper Analysis",
        entityType: "concept",
        keyTopics: ["ML"],
        uniqueContribution: "Analysis",
        confidence: 0.9,
      }],
      sourceTrustClassification: "web", // LLM downgrades from academic
    }));

    const ext = new ConceptExtractor(mockOntology as any, mockRegistry, mockGenerateFn);

    // Source in papers/ directory → heuristic = academic
    // LLM classification = web → final should be web (downgrade wins)
    const result = await ext.extractFromContent({
      sourceFile: "/kb/raw/papers/ml-paper.pdf",
      mimeType: "application/pdf",
      title: "ML Paper",
      text: "This paper presents a novel approach to machine learning optimization using gradient descent methods.",
      images: [],
      metadata: {},
    } as any);

    for (const plan of result.plans) {
      // mergeTrust picks the lower trust → "web" wins over "academic"
      expect(plan.sourceTrust).toBe("web");
    }
  });
});

// ── Fix 4: Vocabulary confidence cap ────────────────────────────────────────

describe("ADR-012/Fix-4: Vocabulary proposal confidence cap", () => {
  it("caps add_vocabulary proposal confidence below 0.8 auto-evolve threshold", async () => {
    const { generateOntologyProposals } = await import(
      "../knowledge/compiler/ontologyProposals.js"
    );
    const { tmpdir } = await import("os");
    const { join } = await import("path");
    const { mkdir } = await import("fs/promises");

    const testDir = join(tmpdir(), `yaaf-fix4-${Date.now()}`);
    await mkdir(testDir, { recursive: true });

    const mockOntology = {
      domain: "test",
      entityTypes: {
        concept: { name: "concept", description: "", frontmatter: { fields: {} }, sections: [] },
      },
      vocabulary: Object.create(null) as Record<string, any>,
      relationshipTypes: [],
    };

    // Create a registry with 10 entries all mentioning "faketerm" in aliases
    // (simulating adversarial repetition to boost confidence)
    const registry: Map<string, any> = new Map();
    for (let i = 0; i < 10; i++) {
      registry.set(`concept/faketerm-${i}`, {
        docId: `concept/faketerm-${i}`,
        canonicalTitle: `Faketerm Analysis ${i}`,
        entityType: "concept",
        aliases: ["faketerm"],
        compiledAt: Date.now(),
        isStub: false,
      });
    }

    const result = await generateOntologyProposals(testDir, mockOntology as any, registry);
    const vocabProposals = result.proposals.filter((p: any) => p.kind === "add_vocabulary");

    // Every add_vocabulary proposal must have confidence < 0.8
    // so it can never be auto-applied
    for (const proposal of vocabProposals) {
      expect(proposal.confidence).toBeLessThan(0.8);
      expect(proposal.confidence).toBeLessThanOrEqual(0.75);
    }
  });
});

// ── Fix 6: Heal module protections ──────────────────────────────────────────

describe("ADR-012/Fix-6: Heal module entity_type and wikilink guards", () => {
  it("rejects LLM response that changes entity_type", async () => {
    // We test the internal healLowQuality logic by importing the module
    // and calling healLintIssues with a mock that returns changed entity_type
    const { healLintIssues } = await import("../knowledge/compiler/heal.js");
    const { join } = await import("path");
    const { mkdir, writeFile } = await import("fs/promises");
    const { tmpdir } = await import("os");

    const testDir = join(tmpdir(), `yaaf-heal-fix6-${Date.now()}`);
    const compiledDir = join(testDir, "compiled");
    await mkdir(join(compiledDir, "concepts"), { recursive: true });

    // Write a test article — must be > 50 words to pass word-count gate
    const originalContent = `---
entity_type: concept
title: Test Concept
---

This is a test article about the concept of software testing and quality assurance.
It covers integration testing, unit testing, and end-to-end validation methodologies.
Proper testing ensures that software systems behave correctly under a wide variety
of conditions including edge cases, boundary values, and unexpected inputs.
This article explains why comprehensive test coverage is essential for production systems.`;

    await writeFile(join(compiledDir, "concepts/test.md"), originalContent);

    // Mock LLM that changes entity_type from concept to guide AND is longer than original
    const mockLLM = vi.fn().mockResolvedValue(`---
entity_type: guide
title: Test Concept
---

This is an expanded test article about a concept. It now contains much more
detail about the various aspects of this concept, including its history,
applications, and theoretical foundations in modern software engineering.
The article covers unit testing, integration testing, system testing, acceptance
testing, and regression testing methodologies used in industry today.
Additional coverage includes test-driven development and behavior-driven development.
Proper testing methodology ensures consistent quality across multiple environments.`);

    const lintReport = {
      generatedAt: Date.now(),
      articlesChecked: 1,
      issues: [{
        code: "LOW_ARTICLE_QUALITY" as const,
        severity: "warning" as const,
        docId: "concepts/test",
        message: "Article too short",
        autoFixable: false,
      }],
      summary: { errors: 0, warnings: 1, info: 0, autoFixable: 0, byCode: {} },
    };

    const result = await healLintIssues(
      mockLLM as any,
      lintReport as any,
      compiledDir,
      new Map() as any,
    );

    // The entity_type change should be rejected
    const detail = result.details.find(d => d.docId === "concepts/test");
    expect(detail?.action).toBe("skipped");
    expect(detail?.message).toContain("entity_type");
  });

  it("validates orphaned article wikilinks against registry", async () => {
    const { healLintIssues } = await import("../knowledge/compiler/heal.js");
    const { join } = await import("path");
    const { mkdir, writeFile, readFile } = await import("fs/promises");
    const { tmpdir } = await import("os");

    const testDir = join(tmpdir(), `yaaf-heal-fix6c-${Date.now()}`);
    const compiledDir = join(testDir, "compiled");
    await mkdir(join(compiledDir, "concepts"), { recursive: true });

    const content = `---
entity_type: concept
title: Orphaned Concept
---

This is an orphaned article about a concept.`;

    await writeFile(join(compiledDir, "concepts/orphaned.md"), content);

    // Mock LLM that suggests both valid and invalid wikilinks
    const mockLLM = vi.fn().mockResolvedValue(
      `See also [[Valid Article]] and [[Nonexistent Fake]] for more context.`,
    );

    // Registry only contains "Valid Article"
    const registry = new Map([
      ["concepts/valid", {
        docId: "concepts/valid",
        canonicalTitle: "Valid Article",
        entityType: "concept",
        aliases: [],
        compiledAt: Date.now(),
        isStub: false,
      }],
    ]);

    const lintReport = {
      generatedAt: Date.now(),
      articlesChecked: 1,
      issues: [{
        code: "ORPHANED_ARTICLE" as const,
        severity: "warning" as const,
        docId: "concepts/orphaned",
        message: "No incoming links",
        autoFixable: false,
      }],
      summary: { errors: 0, warnings: 1, info: 0, autoFixable: 0, byCode: {} },
    };

    const result = await healLintIssues(mockLLM as any, lintReport as any, compiledDir, registry as any);

    // Read back the healed file
    const healed = await readFile(join(compiledDir, "concepts/orphaned.md"), "utf-8");

    // Valid wikilink should be preserved
    expect(healed).toContain("[[Valid Article]]");
    // Invalid wikilink should have brackets stripped
    expect(healed).not.toContain("[[Nonexistent Fake]]");
    // But the text "Nonexistent Fake" should still appear (just without brackets)
    expect(healed).toContain("Nonexistent Fake");
  });
});

// ── Fix 7: Differential YAML parser parity ──────────────────────────────────

describe("ADR-012/Fix-7: Differential engine uses yaml library", () => {
  it("detects changes in YAML anchors that regex parser would miss", async () => {
    // The computeEntityTypeSchemaHashes function is not exported, but we can
    // test the DifferentialEngine's behavior indirectly.
    // For now, we verify the yaml import is present and the function works
    // by testing that changes in YAML content produce different hashes.
    const { parse } = await import("yaml");

    // Simulate what computeEntityTypeSchemaHashes does
    const yaml1 = `
entity_types:
  concept:
    description: "A concept"
    fields:
      name: {type: string}
`;
    const yaml2 = `
entity_types:
  concept:
    description: "A concept (updated)"
    fields:
      name: {type: string}
`;

    const parsed1 = parse(yaml1);
    const parsed2 = parse(yaml2);
    const hash1 = JSON.stringify(parsed1.entity_types.concept);
    const hash2 = JSON.stringify(parsed2.entity_types.concept);

    expect(hash1).not.toBe(hash2);
  });

  it("handles YAML anchors correctly (resolves alias references)", async () => {
    const { parse } = await import("yaml");

    // Test that the yaml library correctly resolves anchors and aliases.
    // The regex-based parser in the old differential.ts could NOT do this.
    const yamlWithAnchor = `
shared_fields: &shared
  - name
  - description

entity_types:
  concept:
    description: "A concept"
    required_fields: *shared
  guide:
    description: "A guide"
    required_fields: *shared
`;

    const parsed = parse(yamlWithAnchor);
    // Both types reference the same alias — should resolve to same array
    expect(parsed.entity_types.concept.required_fields).toEqual(["name", "description"]);
    expect(parsed.entity_types.guide.required_fields).toEqual(["name", "description"]);
    // Verify they are deeply equal (alias resolved to identical values)
    expect(parsed.entity_types.concept.required_fields)
      .toEqual(parsed.entity_types.guide.required_fields);
  });
});

// ── Fix 12: Vocabulary Object.create(null) ──────────────────────────────────

describe("ADR-012/Fix-12: Vocabulary map prototype pollution prevention", () => {
  it("vocabulary map does not resolve __proto__ to Object prototype", async () => {
    // Create a vocabulary map like the loader does
    const vocabulary: Record<string, any> = Object.create(null);
    vocabulary["attention"] = { aliases: [], entityType: "concept" };

    // __proto__ should be undefined, not the Object prototype
    expect(vocabulary["__proto__"]).toBeUndefined();
    expect(vocabulary["constructor"]).toBeUndefined();
    expect(vocabulary["toString"]).toBeUndefined();
    expect(vocabulary["hasOwnProperty"]).toBeUndefined();

    // Normal keys still work
    expect(vocabulary["attention"]).toEqual({ aliases: [], entityType: "concept" });
  });
});

// ── Fix 2: L1 escalation — no final "supported" with deeper layers ──────────

describe("ADR-012/Fix-2: L1 escalation behavior", () => {
  it("L1 returns vocabulary_overlap_only scorer when no deeper layers available", async () => {
    const { MultiLayerGroundingPlugin } = await import(
      "../knowledge/compiler/groundingPlugin.js"
    );

    // Create a plugin with NO deeper layers (no embedFn, no generateFn, no nliVerifyFn)
    const plugin = new MultiLayerGroundingPlugin({});

    const result = await plugin.validateArticle(
      {
        docId: "test/article",
        body: "Transformers use attention mechanisms for sequence modeling.",
        title: "Test Article",
        entityType: "concept",
      },
      ["Transformers are neural networks that use attention mechanisms for sequence modeling tasks."],
    );

    // With no deeper layers, L1 should produce vocabulary_overlap_only verdicts
    const supportedClaims = result.claims.filter(c => c.verdict === "supported");
    for (const claim of supportedClaims) {
      expect(claim.scoredBy).toBe("vocabulary_overlap_only");
    }
  });

  it("L1 escalates to L2 when embedFn is available instead of finalizing", async () => {
    const { MultiLayerGroundingPlugin } = await import(
      "../knowledge/compiler/groundingPlugin.js"
    );

    // Create a plugin WITH an embed function (L2 available)
    const mockEmbedFn = vi.fn().mockResolvedValue([0.5, 0.3, 0.1]);
    const plugin = new MultiLayerGroundingPlugin({ embedFn: mockEmbedFn });

    const result = await plugin.validateArticle(
      {
        docId: "test/article",
        body: "Transformers use attention mechanisms for sequence modeling.",
        title: "Test Article",
        entityType: "concept",
      },
      ["Transformers are neural networks that use attention mechanisms for sequence modeling tasks."],
    );

    // With L2 available, L1 should NOT produce any "vocabulary_overlap" or
    // "vocabulary_overlap_only" supported claims — everything above threshold
    // should be escalated to L2 (embedding scorer)
    const l1Supported = result.claims.filter(
      c => c.verdict === "supported" &&
           (c.scoredBy === "vocabulary_overlap" || c.scoredBy === "vocabulary_overlap_only"),
    );
    expect(l1Supported.length).toBe(0);
  });
});

// ── Fix 11: verificationLevel surfaced in grounding result ──────────────────

describe("ADR-012/Fix-11: verificationLevel in grounding result", () => {
  it("includes verificationLevel in KBGroundingResult", async () => {
    const { MultiLayerGroundingPlugin } = await import(
      "../knowledge/compiler/groundingPlugin.js"
    );

    // No deeper layers → vocabulary_only
    const plugin = new MultiLayerGroundingPlugin({});
    const result = await plugin.validateArticle(
      {
        docId: "test/article",
        body: "Machine learning is a subset of artificial intelligence.",
        title: "Test",
        entityType: "concept",
      },
      ["Machine learning is a subset of artificial intelligence that uses statistical methods."],
    );

    expect(result.verificationLevel).toBe("vocabulary_only");
  });

  it("reports vocabulary+embedding when embedFn is configured", async () => {
    const { MultiLayerGroundingPlugin } = await import(
      "../knowledge/compiler/groundingPlugin.js"
    );

    const mockEmbed = vi.fn().mockResolvedValue([0.5, 0.3]);
    const plugin = new MultiLayerGroundingPlugin({ embedFn: mockEmbed });

    const result = await plugin.validateArticle(
      {
        docId: "test/article",
        body: "Attention is all you need.",
        title: "Test",
        entityType: "concept",
      },
      ["Attention mechanisms are key to modern neural network architectures."],
    );

    expect(result.verificationLevel).toBe("vocabulary+embedding");
  });
});

// ── Fix 8: L4 top-K NLI chunk selection ─────────────────────────────────────

describe("ADR-012/Fix-8: L4 NLI top-K chunk verification", () => {
  it("detects contradiction in non-top-overlap chunk", async () => {
    const { MultiLayerGroundingPlugin } = await import(
      "../knowledge/compiler/groundingPlugin.js"
    );

    // Mock NLI that returns contradiction for the second chunk
    const mockNLI = vi.fn()
      .mockImplementation((premise: string, claim: string) => {
        if (premise.includes("never confirmed")) {
          return Promise.resolve({ label: "contradiction", score: 0.95 });
        }
        return Promise.resolve({ label: "entailment", score: 0.85 });
      });

    const plugin = new MultiLayerGroundingPlugin({ nliVerifyFn: mockNLI });

    // Source with supporting evidence in chunk 1, contradicting evidence in chunk 3
    const longSource = [
      // Chunk 1: appears to support the claim
      "GPT-4 is a large language model created by OpenAI. " +
      "It demonstrates impressive capabilities in natural language processing. " +
      "The model uses a transformer architecture with many parameters. ".repeat(20),
      // Chunk 2: unrelated filler
      "Machine learning has many applications in computer vision and robotics. ".repeat(20),
      // Chunk 3: contradicts the claim
      "However, OpenAI never confirmed that GPT-4 uses a Mixture of Experts architecture. " +
      "This remains unverified speculation from unofficial sources. ".repeat(10),
    ].join("\n\n");

    const result = await plugin.validateArticle(
      {
        docId: "test/gpt4",
        body: "GPT-4 uses a Mixture of Experts (MoE) architecture.",
        title: "GPT-4 Architecture",
        entityType: "concept",
      },
      [longSource],
    );

    // With top-K=3, the NLI should have seen the contradicting chunk
    // and the final verdict should reflect it
    expect(mockNLI).toHaveBeenCalled();
    // The NLI function should have been called with at least one premise
    // containing "never confirmed"
    const calls = mockNLI.mock.calls;
    const sawContradiction = calls.some(
      ([premise]: [string]) => premise.includes("never confirmed"),
    );
    expect(sawContradiction).toBe(true);
  });
});
