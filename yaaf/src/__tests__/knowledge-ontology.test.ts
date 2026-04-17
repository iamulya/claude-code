/**
 * Ontology layer tests
 *
 * Tests for: type hydration, YAML parsing, validation, vocabulary
 * normalization, and registry operations.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { tmpdir } from "os";
import { join } from "path";
import { writeFile, mkdir, rm } from "fs/promises";

import {
  OntologyLoader,
  validateOntology,
  serializeOntology,
  buildAliasIndex,
  resolveWikilink,
  normalizeWikilinks,
  scanForEntityMentions,
  buildConceptRegistry,
  findByWikilink,
  buildDocIdAliasMap,
  serializeRegistry,
  deserializeRegistry,
} from "../knowledge/ontology/index.js";

import type { KBOntology } from "../knowledge/ontology/index.js";

// ── Test fixtures ─────────────────────────────────────────────────────────────

const MINIMAL_ONTOLOGY: KBOntology = {
  domain: "Test domain for unit tests",
  entityTypes: {
    concept: {
      description: "A core idea or abstraction",
      frontmatter: {
        fields: {
          title: { description: "Article title", type: "string", required: true },
          entity_type: {
            description: "Entity type",
            type: "enum",
            required: true,
            enum: ["concept", "tool"],
          },
          tags: { description: "Tags", type: "string[]", required: false },
        },
      },
      articleStructure: [
        { heading: "Overview", description: "What is it?", required: true },
        { heading: "Examples", description: "Usage examples", required: false },
      ],
      linkableTo: ["tool"],
      indexable: true,
    },
    tool: {
      description: "A software tool or library",
      frontmatter: {
        fields: {
          title: { description: "Tool name", type: "string", required: true },
          entity_type: {
            description: "Entity type",
            type: "enum",
            required: true,
            enum: ["concept", "tool"],
          },
          homepage: { description: "Tool homepage URL", type: "url", required: false },
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
      description: "A tool that implements a concept",
      reciprocal: "IMPLEMENTED_BY",
    },
    {
      name: "IMPLEMENTED_BY",
      from: "concept",
      to: "tool",
      description: "A concept implemented by a tool",
      reciprocal: "IMPLEMENTS",
    },
  ],
  vocabulary: {
    "attention mechanism": {
      aliases: ["self-attention", "scaled dot-product attention"],
      entityType: "concept",
    },
    transformer: {
      aliases: ["transformer model", "transformer architecture", "transformers"],
      entityType: "concept",
    },
    pytorch: {
      aliases: ["torch", "PyTorch"],
      entityType: "tool",
    },
  },
  budget: {
    textDocumentTokens: 4_096,
    imageTokens: 1_200,
    maxImagesPerFetch: 3,
  },
  compiler: {
    extractionModel: "gemini-2.5-flash",
    synthesisModel: "gemini-2.5-pro",
  },
};

const VALID_ONTOLOGY_YAML = `
domain: "TypeScript agent framework documentation"

entity_types:
  concept:
    description: "A core idea or abstraction in the domain"
    linkable_to:
      - tool
    frontmatter:
      fields:
        title:
          description: "Article title"
          type: string
          required: true
        entity_type:
          description: "Entity type"
          type: enum
          required: true
          enum:
            - concept
            - tool
    article_structure:
      - heading: "Overview"
        description: "What is it?"
        required: true
      - heading: "Examples"
        description: "Usage examples"
        required: false

  tool:
    description: "A callable function or software tool"
    linkable_to:
      - concept
    frontmatter:
      fields:
        title:
          description: "Tool name"
          type: string
          required: true
        entity_type:
          description: "Entity type"
          type: enum
          required: true
          enum:
            - concept
            - tool
    article_structure:
      - heading: "Overview"
        description: "What does this tool do?"
        required: true

relationship_types:
  - name: IMPLEMENTS
    from: tool
    to: concept
    description: "A tool that implements a concept"
    reciprocal: IMPLEMENTED_BY
  - name: IMPLEMENTED_BY
    from: concept
    to: tool
    description: "A concept implemented by a tool"
    reciprocal: IMPLEMENTS

vocabulary:
  "attention mechanism":
    entity_type: concept
    aliases:
      - "self-attention"
      - "scaled dot-product attention"

  "transformer":
    entity_type: concept
    aliases:
      - "transformer model"
      - "transformer architecture"

budget:
  text_document_tokens: 4096
  image_tokens: 1200
  max_images_per_fetch: 3

compiler:
  extraction_model: gemini-2.5-flash
  synthesis_model: gemini-2.5-pro
  analysis_model: gemini-2.5-pro
`;

// ── OntologyLoader tests ──────────────────────────────────────────────────────

describe("OntologyLoader", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = join(tmpdir(), `yaaf-kb-test-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
  });

  it("throws when ontology.yaml does not exist", async () => {
    const loader = new OntologyLoader(tmpDir);
    await expect(loader.load()).rejects.toThrow("file not found");
  });

  it("loads and parses a valid ontology.yaml", async () => {
    await writeFile(join(tmpDir, "ontology.yaml"), VALID_ONTOLOGY_YAML, "utf-8");
    const loader = new OntologyLoader(tmpDir);
    const { ontology, issues } = await loader.load();

    expect(ontology.domain).toBe("TypeScript agent framework documentation");
    expect(Object.keys(ontology.entityTypes)).toContain("concept");
    expect(Object.keys(ontology.entityTypes)).toContain("tool");
    expect(ontology.relationshipTypes).toHaveLength(2);
    expect(ontology.vocabulary["attention mechanism"]).toBeDefined();
    expect(ontology.budget.textDocumentTokens).toBe(4096);
    expect(ontology.compiler.extractionModel).toBe("gemini-2.5-flash");
    expect(ontology.compiler.synthesisModel).toBe("gemini-2.5-pro");

    const errors = issues.filter((i) => i.severity === "error");
    expect(errors).toHaveLength(0);
  });

  it("reports error when domain is missing", async () => {
    const yaml = VALID_ONTOLOGY_YAML.replace(
      'domain: "TypeScript agent framework documentation"',
      "",
    );
    await writeFile(join(tmpDir, "ontology.yaml"), yaml, "utf-8");
    const loader = new OntologyLoader(tmpDir);
    await expect(loader.load()).rejects.toThrow("domain");
  });

  it("reports error when entity_types is empty", async () => {
    const yaml = `
domain: "Test domain"
entity_types:
relationship_types:
vocabulary:
budget:
 text_document_tokens: 4096
 image_tokens: 1200
 max_images_per_fetch: 3
compiler:
`;
    await writeFile(join(tmpDir, "ontology.yaml"), yaml, "utf-8");
    const loader = new OntologyLoader(tmpDir);
    await expect(loader.load()).rejects.toThrow("entity type");
  });

  it("reports error when relationship references unknown entity type", async () => {
    const yaml = `
domain: "Test domain"

entity_types:
  concept:
    description: "A concept"
    linkable_to: []
    frontmatter:
      fields:
        title:
          description: "Title"
          type: string
          required: true
        entity_type:
          description: "Type"
          type: string
          required: true
    article_structure:
      - heading: "Overview"
        description: "What is it?"
        required: true

relationship_types:
  - name: INVALID_REL
    from: nonexistent_type
    to: concept
    description: "Invalid relationship"

vocabulary:

budget:
  text_document_tokens: 4096
  image_tokens: 1200
  max_images_per_fetch: 3

compiler:
`;
    await writeFile(join(tmpDir, "ontology.yaml"), yaml, "utf-8");
    const loader = new OntologyLoader(tmpDir);
    await expect(loader.load()).rejects.toThrow("nonexistent_type");
  });

  it("loads entity type article structure", async () => {
    await writeFile(join(tmpDir, "ontology.yaml"), VALID_ONTOLOGY_YAML, "utf-8");
    const loader = new OntologyLoader(tmpDir);
    const { ontology } = await loader.load();

    const concept = ontology.entityTypes["concept"]!;
    expect(concept.articleStructure).toHaveLength(2);
    expect(concept.articleStructure[0]!.heading).toBe("Overview");
    expect(concept.articleStructure[0]!.required).toBe(true);
    expect(concept.articleStructure[1]!.heading).toBe("Examples");
    expect(concept.articleStructure[1]!.required).toBe(false);
  });

  it("loads vocabulary aliases correctly", async () => {
    await writeFile(join(tmpDir, "ontology.yaml"), VALID_ONTOLOGY_YAML, "utf-8");
    const loader = new OntologyLoader(tmpDir);
    const { ontology } = await loader.load();

    const entry = ontology.vocabulary["attention mechanism"];
    expect(entry).toBeDefined();
    expect(entry!.aliases).toContain("self-attention");
    expect(entry!.aliases).toContain("scaled dot-product attention");
    expect(entry!.entityType).toBe("concept");
  });

  it("roundtrip: serialize then reload produces same structure", async () => {
    await writeFile(join(tmpDir, "ontology.yaml"), VALID_ONTOLOGY_YAML, "utf-8");
    const loader = new OntologyLoader(tmpDir);
    const { ontology: original } = await loader.load();

    await loader.save(original);
    const { ontology: reloaded } = await loader.load();

    expect(reloaded.domain).toBe(original.domain);
    expect(Object.keys(reloaded.entityTypes)).toEqual(Object.keys(original.entityTypes));
    expect(reloaded.relationshipTypes).toHaveLength(original.relationshipTypes.length);
    expect(reloaded.budget.textDocumentTokens).toBe(original.budget.textDocumentTokens);
  });
});

// ── validateOntology tests ────────────────────────────────────────────────────

describe("validateOntology", () => {
  it("passes a valid ontology", () => {
    const result = validateOntology(MINIMAL_ONTOLOGY);
    expect(result.valid).toBe(true);
    const errors = result.issues.filter((i) => i.severity === "error");
    expect(errors).toHaveLength(0);
  });

  it("warns when entity type has no article structure", () => {
    const ontology: KBOntology = {
      ...MINIMAL_ONTOLOGY,
      entityTypes: {
        concept: {
          ...MINIMAL_ONTOLOGY.entityTypes["concept"]!,
          articleStructure: [],
        },
      },
    };
    const result = validateOntology(ontology);
    const warnings = result.issues.filter((i) => i.severity === "warning");
    expect(warnings.some((w) => w.message.includes("article_structure"))).toBe(true);
  });

  it("errors when entity_ref field references unknown entity type", () => {
    const ontology: KBOntology = {
      ...MINIMAL_ONTOLOGY,
      entityTypes: {
        ...MINIMAL_ONTOLOGY.entityTypes,
        concept: {
          ...MINIMAL_ONTOLOGY.entityTypes["concept"]!,
          frontmatter: {
            fields: {
              ...MINIMAL_ONTOLOGY.entityTypes["concept"]!.frontmatter.fields,
              related_tool: {
                description: "Related tool",
                type: "entity_ref",
                required: false,
                targetEntityType: "nonexistent",
              },
            },
          },
        },
      },
    };
    const result = validateOntology(ontology);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.message.includes("nonexistent"))).toBe(true);
  });
});

// ── Vocabulary tests ──────────────────────────────────────────────────────────

describe("buildAliasIndex", () => {
  it("maps aliases to canonical terms", () => {
    const index = buildAliasIndex(MINIMAL_ONTOLOGY);
    expect(index.get("self-attention")).toBe("attention mechanism");
    expect(index.get("scaled dot-product attention")).toBe("attention mechanism");
    expect(index.get("transformer model")).toBe("transformer");
    expect(index.get("torch")).toBe("pytorch");
  });

  it("maps canonical terms to themselves", () => {
    const index = buildAliasIndex(MINIMAL_ONTOLOGY);
    expect(index.get("attention mechanism")).toBe("attention mechanism");
    expect(index.get("transformer")).toBe("transformer");
  });
});

describe("resolveWikilink", () => {
  it("resolves an alias to canonical term", () => {
    const index = buildAliasIndex(MINIMAL_ONTOLOGY);
    const result = resolveWikilink("self-attention", index);
    expect(result.resolved).toBe("attention mechanism");
    expect(result.wasAlias).toBe(true);
  });

  it("returns canonical term unchanged", () => {
    const index = buildAliasIndex(MINIMAL_ONTOLOGY);
    const result = resolveWikilink("attention mechanism", index);
    expect(result.resolved).toBe("attention mechanism");
    expect(result.wasAlias).toBe(false);
  });

  it("returns unknown terms unchanged", () => {
    const index = buildAliasIndex(MINIMAL_ONTOLOGY);
    const result = resolveWikilink("some unknown concept", index);
    expect(result.resolved).toBe("some unknown concept");
    expect(result.wasAlias).toBe(false);
  });
});

describe("normalizeWikilinks", () => {
  it("normalizes alias wikilinks to canonical form", () => {
    const index = buildAliasIndex(MINIMAL_ONTOLOGY);
    const input = "The [[self-attention]] mechanism powers [[Transformers]].";
    const { text, replacements } = normalizeWikilinks(input, index, { trackReplacements: true });

    expect(text).toContain("[[attention mechanism]]");
    expect(text).toContain("[[transformer]]");
    expect(replacements.some((r) => r.canonical === "attention mechanism")).toBe(true);
  });

  it("leaves canonical wikilinks unchanged", () => {
    const index = buildAliasIndex(MINIMAL_ONTOLOGY);
    const input = "The [[attention mechanism]] is central.";
    const { text } = normalizeWikilinks(input, index);
    expect(text).toBe("The [[attention mechanism]] is central.");
  });

  it("leaves unknown wikilinks unchanged", () => {
    const index = buildAliasIndex(MINIMAL_ONTOLOGY);
    const input = "See [[some novel concept]] for details.";
    const { text } = normalizeWikilinks(input, index);
    expect(text).toBe("See [[some novel concept]] for details.");
  });

  it("handles multiple wikilinks on one line", () => {
    const index = buildAliasIndex(MINIMAL_ONTOLOGY);
    const input = "[[self-attention]] and [[transformer model]] and [[torch]]";
    const { text } = normalizeWikilinks(input, index);
    expect(text).toBe("[[attention mechanism]] and [[transformer]] and [[pytorch]]");
  });
});

describe("scanForEntityMentions", () => {
  const index = buildAliasIndex(MINIMAL_ONTOLOGY);

  it("detects canonical term mentions", () => {
    const text = "The attention mechanism is used in transformers.";
    const mentions = scanForEntityMentions(text, MINIMAL_ONTOLOGY, index);
    const terms = mentions.map((m) => m.canonicalTerm);
    expect(terms).toContain("attention mechanism");
    expect(terms).toContain("transformer");
  });

  it("detects alias mentions and maps to canonical", () => {
    const text = "We use self-attention in our model.";
    const mentions = scanForEntityMentions(text, MINIMAL_ONTOLOGY, index);
    const terms = mentions.map((m) => m.canonicalTerm);
    expect(terms).toContain("attention mechanism");
  });

  it("returns mentions sorted by count descending", () => {
    const text = "transformer transformer transformer attention mechanism";
    const mentions = scanForEntityMentions(text, MINIMAL_ONTOLOGY, index);
    expect(mentions[0]!.canonicalTerm).toBe("transformer");
    expect(mentions[0]!.count).toBeGreaterThan(1);
  });

  it("returns empty array for text with no known entities", () => {
    const text = "This is some text about unrelated topics.";
    const mentions = scanForEntityMentions(text, MINIMAL_ONTOLOGY, index);
    expect(mentions).toHaveLength(0);
  });
});

// ── Concept Registry tests ────────────────────────────────────────────────────

describe("buildConceptRegistry", () => {
  let tmpDir: string;
  let compiledDir: string;

  beforeEach(async () => {
    tmpDir = join(tmpdir(), `yaaf-registry-test-${Date.now()}`);
    compiledDir = join(tmpDir, "compiled");
    await mkdir(compiledDir, { recursive: true });
  });

  it("returns empty registry when compiled/ is empty", async () => {
    const { registry, warnings } = await buildConceptRegistry(compiledDir, MINIMAL_ONTOLOGY);
    expect(registry.size).toBe(0);
    expect(warnings).toHaveLength(0);
  });

  it("returns empty registry when compiled/ does not exist", async () => {
    const { registry } = await buildConceptRegistry(join(tmpDir, "nonexistent"), MINIMAL_ONTOLOGY);
    expect(registry.size).toBe(0);
  });

  it("loads a valid compiled article", async () => {
    const articleContent = `---
title: "Attention Mechanism"
entity_type: concept
stub: false
---

# Attention Mechanism

The attention mechanism allows models to focus on relevant parts of input.
`;
    await writeFile(join(compiledDir, "attention-mechanism.md"), articleContent, "utf-8");

    const { registry, warnings } = await buildConceptRegistry(compiledDir, MINIMAL_ONTOLOGY);
    expect(registry.size).toBe(1);
    expect(warnings).toHaveLength(0);

    const entry = registry.get("attention-mechanism");
    expect(entry).toBeDefined();
    expect(entry!.canonicalTitle).toBe("Attention Mechanism");
    expect(entry!.entityType).toBe("concept");
    expect(entry!.isStub).toBe(false);
  });

  it("skips article missing title field", async () => {
    const articleContent = `---
entity_type: concept
---

# No Title
`;
    await writeFile(join(compiledDir, "no-title.md"), articleContent, "utf-8");
    const { registry, warnings } = await buildConceptRegistry(compiledDir, MINIMAL_ONTOLOGY);
    expect(registry.size).toBe(0);
    expect(warnings.some((w) => w.includes("title"))).toBe(true);
  });

  it("skips article with unknown entity type", async () => {
    const articleContent = `---
title: "Some Article"
entity_type: unknown_type
---
`;
    await writeFile(join(compiledDir, "unknown.md"), articleContent, "utf-8");
    const { registry, warnings } = await buildConceptRegistry(compiledDir, MINIMAL_ONTOLOGY);
    expect(registry.size).toBe(0);
    expect(warnings.some((w) => w.includes("unknown_type"))).toBe(true);
  });

  it("scans nested directories recursively", async () => {
    const subDir = join(compiledDir, "concepts");
    await mkdir(subDir, { recursive: true });

    const conceptContent = `---
title: "Transformer"
entity_type: concept
---
`;
    await writeFile(join(subDir, "transformer.md"), conceptContent, "utf-8");

    const { registry } = await buildConceptRegistry(compiledDir, MINIMAL_ONTOLOGY);
    expect(registry.size).toBe(1);
    const entry = registry.get("concepts/transformer");
    expect(entry).toBeDefined();
    expect(entry!.canonicalTitle).toBe("Transformer");
  });

  it("marks stub articles correctly", async () => {
    const stubContent = `---
title: "Stub Article"
entity_type: concept
stub: true
---
`;
    await writeFile(join(compiledDir, "stub-article.md"), stubContent, "utf-8");
    const { registry } = await buildConceptRegistry(compiledDir, MINIMAL_ONTOLOGY);
    const entry = registry.get("stub-article");
    expect(entry!.isStub).toBe(true);
  });
});

describe("findByWikilink", () => {
  it("finds by exact docId", () => {
    const registry = new Map([
      [
        "concepts/transformer",
        {
          docId: "concepts/transformer",
          canonicalTitle: "Transformer",
          entityType: "concept",
          aliases: ["transformer", "transformer architecture"],
          compiledAt: Date.now(),
          isStub: false,
        },
      ],
    ]);
    const result = findByWikilink("concepts/transformer", registry);
    expect(result).toBeDefined();
    expect(result!.canonicalTitle).toBe("Transformer");
  });

  it("finds by canonical title", () => {
    const registry = new Map([
      [
        "concepts/transformer",
        {
          docId: "concepts/transformer",
          canonicalTitle: "Transformer",
          entityType: "concept",
          aliases: ["transformer"],
          compiledAt: Date.now(),
          isStub: false,
        },
      ],
    ]);
    const result = findByWikilink("Transformer", registry);
    expect(result).toBeDefined();
    expect(result!.docId).toBe("concepts/transformer");
  });

  it("returns undefined for unknown wikilink", () => {
    const registry = new Map();
    const result = findByWikilink("nonexistent", registry);
    expect(result).toBeUndefined();
  });
});

describe("serializeRegistry / deserializeRegistry", () => {
  it("roundtrips the registry correctly", () => {
    const registry = new Map([
      [
        "concepts/transformer",
        {
          docId: "concepts/transformer",
          canonicalTitle: "Transformer",
          entityType: "concept",
          aliases: ["transformer"],
          compiledAt: 1700000000000,
          isStub: false,
        },
      ],
    ]);
    const json = serializeRegistry(registry);
    const restored = deserializeRegistry(json);
    expect(restored.size).toBe(1);
    expect(restored.get("concepts/transformer")!.canonicalTitle).toBe("Transformer");
  });
});

describe("serializeOntology", () => {
  it("produces valid YAML that can be re-parsed", async () => {
    const yaml = serializeOntology(MINIMAL_ONTOLOGY);
    expect(yaml).toContain('domain: "Test domain for unit tests"');
    expect(yaml).toContain("entity_types:");
    expect(yaml).toContain("vocabulary:");
    expect(yaml).toContain("budget:");
    expect(yaml).toContain("compiler:");
  });
});
