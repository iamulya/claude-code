---
summary: A production-grade, zero-dependency TF-IDF search engine that serves as the default KBSearchAdapter plugin.
capabilities:
 - KBSearchAdapter
title: TfIdfSearchPlugin
entity_type: plugin
built_in: true
search_terms:
 - TF-IDF search
 - keyword search plugin
 - default knowledge base search
 - how to search knowledge base
 - KBSearchAdapter implementation
 - full-text search for KB
 - field weighting search
 - multilingual tokenization
 - query expansion
 - embedding re-ranking
 - zero-dependency search
 - in-memory search index
 - cosine similarity search
 - HybridTokenizer
stub: false
compiled_at: 2026-04-24T18:09:08.655Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/store.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/tfidfSearch.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `TfIdfSearchPlugin` is a production-grade, zero-dependency [TF-IDF](../concepts/tf-idf.md) (Term Frequency-Inverse Document Frequency) search engine [Source 2]. It is the default implementation of the `[[[[[[[[KBSearchAdapter]]]]]]]]` capability and is used automatically by the `KnowledgeBase` [when](../apis/when.md) no other search plugin is explicitly registered [Source 2].

The plugin provides a robust keyword search functionality with several advanced features [Source 2]:
*   **Scoring:** Uses sublinear TF-IDF with cosine-normalized scoring for relevance ranking.
*   **Field Weighting:** Prioritizes matches in different parts of a document, with default weights of 3x for titles, 2x for aliases, and 1x for the body text.
*   **Multilingual Support:** Employs a pluggable `TokenizerStrategy` for [tokenization](../concepts/tokenization.md). The default, `HybridTokenizer`, handles CJK, Thai, Latin, Cyrillic, and Arabic scripts.
*   **Query Expansion:** Automatically searches for synonyms based on the provided [Vocabulary](../concepts/vocabulary.md).
*   **Hybrid Search:** Offers optional re-ranking of results by blending TF-IDF scores with [Cosine Similarity](../concepts/cosine-similarity.md) from embeddings.

The search index is an inverted index built once when the `KnowledgeBase` is loaded. This index resides in [Memory](../concepts/memory.md), while the full document bodies are not retained by the plugin, optimizing for a smaller memory footprint [Source 2].

## Installation

As a built-in plugin, `TfIdfSearchPlugin` is included with the core `yaaf` package and does not require separate installation. It is used by default for knowledge base search operations [Source 2].

To explicitly configure the plugin, it can be imported from the framework [Source 2]:

```typescript
import { TfIdfSearchPlugin } from "yaaf/knowledge/store/tfidfSearch";
```

The plugin has zero external dependencies [Source 2].

## Configuration

The `TfIdfSearchPlugin` can be used in two ways: automatically or with explicit configuration.

**Automatic Usage (Default)**

By default, the `KnowledgeBase` instantiates and uses this plugin internally without any configuration required [Source 2].

```typescript
import { KnowledgeBase } from "yaaf/knowledge";

// The KnowledgeBase will automatically use TfIdfSearchPlugin internally.
const kb = await KnowledgeBase.load('./my-kb');

// This search call is handled by the default TF-IDF plugin.
const results = await kb.search('attention mechanisms');
```

**Explicit Configuration**

For more control, an instance of `TfIdfSearchPlugin` can be created and registered with the `PluginHost`. The constructor accepts an options object to customize its behavior, such as providing a specific tokenizer or a vocabulary for query expansion [Source 2].

```typescript
import { KnowledgeBase } from "yaaf/knowledge";
import { TfIdfSearchPlugin } from "yaaf/knowledge/store/tfidfSearch";
import { EnglishTokenizer } from "yaaf/tokenizers"; // Example tokenizer
import { myOntology } from "./ontology"; // Example ontology

// Create a custom instance of the plugin
const searchPlugin = new TfIdfSearchPlugin({
  tokenizer: new EnglishTokenizer(),
  vocabulary: myOntology.vocabulary,
});

// Register the plugin with the host before loading the KB
const kb = new KnowledgeBase({ plugins: [searchPlugin] });
await kb.load('./my-kb');

// This search call now uses the explicitly configured plugin instance.
const results = await kb.search('attention mechanisms');
```

## Capabilities

`TfIdfSearchPlugin` implements the following capability:

### KBSearchAdapter

As a `KBSearchAdapter`, this plugin provides the core keyword search functionality for a `KnowledgeBase` [Source 2]. It is responsible for:
1.  **Indexing:** Building an in-memory inverted index from all documents during the `load()` phase. The index is built from document titles, aliases, and bodies, and it stores token frequencies rather than the full text [Source 2].
2.  **Querying:** Executing search queries against the index. The lookup time is O(k) per query term, making it efficient [Source 2].
3.  **Ranking:** Scoring and ranking documents based on relevance to the query using a TF-IDF algorithm [Source 2].
4.  **Returning Results:** Formatting search results into a standard `KBSearchResult` structure, which includes the document ID, title, [Entity Type](../concepts/entity-type.md), relevance score, and a matching excerpt [Source 1, Source 2].

## Limitations

*   **In-Memory Index:** The entire inverted index is held in memory [Source 2]. While optimized, this may lead to high memory consumption for knowledge bases with an exceptionally large number of documents or a very large vocabulary.
*   **Static Index:** The search index is built once when the `KnowledgeBase` is loaded [Source 2]. The plugin does not support real-time indexing of new or updated documents; the entire knowledge base must be reloaded to reflect changes.

## Sources

[Source 1]: src/knowledge/store/store.ts
[Source 2]: src/knowledge/store/tfidfSearch.ts