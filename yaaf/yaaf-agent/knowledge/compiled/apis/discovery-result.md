---
title: DiscoveryResult
entity_type: api
summary: A type representing the output of the knowledge base discovery process, detailing potential gaps and areas for improvement.
export_name: DiscoveryResult
source_file: src/knowledge/compiler/discovery.ts
category: type
search_terms:
 - knowledge base analysis
 - find missing articles
 - identify weak connections
 - content gap analysis
 - knowledge graph structure
 - LLM-powered KB linter
 - discoverGaps return type
 - KB coverage imbalance
 - suggest new content
 - knowledge base audit
 - structural integrity check
 - C2 Linter Discovery Mode
stub: false
compiled_at: 2026-04-24T17:02:45.327Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/discovery.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `[[[[[[[[Discovery]]]]]]]]Result` type defines the structure of the object returned by the `discoverGaps` function. It encapsulates the findings of the "C2 — [[]] Discovery Mode]]," an [LLM](../concepts/llm.md)-powered analysis that scans the entire knowledge base to identify structural gaps and suggest improvements [Source 1].

This analysis helps maintain the quality and completeness of the knowledge base by programmatically identifying:
- Concepts that are frequently mentioned but lack their own dedicated articles.
- Existing articles that should be linked together but are not.
- Imbalances in content depth across different categories of articles [Source 1].

A `DiscoveryResult` object provides a comprehensive report of these findings, along with metadata about the analysis process itself, such as the number of LLM calls made and the total duration [Source 1].

## Signature

`DiscoveryResult` is a TypeScript type alias with the following structure [Source 1]:

```typescript
export type DiscoveryResult = {
  /** Concepts mentioned often but without their own article */
  missingArticles: DiscoverySuggestion[];

  /** Pairs of articles that should cross-reference each other */
  weakConnections: DiscoveryConnection[];

  /** Entity types with coverage imbalances */
  depthImbalances: DepthImbalance[];

  /** Number of LLM calls made */
  llmCalls: number;

  /** Total elapsed time (ms) */
  durationMs: number;
};
```

### Constituent Types

The properties of `DiscoveryResult` are composed of the following supporting types [Source 1]:

**`DiscoverySuggestion`**
Identifies a concept that should have its own article.

```typescript
export type DiscoverySuggestion = {
  /** Suggested article title */
  title: string;
  /** Suggested [[[[[[[[Entity Type]]]]]]]] */
  entityType: string;
  /** Why this article should exist */
  reason: string;
  /** How many existing articles mention this concept */
  mentionCount: number;
};
```

**`DiscoveryConnection`**
Identifies a pair of existing articles that should be linked.

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

**`DepthImbalance`**
Highlights uneven coverage for a specific Entity Type.

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

## Examples

The `DiscoveryResult` object is typically consumed after calling the `discoverGaps` function. The following example shows how to iterate through the different types of findings in the result.

```typescript
import { discoverGaps, DiscoveryResult } from 'yaaf/knowledge';
// Assume llm, compiledDir, registry, and ontology are already configured

async function analyzeKnowledgeBase() {
  const result: DiscoveryResult = await discoverGaps(
    llm,
    compiledDir,
    registry,
    ontology
  );

  console.log(`Analysis complete in ${result.durationMs}ms using ${result.llmCalls} LLM calls.`);

  console.log("\n--- Missing Articles ---");
  if (result.missingArticles.length > 0) {
    for (const suggestion of result.missingArticles) {
      console.log(
        `[${suggestion.entityType}] ${suggestion.title} (mentioned ${suggestion.mentionCount} times)`
      );
      console.log(`  Reason: ${suggestion.reason}`);
    }
  } else {
    console.log("No missing articles found.");
  }


  console.log("\n--- Weak Connections ---");
  if (result.weakConnections.length > 0) {
    for (const connection of result.weakConnections) {
      console.log(`Connect ${connection.fromDocId} <-> ${connection.toDocId}`);
      console.log(`  Reason: ${connection.reason}`);
    }
  } else {
    console.log("No weak connections found.");
  }


  console.log("\n--- Depth Imbalances ---");
  if (result.depthImbalances.length > 0) {
    for (const imbalance of result.depthImbalances) {
      console.log(`Imbalance in type: ${imbalance.entityType}`);
      console.log(`  Suggestion: ${imbalance.suggestion}`);
    }
  } else {
    console.log("No depth imbalances found.");
  }
}

analyzeKnowledgeBase();
```

## See Also

- The `discoverGaps` function, which produces `DiscoveryResult` objects.

## Sources

[Source 1] `src/knowledge/compiler/discovery.ts`