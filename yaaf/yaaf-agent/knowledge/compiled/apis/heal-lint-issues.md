---
title: healLintIssues
entity_type: api
summary: The primary function for executing LLM-powered repairs on a knowledge base lint report.
export_name: healLintIssues
source_file: src/knowledge/compiler/heal.ts
category: function
stub: false
compiled_at: 2026-04-16T14:23:17.147Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/heal.ts
confidence: 1
---

## Overview
`healLintIssues` is the core implementation of the Knowledge Base "Heal Mode" (C1). It utilizes Large Language Models (LLMs) to perform non-trivial repairs on documentation that cannot be resolved through simple text replacement or deterministic logic. This function is typically invoked when the `--heal` flag is provided to the knowledge base compiler.

The function addresses specific categories of linting issues:
- **BROKEN_WIKILINK**: Resolves broken links by finding the best matching article or removing the link if no match exists.
- **STUB_WITH_SOURCES**: Triggers the re-synthesis of a stub article into a full article using available source material.
- **LOW_ARTICLE_QUALITY**: Requests the LLM to expand thin sections with more detail.
- **ORPHANED_ARTICLE**: Identifies related articles and suggests cross-links to integrate the orphan into the knowledge graph.

`healLintIssues` does not attempt to fix missing articles where no source material exists or contradictory claims, as these are deferred to human review or discovery processes.

## Signature / Constructor

```typescript
export async function healLintIssues(
  llm: LLMCallFn,
  report: LintReport,
  compiledDir: string,
  registry: ConceptRegistry,
  options: HealOptions = {}
): Promise<HealResult>
```

### HealOptions
```typescript
export type HealOptions = {
  /** Maximum LLM calls per heal run. Default: 20 */
  maxCalls?: number
  /** Only report what would be healed — don't write changes. Default: false */
  dryRun?: boolean
  /** Progress callback */
  onProgress?: (event: HealProgressEvent) => void
}
```

## Methods & Properties

### Parameters
- **llm**: An `LLMCallFn` used to interact with the language model for repair tasks.
- **report**: A `LintReport` containing the issues identified during the linting phase.
- **compiledDir**: The file system path to the directory containing the compiled knowledge base articles.
- **registry**: The `ConceptRegistry` containing the current ontology and article mappings.
- **options**: Configuration for the heal operation, including limits and dry-run settings.

### Return Type: HealResult
The function returns a promise that resolves to a `HealResult` object:
```typescript
export type HealResult = {
  /** Number of issues successfully healed */
  healed: number
  /** Number of issues skipped (no action possible) */
  skipped: number
  /** Number of LLM calls made */
  llmCalls: number
  /** Per-issue details */
  details: HealDetail[]
  /** Total elapsed time (ms) */
  durationMs: number
}
```

### HealDetail
Each entry in the `details` array provides the outcome for a specific issue:
```typescript
export type HealDetail = {
  docId: string
  code: string
  action: 'healed' | 'skipped' | 'failed'
  message: string
}
```

## Events

### HealProgressEvent
The `onProgress` callback in `HealOptions` receives events to track the start and progress of the healing operation:
```typescript
export type HealProgressEvent =
  | { type: 'heal:start'; totalIssues: number; healable: number }
```

## Examples

### Basic Usage
This example demonstrates running the heal function on a pre-existing lint report.

```typescript
const llm = makeKBLLMClient();
const lintReport = await compiler.lint();
const healResult = await healLintIssues(
  llm, 
  lintReport, 
  './dist/knowledge', 
  registry
);

console.log(`Successfully healed ${healResult.healed} issues.`);
```

### Dry Run with Progress Tracking
This example shows how to preview changes and monitor progress without modifying the source files.

```typescript
const healResult = await healLintIssues(llm, report, compiledDir, registry, {
  dryRun: true,
  maxCalls: 10,
  onProgress: (event) => {
    if (event.type === 'heal:start') {
      console.log(`Starting heal: ${event.healable}/${event.totalIssues} issues are repairable.`);
    }
  }
});
```