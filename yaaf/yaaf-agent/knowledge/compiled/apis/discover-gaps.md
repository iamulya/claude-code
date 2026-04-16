---
title: discoverGaps
entity_type: api
summary: An asynchronous function that performs LLM-powered graph analysis on the compiled knowledge base to identify missing content and weak connections.
export_name: discoverGaps
source_file: src/knowledge/compiler/discovery.ts
category: function
stub: false
compiled_at: 2026-04-16T14:22:32.625Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/discovery.ts
confidence: 0.98
---

## Overview
The `discoverGaps` function is the core of the C2 Linter Discovery Mode. It performs an LLM-powered graph analysis of a compiled knowledge base to identify structural weaknesses and content opportunities. This is an opt-in feature typically triggered by the `--discover` flag in the YAAF CLI.

The discovery process scans the entire knowledge base to identify:
*   **Missing articles**: Concepts that are frequently mentioned across the KB but lack a dedicated article.
*   **Weak connections**: Pairs of articles that are contextually related and should cross-reference each other but currently do not.
*   **Depth imbalances**: Entity types (such as `api` or `concept`) that have uneven coverage depth or significantly different levels of detail.
*   **Suggested new content**: Topics that fall within the current scope of the KB but are not yet covered.

## Signature / Constructor

```typescript
export async function discoverGaps(
  llm: LLMCallFn,
  compiledDir: string,
  registry: ConceptRegistry,
  ontology: KBOntology,
  options: DiscoveryOptions = {}
): Promise<DiscoveryResult>
```

### Parameters
*   `llm`: An `LLMCallFn` used to perform the analysis.
*   `compiledDir`: The file system path to the directory containing the compiled KB artifacts.
*   `registry`: The `ConceptRegistry` containing the current set of known entities.
*   `ontology`: The `KBOntology` defining the structure and rules of the KB.
*   `options`: An optional `DiscoveryOptions` object.

### Supporting Types

```typescript
export type DiscoveryOptions = {
  /** Maximum LLM calls. Default: 5 (each covers a batch of articles) */
  maxCalls?: number
  /** Progress callback */
  onProgress?: (event: DiscoveryProgressEvent) => void
}

export type DiscoveryResult = {
  /** Concepts mentioned often but without their own article */
  missingArticles: DiscoverySuggestion[]
  /** Pairs of articles that should cross-reference each other */
  weakConnections: DiscoveryConnection[]
  /** Entity types with coverage imbalances */
  depthImbalances: DepthImbalance[]
  /** Number of LLM calls made */
  llmCalls: number
  /** Total elapsed time (ms) */
  durationMs: number
}
```

## Methods & Properties

### DiscoverySuggestion
Objects returned in the `missingArticles` array:
*   `title` (string): Suggested title for the new article.
*   `entityType` (string): The suggested category for the article.
*   `reason` (string): Explanation of why this article is needed.
*   `mentionCount` (number): How many existing articles reference this concept.

### DiscoveryConnection
Objects returned in the `weakConnections` array:
*   `fromDocId` (string): The ID of the source article.
*   `toDocId` (string): The ID of the target article.
*   `reason` (string): Explanation of why these two entities should be linked.

### DepthImbalance
Objects returned in the `depthImbalances` array:
*   `entityType` (string): The entity type showing an imbalance.
*   `articleCount` (number): Total number of articles of this type.
*   `avgWordCount` (number): The average length of articles of this type.
*   `suggestion` (string): Recommended action to normalize coverage.

## Events
The function reports progress via the `onProgress` callback using the following event type:

| Event Type | Payload | Description |
| :--- | :--- | :--- |
| `discovery:start` | `{ articleCount: number }` | Emitted when the analysis begins, indicating the total number of articles to be scanned. |

## Examples

### Running Discovery Analysis
This example demonstrates how to initialize the LLM client and run a discovery scan on a compiled directory.

```ts
import { discoverGaps } from 'yaaf/knowledge';

const llm = makeKBLLMClient();
const result = await discoverGaps(llm, './dist/kb', registry, ontology, {
  maxCalls: 10,
  onProgress: (ev) => {
    if (ev.type === 'discovery:start') {
      console.log(`Analyzing ${ev.articleCount} articles...`);
    }
  }
});

for (const suggestion of result.missingArticles) {
  console.log(`Missing: ${suggestion.title} (${suggestion.reason})`);
}

for (const conn of result.weakConnections) {
  console.log(`Suggested Link: ${conn.fromDocId} -> ${conn.toDocId}`);
}
```