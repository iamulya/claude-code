---
summary: Represents the complete output of the Concept Extractor, detailing all planned article creates/updates and compilation metadata.
export_name: CompilationPlan
source_file: src/knowledge/compiler/extractor/types.ts
category: type
belongs_to: subsystems/knowledge-compilation-system
title: CompilationPlan
entity_type: api
search_terms:
 - concept extractor output
 - knowledge synthesizer input
 - plan for creating articles
 - what articles to create or update
 - knowledge base compilation plan
 - list of article plans
 - skipped source files
 - compilation run metadata
 - proposed entity types
 - blocked source files
 - how extractor and synthesizer communicate
 - article creation manifest
stub: false
compiled_at: 2026-04-24T16:56:24.398Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/extractor/index.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/extractor/types.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `CompilationPlan` type defines the complete output of the [Concept Extractor](../subsystems/concept-extractor.md) for a single compilation run [Source 2]. It serves as the data contract between the Concept Extractor and the [Knowledge Synthesizer](../subsystems/knowledge-synthesizer.md) subsystems. The Concept Extractor analyzes ingested source documents and produces a `CompilationPlan`, which the Knowledge Synthesizer then consumes to author or update knowledge base articles [Source 2].

This plan specifies which articles should be created or updated, which sources should be skipped, and includes metadata about the compilation process itself. It is the sole artifact passed from the extractor to the synthesizer; all information for article generation is contained within the plan [Source 2].

## Signature

`CompilationPlan` is a TypeScript type alias with the following structure [Source 2]:

```typescript
export type CompilationPlan = {
  /** Total source files analyzed in this run */
  sourceCount: number;

  /** Articles to create or update (excludes skipped) */
  articles: ArticlePlan[];

  /** Sources that were skipped with their reasons */
  skipped: Array<{ sourcePath: string; reason: string }>;

  /**
   * Sources that need optional dependencies not currently installed.
   * (e.g., .html files when @mozilla/readability is not installed)
   */
  blockedByMissingDeps: Array<{ sourcePath: string; deps: string[] }>;

  /**
   * Entity types suggested by the LLM that are NOT in the ontology.
   * These are surfaced as structured warnings in the compilation result.
   */
  proposedEntityTypes: Array<{
    /** The entity type the LLM suggested (not in ontology.yaml) */
    entityType: string;
    /** Number of articles that were coerced to the fallback type */
    count: number;
    /** Up to 3 article titles that triggered this suggestion */
    examples: string[];
  }>;

  /** Timestamp of when this plan was created */
  createdAt: number;
};
```

### Supporting Types

The `CompilationPlan` relies on the `ArticlePlan` type to describe actions for individual articles [Source 2].

```typescript
/**
 * A plan for a single compiled KB article.
 */
export type ArticlePlan = {
  /** The target docId for this article. Format: {entityType}/{slug} */
  docId: string;

  /** The canonical article title */
  canonicalTitle: string;

  /** Entity type key from the ontology */
  entityType: string;

  /** What to do: 'create', 'update', or 'skip' */
  action: 'create' | 'update' | 'skip';

  /** If action = 'update', the existing article's docId */
  existingDocId?: string;

  /** Absolute file paths of source content contributing to this article */
  sourcePaths: string[];

  /** docIds of KB articles this article should link to */
  knownLinkDocIds: string[];

  /** New concepts discovered in the source that don't have KB articles yet */
  candidateNewConcepts: CandidateConcept[];

  /** Suggested frontmatter field values, inferred from the source */
  suggestedFrontmatter: Record<string, unknown>;

  /** Reason for skipping, only set when action = 'skip' */
  skipReason?: string;

  /** Confidence score in the entity classification [0, 1] */
  confidence: number;

  /** Aggregate trust level of all contributing source files */
  sourceTrust: SourceTrustLevel;
};
```

## Examples

Below is an example of a `CompilationPlan` object that might be generated after processing three source files.

```json
{
  "sourceCount": 3,
  "articles": [
    {
      "docId": "api/agent",
      "canonicalTitle": "Agent",
      "entityType": "api",
      "action": "create",
      "sourcePaths": ["/path/to/yaaf/src/agent.ts"],
      "knownLinkDocIds": ["api/tool-executor", "concepts/agent-loop"],
      "candidateNewConcepts": [],
      "suggestedFrontmatter": {
        "summary": "The core class for creating and running LLM-powered agents."
      },
      "confidence": 0.95,
      "sourceTrust": "high"
    },
    {
      "docId": "concepts/agent-loop",
      "canonicalTitle": "Agent Loop",
      "entityType": "concept",
      "action": "update",
      "existingDocId": "concepts/agent-loop",
      "sourcePaths": ["/path/to/yaaf/docs/architecture.md"],
      "knownLinkDocIds": ["api/agent", "api/prompt"],
      "candidateNewConcepts": [],
      "suggestedFrontmatter": {},
      "confidence": 0.88,
      "sourceTrust": "medium"
    }
  ],
  "skipped": [
    {
      "sourcePath": "/path/to/yaaf/LICENSE",
      "reason": "Source is not knowledge-base worthy (license file)."
    }
  ],
  "blockedByMissingDeps": [],
  "proposedEntityTypes": [
    {
      "entityType": "architectural-pattern",
      "count": 1,
      "examples": ["Agent Loop"]
    }
  ],
  "createdAt": 1678886400000
}
```

## Sources

[Source 1] src/knowledge/compiler/extractor/index.ts
[Source 2] src/knowledge/compiler/extractor/types.ts