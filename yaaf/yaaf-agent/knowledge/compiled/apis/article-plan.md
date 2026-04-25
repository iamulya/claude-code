---
summary: Defines the structure for a single compiled KB article, detailing its target ID, type, action, and contributing sources.
export_name: ArticlePlan
source_file: src/knowledge/compiler/extractor/types.ts
category: type
belongs_to: subsystems/knowledge-compilation-system
title: ArticlePlan
entity_type: api
search_terms:
 - knowledge base compilation
 - compilation plan structure
 - how to create or update an article
 - article action create update skip
 - synthesizer input
 - extractor output
 - linking articles during compilation
 - suggested frontmatter
 - candidate concepts
 - source file to article mapping
 - docId format
 - source trust level
 - article generation plan
stub: false
compiled_at: 2026-04-24T16:50:08.137Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/extractor/index.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/extractor/types.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `ArticlePlan` type defines the structure for a single, planned knowledge base article. It serves as the primary contract between the [Concept Extractor](../subsystems/concept-extractor.md) and the [Knowledge Synthesizer](../subsystems/knowledge-synthesizer.md) subsystems within YAAF's knowledge compilation pipeline [Source 2].

The Concept Extractor analyzes source files and produces a `CompilationPlan` containing an array of `ArticlePlan` objects. The Knowledge Synthesizer then consumes each `ArticlePlan` to generate or update the corresponding article file [Source 2].

An `ArticlePlan` encapsulates all the necessary information for article generation, including what action to take (create, update, or skip), which source files contribute content, what other articles to link to, and any metadata inferred from the sources [Source 2].

A single source file can result in multiple `ArticlePlan`s (e.g., a paper discussing several distinct concepts). Conversely, multiple source files can contribute to a single `ArticlePlan`, which the Synthesizer merges into one coherent article [Source 2].

## Signature

`ArticlePlan` is a TypeScript type alias. Its structure is defined as follows [Source 2]:

```typescript
import type { SourceTrustLevel } from "../ingester/types.js";
import type { CandidateConcept } from "./types.js";

export type ArticlePlan = {
  /**
   * The target docId for this article (relative to compiled/, no .md extension).
   * Format: {entityType}/{slug-of-canonical-title}
   * Example: "concepts/attention-mechanism"
   * Computed deterministically by the Extractor — never user-provided.
   */
  docId: string;

  /** The canonical article title */
  canonicalTitle: string;

  /** Entity type key from the ontology */
  entityType: string;

  /**
   * What to do:
   * - create: new article, none in the registry
   * - update: existing article needs new info merged in
   * - skip: source isn't KB-worthy (changelog, license, test file, etc.)
   */
  action: 'create' | 'update' | 'skip';

  /**
   * If action = 'update', the existing article's docId (from the registry).
   * The Synthesizer will read the existing article + new sources and merge.
   */
  existingDocId?: string;

  /**
   * Absolute file paths of IngestedContent that contribute to this article.
   * Multiple sources are synthesized into one article by the Synthesizer.
   */
  sourcePaths: string[];

  /**
   * docIds of KB articles this article should link to.
   * Populated from: registry lookup + vocabulary scan + LLM classification.
   * The Synthesizer writes these as wikilinks in the article body.
   */
  knownLinkDocIds: string[];

  /**
   * New concepts discovered in the source that don't have KB articles yet.
   * The Synthesizer creates stub articles for high-confidence candidates.
   */
  candidateNewConcepts: CandidateConcept[];

  /**
   * Suggested frontmatter field values, inferred from the source.
   * The Synthesizer validates these against the ontology frontmatter schema
   * and merges them with any author-provided frontmatter.
   * Tagged as "compiler-inferred" — never overwrites explicit values.
   */
  suggestedFrontmatter: Record<string, unknown>;

  /**
   * Only set when action = 'skip'.
   * Used in the compilation report to explain why this source was skipped.
   */
  skipReason?: string;

  /**
   * Confidence score in the entity classification [0, 1].
   * Plans below 0.5 are flagged in the compilation report for human review.
   */
  confidence: number;

  /**
   * Aggregate trust level of all contributing source files.
   * When multiple sources contribute to one article, the lowest trust level
   * of any source wins.
   */
  sourceTrust: SourceTrustLevel;
};
```

## Examples

### Creating a New Article

This example shows an `ArticlePlan` for creating a new article about a class discovered in a source file.

```typescript
const createArticlePlan: ArticlePlan = {
  docId: "api/agent",
  canonicalTitle: "Agent",
  entityType: "api",
  action: "create",
  sourcePaths: ["/path/to/project/src/agent.ts"],
  knownLinkDocIds: ["api/agentrun", "concept/state-machine"],
  candidateNewConcepts: [],
  suggestedFrontmatter: {
    summary: "The core class for creating and running LLM-powered agents.",
    category: "class"
  },
  confidence: 0.98,
  sourceTrust: "high"
};
```

### Updating an Existing Article

This plan instructs the synthesizer to merge new information from a markdown file into an existing article.

```typescript
const updateArticlePlan: ArticlePlan = {
  docId: "concept/state-machine",
  canonicalTitle: "State Machine",
  entityType: "concept",
  action: "update",
  existingDocId: "concept/state-machine",
  sourcePaths: ["/path/to/project/docs/state-machines.md"],
  knownLinkDocIds: ["api/agent"],
  candidateNewConcepts: [],
  suggestedFrontmatter: {
    search_terms: ["finite state machine", "agent lifecycle"]
  },
  confidence: 0.91,
  sourceTrust: "medium"
};
```

### Skipping a Source File

This plan indicates that a source file was analyzed but deemed not worthy of inclusion in the knowledge base.

```typescript
const skipArticlePlan: ArticlePlan = {
  docId: "internal/license",
  canonicalTitle: "LICENSE",
  entityType: "internal",
  action: "skip",
  sourcePaths: ["/path/to/project/LICENSE"],
  knownLinkDocIds: [],
  candidateNewConcepts: [],
  suggestedFrontmatter: {},
  skipReason: "Source is a license file, which is not KB-worthy.",
  confidence: 1.0,
  sourceTrust: "not_applicable"
};
```

## Sources

[Source 1]: `src/knowledge/compiler/extractor/index.ts`
[Source 2]: `src/knowledge/compiler/extractor/types.ts`