---
title: Knowledge Base Discovery
entity_type: subsystem
summary: Provides an LLM-powered analysis tool to identify structural gaps, missing content, and other quality issues within the knowledge base.
primary_files:
 - src/knowledge/compiler/discovery.ts
exports:
 - discoverGaps
 - DiscoveryOptions
 - DiscoveryResult
 - DiscoverySuggestion
 - DiscoveryConnection
 - DepthImbalance
search_terms:
 - find missing articles
 - knowledge base analysis
 - identify content gaps
 - LLM-powered linter
 - KB structural analysis
 - weak connections between articles
 - content depth imbalance
 - suggest new topics
 - knowledge graph linting
 - how to improve my knowledge base
 - C2 linter
 - discover command
stub: false
compiled_at: 2026-04-24T18:14:23.492Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/discovery.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Purpose

The Knowledge Base [Discovery](../concepts/discovery.md) subsystem, also referred to as "C2 — [[]] Discovery Mode]]," is an opt-in tool that performs a structural analysis of the entire knowledge base to find quality and completeness issues [Source 1]. It is designed to be run via an explicit flag, such as `--discover`, and leverages a Large Language Model ([LLM](../concepts/llm.md)) to power its analysis [Source 1].

The primary goal of this subsystem is to identify several types of structural gaps [Source 1]:
*   **Missing Articles**: Concepts that are frequently mentioned throughout the knowledge base but do not have their own dedicated articles.
*   **Weak Connections**: Pairs of existing articles that should logically cross-reference each other but currently do not.
*   **Depth Imbalances**: Disparities in the depth and detail of coverage among different entity types.
*   **Suggested New Content**: Recommendations for new topics that would be a logical extension of the knowledge base's current scope.

## Architecture

The discovery process operates on the compiled output of the knowledge base, not the raw source files. The core logic is encapsulated in the `discoverGaps` function, which takes the compiled directory, a `ConceptRegistry`, and a `KB[[[[[[[[Ontology]]]]]]]]` as inputs, along with an [LLM Client](../concepts/llm-client.md) function (`LLMCallFn`) to perform the analysis [Source 1].

The analysis is performed in batches of articles to manage the scope of each [LLM Call](../concepts/llm-call.md). The process can be monitored via progress events. The final output is a structured `DiscoveryResult` object containing categorized lists of findings [Source 1].

## Integration Points

The Knowledge Base Discovery subsystem integrates with several other parts of the YAAF framework:
*   **LLM Client**: It requires an `LLMCallFn` implementation to communicate with a language model for analysis [Source 1].
*   **[Knowledge Compiler](./knowledge-compiler.md)**: It consumes the artifacts produced by the knowledge base compilation process, including the compiled directory, [Concept Registry](./concept-registry.md), and Ontology [Source 1].
*   **[CLI](./cli.md)**: The functionality is intended to be invoked as an opt-in command-line process, as suggested by the mention of a `--discover` flag [Source 1].

## Key APIs

The main public API for this subsystem is the `discoverGaps` function and its associated data structures.

### `discoverGaps()`

This asynchronous function executes the LLM-powered discovery analysis on the compiled knowledge base [Source 1].

```typescript
export async function discoverGaps(
  llm: LLMCallFn,
  compiledDir: string,
  registry: ConceptRegistry,
  ontology: KBOntology,
  options: DiscoveryOptions = { /* ... */ }
): Promise<DiscoveryResult>
```

**Example Usage:**
```ts
const llm = makeKBLLMClient()
const result = await discoverGaps(llm, compiledDir, registry, ontology)
for (const suggestion of result.missingArticles) {
  console.log(`Missing: ${suggestion.title} (${suggestion.reason})`)
}
```
[Source 1]

### `DiscoveryResult`

This type represents the complete output of the analysis. It contains categorized findings and metadata about the discovery run [Source 1].

*   `missingArticles: DiscoverySuggestion[]`: A list of concepts that are frequently mentioned but lack a dedicated article.
*   `weakConnections: DiscoveryConnection[]`: Pairs of articles that should be cross-referenced.
*   `depthImbalances: DepthImbalance[]`: Entity types with uneven coverage.
*   `llmCalls: number`: The total number of LLM calls made during the analysis.
*   `durationMs: number`: The total time taken for the analysis in milliseconds.

### Supporting Data Types

*   **`DiscoverySuggestion`**: Details a suggestion for a missing article, including a proposed `title`, `entityType`, the `reason` for its creation, and the `mentionCount` in existing articles [Source 1].
*   **`DiscoveryConnection`**: Represents a suggested link between two articles, identified by `fromDocId` and `toDocId`, with a `reason` explaining why the connection is needed [Source 1].
*   **`DepthImbalance`**: Describes an imbalance for a given `entityType`, including the `articleCount`, `avgWordCount`, and a `suggestion` for improvement [Source 1].

## Configuration

The behavior of the discovery process can be configured via the `DiscoveryOptions` object passed to the `discoverGaps` function [Source 1].

*   `maxCalls?: number`: Sets the maximum number of LLM calls to make. Each call processes a batch of articles. The default is 5.
*   `onProgress?: (event: DiscoveryProgressEvent) => void`: A callback function to receive progress updates during the analysis.

## Sources

[Source 1] src/knowledge/compiler/discovery.ts