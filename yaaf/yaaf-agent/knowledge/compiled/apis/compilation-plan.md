---
title: CompilationPlan
entity_type: api
summary: A structured plan describing the set of articles to be created or updated during a knowledge base compilation run.
export_name: CompilationPlan
source_file: src/knowledge/compiler/extractor/types.ts
category: type
stub: false
compiled_at: 2026-04-16T14:22:51.359Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/extractor/index.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/extractor/types.ts
confidence: 1
---

## Overview
`CompilationPlan` is the primary output of the Concept Extractor during a knowledge base compilation run. It serves as a comprehensive manifest that details which articles should be created, which existing articles require updates based on new source material, and which sources were excluded from the process.

The plan is used by the Knowledge Synthesizer to execute the actual generation and merging of markdown articles. It includes metadata about the run, such as source counts and timestamps, as well as diagnostic information regarding skipped files or missing environment dependencies.

## Signature / Constructor

```typescript
export type CompilationPlan = {
  /** Total source files analyzed in this run */
  sourceCount: number

  /** Articles to create or update (excludes skipped) */
  articles: ArticlePlan[]

  /** Sources that were skipped with their reasons */
  skipped: Array<{ sourcePath: string; reason: string }>

  /**
   * Sources that need optional dependencies not currently installed.
   * (e.g., .html files when @mozilla/readability is not installed)
   */
  blockedByMissingDeps: Array<{ sourcePath: string; deps: string[] }>

  /** Timestamp of when this plan was created */
  createdAt: number
}
```

## Methods & Properties

### ArticlePlan
The `articles` array contains `ArticlePlan` objects, each representing a single target article in the compiled knowledge base.

| Property | Type | Description |
| :--- | :--- | :--- |
| `docId` | `string` | The deterministic target path (e.g., "concepts/attention-mechanism"). |
| `canonicalTitle` | `string` | The formal title of the article. |
| `entityType` | `string` | The category key from the ontology. |
| `action` | `ArticleAction` | Whether to `create`, `update`, or `skip`. |
| `existingDocId` | `string` (optional) | The ID of the article to merge into if the action is `update`. |
| `sourcePaths` | `string[]` | Absolute paths to the raw files contributing to this article. |
| `knownLinkDocIds` | `string[]` | IDs of existing articles that should be linked via wikilinks. |
| `candidateNewConcepts` | `CandidateConcept[]` | New terms discovered that do not yet have articles. |
| `suggestedFrontmatter` | `Record<string, unknown>` | Metadata inferred by the compiler (e.g., suggested tags). |
| `confidence` | `number` | A score [0, 1] indicating classification certainty. |

### CandidateConcept
Discovered terms that may require new articles or stubs.

| Property | Type | Description |
| :--- | :--- | :--- |
| `name` | `string` | Suggested canonical name. |
| `entityType` | `string` | Suggested entity type from the ontology. |
| `description` | `string` | A one-sentence summary extracted from the source. |
| `mentionCount` | `number` | Frequency of the term in the source material. |

## Examples

### Basic Compilation Plan
This example shows a plan generated after analyzing a single source file that results in one new article and identifies a potential new concept.

```typescript
const plan: CompilationPlan = {
  sourceCount: 1,
  createdAt: 1715642400000,
  articles: [
    {
      docId: "api/agent-framework",
      canonicalTitle: "Agent Framework",
      entityType: "api",
      action: "create",
      sourcePaths: ["/abs/path/to/src/agent.ts"],
      knownLinkDocIds: ["concepts/llm-orchestration"],
      candidateNewConcepts: [
        {
          name: "Tool Calling",
          entityType: "concept",
          description: "The ability of an agent to execute external functions.",
          mentionCount: 5
        }
      ],
      suggestedFrontmatter: {
        category: "class",
        stability: "stable"
      },
      confidence: 0.95
    }
  ],
  skipped: [],
  blockedByMissingDeps: []
};
```

## See Also
* `ArticleAction`
* `StaticAnalysisResult`