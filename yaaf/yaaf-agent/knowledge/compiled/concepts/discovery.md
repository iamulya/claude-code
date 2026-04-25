---
summary: An LLM-powered analysis feature that scans the YAAF Knowledge Base to identify structural gaps, such as missing articles, weak connections, and content imbalances.
title: Discovery
entity_type: concept
related_subsystems:
 - Knowledge Base
see_also:
 - "[Phase C features](./phase-c-features.md)"
 - "[Knowledge Base](../subsystems/knowledge-base.md)"
 - "[LLMCallFn](../apis/llm-call-fn.md)"
 - "[Ontology](./ontology.md)"
search_terms:
 - knowledge base analysis
 - find gaps in documentation
 - LLM-powered linter
 - structural integrity check
 - discover missing articles
 - identify weak connections
 - content depth imbalance
 - suggest new topics
 - yaaf --discover flag
 - discoverGaps function
 - graph analysis of knowledge
 - C2 Linter Discovery Mode
stub: false
compiled_at: 2026-04-25T00:18:34.557Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/discovery.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/llmClient.ts
compiled_from_quality: unknown
confidence: 1
---

## What It Is

Discovery is an advanced, opt-in feature within the YAAF framework that uses a Large Language Model ([LLM](./llm.md)) to perform a structural analysis of the entire [Knowledge Base](../subsystems/knowledge-base.md) [Source 1]. It is one of the framework's [Phase C features](./phase-c-features.md) and is also referred to as "C2 — Linter Discovery Mode" [Source 1, Source 2].

The primary purpose of Discovery is to identify structural gaps and inconsistencies within the knowledge graph that might be difficult for human authors to spot. It is invoked via the `--discover` flag during the knowledge base compilation process [Source 1].

The analysis identifies four main types of issues [Source 1]:
*   **Missing Articles**: Concepts that are frequently mentioned throughout the [Knowledge Base](../subsystems/knowledge-base.md) but do not have their own dedicated articles.
*   **Weak Connections**: Pairs of existing articles that should logically cross-reference each other with [Wikilinks](./wikilinks.md) but currently do not.
*   **Depth Imbalances**: [Entity Type](./entity-type.md)s that have uneven coverage, for example, where some articles are very detailed while others are sparse.
*   **Suggested New Content**: Recommendations for new topics or articles that would be relevant to the [Knowledge Base](../subsystems/knowledge-base.md)'s current scope.

## How It Works in YAAF

The Discovery process is orchestrated by the `discoverGaps` function. This function operates on the compiled [Knowledge Base](../subsystems/knowledge-base.md) and requires an instance of an [LLMCallFn](../apis/llm-call-fn.md), the compiled directory path, a `ConceptRegistry`, and the project's [Ontology](./ontology.md) as inputs [Source 1].

The `discoverGaps` function iterates through the articles in the [Knowledge Base](../subsystems/knowledge-base.md) in batches, making a series of [LLM Call](./llm-call.md)s to perform the analysis. Each call uses a system prompt that instructs the [LLM](./llm.md) to look for the specific types of structural gaps mentioned above [Source 1].

The results of the analysis are returned in a structured `DiscoveryResult` object, which contains detailed findings [Source 1]:
*   `missingArticles`: An array of `DiscoverySuggestion` objects, each containing a suggested `title`, `entityType`, a `reason` for its creation, and the `mentionCount`.
*   `weakConnections`: An array of `DiscoveryConnection` objects, each specifying a `fromDocId` and `toDocId` to link, along with a `reason`.
*   `depthImbalances`: An array of `DepthImbalance` objects, each highlighting an `entityType` with its `articleCount`, `avgWordCount`, and a `suggestion` for improvement.

The underlying [LLM](./llm.md) interaction is abstracted by the [LLMCallFn](../apis/llm-call-fn.md) type, which represents a simple text-in, text-out function for communicating with an LLM provider [Source 2].

## Configuration

The behavior of the Discovery feature can be configured through `DiscoveryOptions` passed to the `discoverGaps` function. The primary configuration is `maxCalls`, which sets a limit on the number of [LLM Call](./llm-call.md)s the process can make, with a default of 5 [Source 1].

```typescript
// Example of invoking the Discovery process
import { discoverGaps } from './discovery.js';
import { makeKBLLMClient } from './llmClient.js';

const llm = makeKBLLMClient();
const compiledDir = './compiled-kb';
const registry = /* ... ConceptRegistry instance ... */;
const ontology = /* ... KBOntology instance ... */;

const options = {
  maxCalls: 10, // Allow up to 10 LLM calls
  onProgress: (event) => console.log(event.type),
};

const result = await discoverGaps(llm, compiledDir, registry, ontology, options);

for (const suggestion of result.missingArticles) {
  console.log(`Missing: ${suggestion.title} (${suggestion.reason})`);
}

for (const connection of result.weakConnections) {
  console.log(`Weak Link: ${connection.fromDocId} -> ${connection.toDocId}`);
}
```
[Source 1]

## See Also

*   [Phase C features](./phase-c-features.md)
*   [Knowledge Base](../subsystems/knowledge-base.md)
*   [LLMCallFn](../apis/llm-call-fn.md)
*   [Ontology](./ontology.md)

## Sources

*   [Source 1] src/knowledge/compiler/discovery.ts
*   [Source 2] src/knowledge/compiler/llmClient.ts