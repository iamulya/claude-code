---
title: Knowledge Base Discovery
entity_type: concept
summary: A design pattern in YAAF for using LLMs to analyze documentation structure, identifying missing concepts, weak cross-references, and depth imbalances.
related_subsystems:
  - Knowledge Compiler
stub: false
compiled_at: 2026-04-16T14:22:36.405Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/discovery.ts
confidence: 0.92
---

## What It Is
Knowledge Base Discovery is an LLM-powered graph analysis pattern used to identify structural gaps within a YAAF knowledge base. It functions as an advanced linter mode that moves beyond syntax checking to evaluate the semantic completeness and connectivity of documentation.

The primary goal of Discovery is to ensure that a knowledge base is cohesive and comprehensive by identifying:
- **Missing Articles**: Concepts that are frequently mentioned across various documents but lack a dedicated definition or article.
- **Weak Connections**: Opportunities for cross-referencing where two articles are semantically related but do not currently link to one another.
- **Depth Imbalances**: Discrepancies in coverage where certain entity types (e.g., APIs vs. Concepts) have significantly different levels of detail or volume.
- **Content Suggestions**: New topics that should be covered based on the existing scope and themes of the knowledge base.

## How It Works in YAAF
Discovery is implemented as an opt-in feature within the knowledge compiler, typically triggered by an explicit `--discover` flag. The process is managed by the `discoverGaps` function, which performs a scan of the compiled knowledge base.

The mechanism involves batching articles and sending them to an LLM via a provided `LLMCallFn`. The LLM analyzes the relationships and content density to produce a `DiscoveryResult`.

### Analysis Types
The discovery engine evaluates the KB across four specific dimensions:

1.  **Missing Articles**: The engine tracks mentions of terms that do not resolve to a known `docId` in the `ConceptRegistry`. If a term appears frequently without a backing article, it is flagged as a `DiscoverySuggestion`.
2.  **Weak Connections**: By analyzing the semantic context of articles, the engine identifies pairs that should be connected. These are returned as `DiscoveryConnection` objects, noting the source, target, and the reason for the suggested link.
3.  **Depth Imbalances**: The engine calculates metrics such as average word count and article count per entity type. If one category (e.g., `plugin`) is significantly underdeveloped compared to others (e.g., `api`), it generates a `DepthImbalance` report.
4.  **Structural Suggestions**: Based on the `KBOntology`, the engine suggests new content areas that would logically complete the current knowledge set.

## Configuration
Developers interact with the discovery system through the `DiscoveryOptions` interface and the `discoverGaps` function. By default, the system limits LLM usage to prevent excessive costs, typically defaulting to 5 calls per session.

```typescript
import { discoverGaps } from './knowledge/compiler/discovery.js';

const options = {
  maxCalls: 10, // Increase the number of LLM batches analyzed
  onProgress: (event) => {
    if (event.type === 'discovery:start') {
      console.log(`Analyzing ${event.articleCount} articles...`);
    }
  }
};

const result = await discoverGaps(llm, compiledDir, registry, ontology, options);

for (const suggestion of result.missingArticles) {
  console.log(`Missing: ${suggestion.title} - ${suggestion.reason}`);
}
```

### Discovery Result Structure
The `DiscoveryResult` provides a comprehensive breakdown of the analysis:
- `missingArticles`: An array of `DiscoverySuggestion` objects.
- `weakConnections`: An array of `DiscoveryConnection` objects.
- `depthImbalances`: An array of `DepthImbalance` objects.
- `llmCalls`: The total number of LLM requests made during the session.
- `durationMs`: The total time taken to complete the analysis.

## Sources
- `src/knowledge/compiler/discovery.ts`