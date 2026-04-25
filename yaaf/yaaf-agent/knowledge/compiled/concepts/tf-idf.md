---
summary: A statistical measure for word importance, used in YAAF for lightweight semantic search and as a fast keyword-based check in response grounding.
title: TF-IDF
entity_type: concept
related_subsystems:
 - TF-IDF Search Engine
see_also:
 - "[GroundingValidator](../apis/grounding-validator.md)"
 - "[VectorMemoryPlugin](../plugins/vector-memory-plugin.md)"
 - "[TF-IDF Search Engine](../subsystems/tf-idf-search-engine.md)"
 - "[HybridTokenizer](../apis/hybrid-tokenizer.md)"
 - "[Grounding (LLM)](./grounding-llm.md)"
 - "[Embedding Similarity](./embedding-similarity.md)"
search_terms:
 - term frequency-inverse document frequency
 - keyword search
 - semantic search without embeddings
 - fast grounding check
 - VectorMemoryPlugin algorithm
 - cosine similarity
 - information retrieval
 - how does grounding validator work
 - keyword overlap
 - anti-hallucination check
 - lightweight vector store
 - in-process semantic search
stub: false
compiled_at: 2026-04-25T00:25:13.718Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/tokenizers.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/vectorMemory.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/groundingValidator.ts
compiled_from_quality: unknown
confidence: 1
---

## What It Is

Term Frequency-Inverse Document Frequency (TF-IDF) is a statistical measure from information retrieval used to evaluate the importance of a word within a document relative to a collection of documents (a corpus). The score is the product of two metrics:

*   **Term Frequency (TF):** Measures how frequently a term appears in a document.
*   **Inverse Document Frequency (IDF):** Measures how rare a term is across all documents in the corpus. This gives a higher weight to terms that are more specific to a particular document.

The resulting TF-IDF score is high for terms that are frequent in one document but infrequent across the entire corpus, making them effective keywords for summarizing or identifying the document's content. In YAAF, TF-IDF serves as a lightweight, dependency-free method for keyword-based search and similarity assessment, often as a faster alternative to deep learning-based embedding models [Source 2, Source 3].

## How It Works in YAAF

TF-IDF is applied in several key areas within the YAAF framework, primarily for fast similarity checks and in-process memory retrieval.

### Semantic Memory Retrieval

The `[[VectorMemoryPlugin]]` provides an in-process vector store that uses TF-IDF weighting with cosine similarity to implement semantic memory retrieval [Source 2]. This plugin fulfills the `VectorStoreAdapter` capability, allowing it to serve as a built-in [Semantic Memory](./semantic-memory.md) backend without external dependencies. It is designed for small-to-medium-sized corpora of up to approximately 10,000 documents. For larger-scale applications, this plugin can be swapped with other `VectorStoreAdapter` implementations that connect to external vector databases [Source 2].

### Response Grounding

The `[[GroundingValidator]]` employs TF-IDF as its first-line defense against [Hallucination (LLM)](./hallucination-llm.md). It uses a "TF-IDF keyword overlap" check as a fast, zero-cost signal to validate an LLM's claims against evidence from tool results [Source 3]. A sentence from the LLM's response is considered grounded if it shares a minimum number of significant words (configured by `minOverlapTokens`) with any of the provided evidence. This check is performed before resorting to more computationally expensive methods like `[[Embedding Similarity]]` or an `[[LLM Semantic Scorer]]`. The grounding method is recorded in the assessment results, with `scoredBy: 'keyword'` indicating a TF-IDF match [Source 3].

### Tokenization

The performance of TF-IDF is dependent on how text is preprocessed and split into terms (tokens). The YAAF `[[TF-IDF Search Engine]]` delegates this responsibility to a pluggable `TokenizerStrategy` [Source 1]. The default tokenizer is the `[[HybridTokenizer]]`, which can automatically process mixed-language content. It uses different strategies based on the script detected, such as word-based tokenization for Latin scripts and character n-grams for languages without clear word boundaries like Chinese, Japanese, and Korean (CJK) [Source 1]. Other available strategies include the `EnglishTokenizer`, which applies Porter [Stemming](./stemming.md) to normalize words [Source 1].

## Configuration

TF-IDF itself is not directly configured. Instead, its behavior is controlled through the components that utilize it.

### GroundingValidator

When using the `[[GroundingValidator]]`, the threshold for the TF-IDF keyword overlap check can be configured via the `minOverlapTokens` property.

```typescript
import { GroundingValidator } from 'yaaf';

const validator = new GroundingValidator({
  mode: 'warn',
  // A sentence is grounded if it shares at least 3 significant words
  // with the evidence, as determined by TF-IDF.
  minOverlapTokens: 3,
});
```
[Source 3]

### VectorMemoryPlugin

The `[[VectorMemoryPlugin]]` is enabled by registering it with the `PluginHost`. Its use of TF-IDF is an internal implementation detail that is not exposed through configuration.

```typescript
import { PluginHost } from 'yaaf'
import { VectorMemoryPlugin } from 'yaaf/memory'

const host = new PluginHost()
// Registering the plugin enables TF-IDF-based semantic memory.
await host.register(new VectorMemoryPlugin())
```
[Source 2]

## Sources

[Source 1]: src/knowledge/store/tokenizers.ts
[Source 2]: src/memory/vectorMemory.ts
[Source 3]: src/security/groundingValidator.ts