---
title: DepthImbalance
entity_type: api
summary: A data structure representing an identified imbalance in coverage depth for a specific entity type within the knowledge base.
export_name: DepthImbalance
source_file: src/knowledge/compiler/discovery.ts
category: type
search_terms:
 - knowledge base analysis
 - content gap discovery
 - uneven article coverage
 - knowledge base linter
 - discoverGaps result type
 - structural KB analysis
 - entity type coverage
 - article depth imbalance
 - KB quality metrics
 - content audit tool
 - find shallow articles
 - LLM-powered discovery
stub: false
compiled_at: 2026-04-24T17:01:32.646Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/discovery.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `DepthImbalance` type is a data structure used in the YAAF [Knowledge Base Compiler](../subsystems/knowledge-base-compiler.md)'s [Discovery](../concepts/discovery.md) feature [Source 1]. It represents a finding where a specific category of articles (an `entityType`) has uneven or shallow content coverage compared to other categories.

This type is part of the `DiscoveryResult` object returned by the `discoverGaps` function. The discovery process analyzes the entire knowledge base to identify structural gaps. An instance of `DepthImbalance` is created for each [Entity Type](../concepts/entity-type.md) that exhibits a significant disparity in article count or average article length, along with a suggestion for improvement [Source 1]. This helps content authors identify areas of the knowledge base that may require more detailed content to achieve a consistent level of depth across all topics.

## Signature

`DepthImbalance` is a TypeScript type alias for an object with the following properties [Source 1]:

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

### Properties

- **`entityType: string`**
  The name of the entity type (e.g., 'api', 'concept', 'guide') that has been identified as having imbalanced coverage [Source 1].

- **`articleCount: number`**
  The total number of articles belonging to this `entityType` found in the knowledge base [Source 1].

- **`avgWordCount: number`**
  The average word count calculated across all articles of this `entityType` [Source 1].

- **`suggestion: string`**
  An [LLM](../concepts/llm.md)-generated suggestion on how to address the imbalance, such as expanding shallow articles or creating new ones to improve coverage [Source 1].

## Examples

The primary way to encounter `DepthImbalance` objects is by inspecting the results of a `discoverGaps` analysis. The following example demonstrates how to access and display the depth imbalance findings from the discovery result.

```typescript
import { discoverGaps, makeKBLLMClient } from 'yaaf/knowledge';
// Assume compiledDir, registry, and ontology are available

const llm = makeKBLLMClient();
const result = await discoverGaps(llm, compiledDir, registry, ontology);

console.log('--- Knowledge Base Depth Imbalances ---');
if (result.depthImbalances.length === 0) {
  console.log('No depth imbalances found.');
} else {
  for (const imbalance of result.depthImbalances) {
    console.log(`Entity Type: ${imbalance.entityType}`);
    console.log(`  - Article Count: ${imbalance.articleCount}`);
    console.log(`  - Avg. Word Count: ${imbalance.avgWordCount}`);
    console.log(`  - Suggestion: ${imbalance.suggestion}`);
    console.log('');
  }
}

/*
Example Output:

--- Knowledge Base Depth Imbalances ---
Entity Type: plugin
  - Article Count: 3
  - Avg. Word Count: 150
  - Suggestion: The 'plugin' articles are significantly shorter than other types. Consider expanding each plugin's documentation with more detailed examples and API references.

*/
```

## See Also

- `discoverGaps`: The function that performs the knowledge base analysis and returns `DepthImbalance` objects.
- `DiscoveryResult`: The parent object that contains the `depthImbalances` array along with other discovery findings.
- `DiscoverySuggestion`: A related type for suggesting new articles.
- `DiscoveryConnection`: A related type for suggesting links between existing articles.

## Sources

[Source 1] `src/knowledge/compiler/discovery.ts`