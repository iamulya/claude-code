---
title: discoverGaps
entity_type: api
summary: A function that uses an LLM to analyze a compiled knowledge base and identify structural gaps like missing articles, weak connections, and content imbalances.
export_name: discoverGaps
source_file: src/knowledge/compiler/discovery.ts
category: function
search_terms:
 - knowledge base analysis
 - find missing articles
 - identify content gaps
 - LLM-powered linter
 - knowledge graph discovery
 - weak connections in KB
 - content depth imbalance
 - suggest new articles
 - KB structural analysis
 - how to improve knowledge base
 - C2 Linter Discovery Mode
 - yaaf knowledge compiler
 - graph analysis for documentation
stub: false
compiled_at: 2026-04-24T17:02:08.635Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/discovery.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `discoverGaps` function is an [LLM](../concepts/llm.md)-powered analysis tool that scans a compiled YAAF knowledge base (KB) to find structural gaps and suggest improvements [Source 1]. It is part of the "C2 — [Linter](../concepts/linter.md) [Discovery](../concepts/discovery.md) Mode," an opt-in feature for knowledge base maintenance that requires an explicit `--discover` flag during compilation [Source 1].

This function analyzes the entire KB to identify several types of issues:
- **Missing articles**: Concepts that are mentioned frequently throughout the KB but do not have their own dedicated articles.
- **Weak connections**: Pairs of articles that should logically cross-reference each other but currently do not.
- **Depth imbalances**: Disparities in the depth and detail of coverage among different Entity Types.
- **Suggested new content**: Recommendations for new topics the KB should cover to be more comprehensive, based on its existing scope [Source 1].

Using `discoverGaps` helps maintain the structural integrity, completeness, and connectivity of the knowledge base over time.

## Signature

The function is asynchronous and returns a `Promise` that resolves to a `[[[[[[[[DiscoveryResult]]]]]]]]` object.

```typescript
export async function discoverGaps(
  llm: LLMCallFn,
  compiledDir: string,
  registry: ConceptRegistry,
  Ontology: KBOntology,
  options?: [[[[[[[[DiscoveryOptions]]]]]]]]
): Promise<DiscoveryResult>;
```

**Parameters:**

- `llm` (`LLMCallFn`): An [LLM Client](../concepts/llm-client.md) function used to perform the analysis.
- `compiledDir` (`string`): The file path to the directory containing the compiled knowledge base.
- `registry` (`ConceptRegistry`): The [Concept Registry](../subsystems/concept-registry.md) for the knowledge base.
- `Ontology` (`KBOntology`): The [Ontology](../concepts/ontology.md) defining the structure and types of the knowledge base.
- `options` (`DiscoveryOptions`, optional): Configuration options for the discovery process.

### Related Types

**DiscoveryOptions**
An object to configure the discovery process.

```typescript
export type DiscoveryOptions = {
  /** Maximum LLM calls. Default: 5 (each covers a batch of articles) */
  maxCalls?: number;
  /** Progress callback */
  onProgress?: (event: DiscoveryProgressEvent) => void;
};
```

**DiscoveryResult**
The object returned upon successful completion of the analysis.

```typescript
export type DiscoveryResult = {
  /** Concepts mentioned often but without their own article */
  missingArticles: [[[[[[[[DiscoverySuggestion]]]]]]]][];
  /** Pairs of articles that should cross-reference each other */
  weakConnections: [[[[[[[[DiscoveryConnection]]]]]]]][];
  /** Entity types with coverage imbalances */
  depthImbalances: [[[[[[[[DepthImbalance]]]]]]]][];
  /** Number of LLM calls made */
  llmCalls: number;
  /** Total elapsed time (ms) */
  durationMs: number;
};
```

**DiscoverySuggestion**
Describes a suggestion for a new, missing article.

```typescript
export type DiscoverySuggestion = {
  /** Suggested article title */
  title: string;
  /** Suggested Entity Type */
  entityType: string;
  /** Why this article should exist */
  reason:string;
  /** How many existing articles mention this concept */
  mentionCount: number;
};
```

**DiscoveryConnection**
Describes a suggested link between two existing articles.

```typescript
export type DiscoveryConnection = {
  /** Source article docId */
  fromDocId: string;
  /** Target article docId */
  toDocId: string;
  /** Why these should be connected */
  reason: string;
};
```

**DepthImbalance**
Describes an imbalance in content coverage for a specific [Entity Type](../concepts/entity-type.md).

```typescript
export type DepthImbalance = {
  /** Entity type with the imbalance */
  entityType: string;
  /** Number of articles of this type */
  articleCount: number;
  /** Average word count */
  avgWordCount: number;
  /** Suggestion for improvement */
  suggestion: string;
};
```

## Events

The `discoverGaps` function can report progress via the `onProgress` callback in the `options` object.

**`discovery:start`**
Fired once at the beginning of the discovery process.

- **Payload**: `DiscoveryProgressEvent`
  ```typescript
  {
    type: "discovery:start";
    articleCount: number;
  }
  ```

## Examples

The following example demonstrates how to invoke `discoverGaps` and process its results to identify missing articles.

```typescript
import { discoverGaps } from 'yaaf/knowledge';
import { makeKBLLMClient } from './llmClient'; // User-provided LLM client
import { registry, ontology } from './kb-config'; // User-provided KB config

const compiledDir = './compiled-kb';
const llm = makeKBLLMClient();

const result = await discoverGaps(llm, compiledDir, registry, ontology);

console.log('--- Missing Article Suggestions ---');
for (const suggestion of result.missingArticles) {
  console.log(
    `Missing: ${suggestion.title} (mentioned ${suggestion.mentionCount} times)`
  );
  console.log(`  Reason: ${suggestion.reason}`);
}

console.log('\n--- Weak Connection Suggestions ---');
for (const conn of result.weakConnections) {
    console.log(`Connect ${conn.fromDocId} -> ${conn.toDocId}`);
    console.log(`  Reason: ${conn.reason}`);
}
```

## Sources

[Source 1]: src/knowledge/compiler/discovery.ts