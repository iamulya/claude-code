---
title: Linter Discovery Mode
entity_type: concept
summary: An opt-in, LLM-powered analysis tool that scans the YAAF knowledge base to identify structural gaps, suggest new content, and find areas for improvement.
related_subsystems:
 - compiler
search_terms:
 - knowledge base analysis
 - find missing articles
 - identify weak connections
 - KB content gap analysis
 - LLM-powered linter
 - how to improve knowledge base
 - content coverage check
 - structural integrity of KB
 - discover command
 - yaaf --discover flag
 - knowledge graph analysis
 - suggest new content
stub: false
compiled_at: 2026-04-24T17:57:29.908Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/discovery.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

[Linter](./linter.md) [Discovery](./discovery.md) Mode is an [LLM](./llm.md)-powered graph analysis feature within the YAAF framework designed to find structural gaps and inconsistencies in the knowledge base [Source 1]. It is an opt-in tool that must be explicitly enabled via the `--discover` command-line flag [Source 1].

The primary purpose of this mode is to assist authors and maintainers by automatically scanning the entire knowledge base and identifying areas for improvement. The analysis focuses on four key areas [Source 1]:

*   **Missing Articles**: Identifies concepts that are frequently mentioned throughout the knowledge base but do not have their own dedicated articles.
*   **Weak Connections**: Finds pairs of existing articles that should logically cross-reference each other but currently do not.
*   **Depth Imbalances**: Highlights [Entity Type](./entity-type.md)s (e.g., concepts, guides) that have uneven coverage, such as significant variations in article length or quantity.
*   **Suggested New Content**: Proposes new topics that the knowledge base should cover, based on an analysis of its current scope and content.

## How It Works in YAAF

The core logic for the Linter Discovery Mode is encapsulated in the `discoverGaps` function [Source 1]. This function orchestrates the analysis by taking the compiled knowledge base directory, a [Concept Registry](../subsystems/concept-registry.md), and the knowledge base [Ontology](./ontology.md) as inputs, and then uses an LLM to perform the analysis [Source 1].

The process involves making a series of calls to a configured LLM, with each call analyzing a batch of articles [Source 1]. The results of the analysis are aggregated into a `DiscoveryResult` object, which contains detailed findings. The structure of this result includes [Source 1]:

*   `missingArticles`: An array of `DiscoverySuggestion` objects, each detailing a suggested new article with its title, Entity Type, the reason for its creation, and the number of times the concept was mentioned in other articles.
*   `weakConnections`: An array of `DiscoveryConnection` objects, each identifying a pair of articles by their document IDs and providing a reason why they should be linked.
*   `depthImbalances`: An array of `DepthImbalance` objects, each specifying an entity type with imbalanced coverage and providing statistics like article count, average word count, and a suggestion for improvement.
*   `llmCalls`: The total number of LLM calls made during the discovery process.
*   `durationMs`: The total time taken for the analysis in milliseconds.

The discovery process can also emit progress events, such as `discovery:start`, allowing for real-time monitoring [Source 1].

## Configuration

The behavior of the Linter Discovery Mode can be customized through a `DiscoveryOptions` object passed to the `discoverGaps` function. The available options are [Source 1]:

*   `maxCalls`: An integer that sets the maximum number of LLM calls the process is allowed to make. This helps control cost and execution time. The default value is 5.
*   `onProgress`: A callback function that receives `DiscoveryProgressEvent` objects, allowing developers to hook into the lifecycle of the discovery process.

The following example demonstrates how to invoke the discovery process and iterate through its results [Source 1]:

```typescript
import { makeKBLLMClient } from "./llmClient.js"; // Example import
import { discoverGaps } from "./discovery.js"; // Example import
import { compiledDir, registry, ontology } from "./kb.js"; // Example imports

const llm = makeKBLLMClient();
const result = await discoverGaps(llm, compiledDir, registry, ontology);

for (const suggestion of result.missingArticles) {
  console.log(`Missing: ${suggestion.title} (${suggestion.reason})`);
}
```

## Sources

[Source 1] src/knowledge/compiler/discovery.ts