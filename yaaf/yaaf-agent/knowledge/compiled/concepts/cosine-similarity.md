---
summary: A measure of similarity between two non-zero vectors, used in YAAF to quantify semantic relatedness for tasks like semantic search, evidence grounding, and search result re-ranking.
title: Cosine Similarity
entity_type: concept
related_subsystems:
 - TF-IDF Search Engine
see_also:
 - "[Embedding Similarity](./embedding-similarity.md)"
 - "[Grounding (LLM)](./grounding-llm.md)"
 - "[Semantic Memory](./semantic-memory.md)"
 - "[GroundingValidator](../apis/grounding-validator.md)"
 - "[VectorMemoryPlugin](../plugins/vector-memory-plugin.md)"
 - "[TF-IDF Search Engine](../subsystems/tf-idf-search-engine.md)"
search_terms:
 - vector similarity
 - embedding comparison
 - semantic search algorithm
 - how to measure text similarity
 - grounding score calculation
 - TF-IDF scoring
 - vector store similarity metric
 - angle between vectors
 - normalized dot product
 - semantic relatedness
 - document similarity
 - re-ranking search results
stub: false
compiled_at: 2026-04-25T00:17:57.538Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/tfidfSearch.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/vectorMemory.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/groundingValidator.ts
compiled_from_quality: unknown
confidence: 1
---

## What It Is

Cosine similarity is a mathematical measure of the similarity between two non-zero vectors in an inner product space. It calculates the cosine of the angle between them, resulting in a score from -1 to 1. A score of 1 indicates the vectors point in the same direction, 0 indicates they are orthogonal (unrelated), and -1 indicates they point in opposite directions.

In the context of YAAF and Large Language Models (LLMs), cosine similarity is primarily used to quantify the semantic similarity between pieces of text. By converting text into numerical vector representations (embeddings), the framework can use cosine similarity to compare their meanings. This is fundamental for tasks like finding relevant documents for a query, or verifying if an LLM's statement is supported by source evidence.

## How It Works in YAAF

Cosine similarity is applied in several core components of the YAAF framework to enable semantic understanding and validation.

### Semantic Search and Memory

The [VectorMemoryPlugin](../plugins/vector-memory-plugin.md), YAAF's default in-process implementation of the `VectorStoreAdapter` capability, uses cosine similarity for [Semantic Memory](./semantic-memory.md) retrieval [Source 2]. It represents documents and queries as TF-IDF weighted vectors and uses cosine similarity to find and rank the most relevant documents for a given query. This allows for efficient semantic search on corpora of up to approximately 10,000 documents without external dependencies [Source 2].

### Response Grounding

The [GroundingValidator](../apis/grounding-validator.md) uses cosine similarity as part of its optional [Embedding Similarity](./embedding-similarity.md) check to combat [Hallucination (LLM)](./hallucination-llm.md) [Source 3]. When a developer provides an embedding function (`embedFn`), the validator converts an LLM's generated sentences and the source evidence (e.g., tool results) into vectors. It then calculates the cosine similarity between a sentence's embedding and the evidence embeddings. If the similarity score meets or exceeds the configured `embeddingThreshold` (defaulting to 0.75), the sentence is considered "grounded," even if it uses different words (paraphrasing) from the source material [Source 3].

### Search Result Scoring and Re-ranking

YAAF's built-in [TF-IDF Search Engine](../subsystems/tf-idf-search-engine.md) uses cosine-normalized scoring as part of its core ranking algorithm [Source 1]. Additionally, it offers an optional re-ranking step where initial TF-IDF scores can be blended with cosine similarity scores derived from text embeddings. This allows for a hybrid search that combines keyword relevance with deeper semantic relevance [Source 1].

## Configuration

A developer can configure how cosine similarity is used for response grounding within the [GroundingValidator](../apis/grounding-validator.md) by providing an embedding function and setting a similarity threshold.

The following example configures a `GroundingValidator` to use embeddings from a `transformers.js` model and a custom similarity threshold.

```typescript
import { GroundingValidator } from 'yaaf';
import { pipeline } from '@xenova/transformers';

// Example embedding function from @xenova/transformers
const embed = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

const validator = new GroundingValidator({
  mode: 'annotate',
  // Provide the function to create embeddings for similarity comparison
  embedFn: async (text) => {
    const out = await embed(text, { pooling: 'mean', normalize: true });
    return Array.from(out.data as Float32Array);
  },
  // Set the cosine similarity threshold for a sentence to be considered grounded
  embeddingThreshold: 0.75, // Default value [Source 3]
});
```

## See Also

- [Embedding Similarity](./embedding-similarity.md): The broader concept of comparing vector embeddings.
- [Grounding (LLM)](./grounding-llm.md): A key application of cosine similarity for preventing hallucinations.
- [Semantic Memory](./semantic-memory.md): A memory system enabled by semantic search techniques like cosine similarity.
- [GroundingValidator](../apis/grounding-validator.md): The API that uses cosine similarity for response validation.
- [VectorMemoryPlugin](../plugins/vector-memory-plugin.md): The plugin that uses cosine similarity for semantic search.
- [TF-IDF Search Engine](../subsystems/tf-idf-search-engine.md): The subsystem that uses cosine similarity for search scoring.

## Sources

- [Source 1]: `src/knowledge/store/tfidfSearch.ts`
- [Source 2]: `src/memory/vectorMemory.ts`
- [Source 3]: `src/security/groundingValidator.ts`