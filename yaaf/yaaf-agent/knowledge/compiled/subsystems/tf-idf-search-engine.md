---
summary: A production-grade, zero-dependency TF-IDF search engine that serves as the default KBSearchAdapter plugin for YAAF's Knowledge Base subsystem.
primary_files:
 - src/knowledge/store/tfidfSearch.ts
title: TF-IDF Search Engine
entity_type: subsystem
exports:
 - TfIdfSearchPlugin
search_terms:
 - built-in search adapter
 - default knowledge base search
 - how to search knowledge base
 - in-memory search index
 - zero dependency search
 - sublinear tf-idf
 - field weighting search
 - multilingual tokenization
 - query expansion with vocabulary
 - cosine similarity ranking
 - configure KB search
 - replace default search
 - inverted index
stub: false
compiled_at: 2026-04-25T00:31:18.466Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/tfidfSearch.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/tokenizers.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The TF-IDF Search Engine is a built-in subsystem that provides fast, efficient, and zero-dependency full-text search capabilities for the [Knowledge Base](./knowledge-base.md) subsystem [Source 1]. It serves as the default implementation of the [KBSearchAdapter](../concepts/kb-search-adapter.md) concept and is used automatically when no custom search adapter is registered. This makes it suitable for production environments where adding external search dependencies like Elasticsearch is not desirable [Source 1].

## Architecture

The search engine is designed for performance and memory efficiency. Its architecture is based on an in-memory inverted index and a pluggable tokenization strategy [Source 1, Source 2].

### Indexing

An in-memory inverted index is constructed once when a [Knowledge Base](./knowledge-base.md) is loaded. The construction time is O(n) relative to the number of documents. To conserve memory, the engine does not retain the raw text of the documents; it only stores their token frequencies in the index [Source 1].

### Tokenization

All text processing, such as splitting text into searchable terms, is delegated to a [TokenizerStrategy](../apis/tokenizer-strategy.md) implementation [Source 2]. This makes the search engine highly extensible for different languages.

- **Default Strategy**: The default tokenizer is the [HybridTokenizer](../apis/hybrid-tokenizer.md), which automatically handles mixed-language content. It uses word-based tokenization for scripts like Latin and Cyrillic, and character n-grams for languages without clear word boundaries, such as Chinese, Japanese, Korean (CJK), and Thai [Source 1, Source 2].
- **Other Strategies**: The framework also provides specialized tokenizers like [EnglishTokenizer](../apis/english-tokenizer.md) (which includes Porter stemming), [UnicodeTokenizer](../apis/unicode-tokenizer.md) (for whitespace-separated languages), and [NgramTokenizer](../apis/ngram-tokenizer.md) (for character n-gram based indexing) [Source 2].

### Scoring and Ranking

The engine employs several techniques to rank search results for relevance:

- **TF-IDF**: It uses a sublinear variant of the [TF-IDF](../concepts/tf-idf.md) algorithm to score term relevance [Source 1].
- **Field Weighting**: Matches found in a document's title are given a 3x weight multiplier, and matches in aliases receive a 2x multiplier, prioritizing them over matches in the body text (1x) [Source 1].
- **Normalization**: Scores are normalized using [Cosine Similarity](../concepts/cosine-similarity.md) [Source 1].
- **Optional Re-ranking**: The system can optionally blend its TF-IDF scores with embedding-based [Cosine Similarity](../concepts/cosine-similarity.md) scores for more nuanced re-ranking of results [Source 1].

### Query Processing

Search lookups are efficient, with a time complexity of O(k) per query term. The engine also performs vocabulary-aware query expansion, automatically searching for synonyms defined in the [Knowledge Base](./knowledge-base.md)'s [Vocabulary](../concepts/vocabulary.md) to improve recall [Source 1].

## Integration Points

The TF-IDF Search Engine is tightly integrated with the [Knowledge Base](./knowledge-base.md) subsystem, serving as its default search provider. It interacts with other parts of YAAF through well-defined interfaces:

- **[Knowledge Base](./knowledge-base.md)**: The search engine is invoked by the `KnowledgeBase.search()` method.
- **[Plugin System](./plugin-system.md)**: It is implemented as a plugin, [TfIdfSearchPlugin](../plugins/tf-idf-search-plugin.md), which can be explicitly registered or replaced by a different [KBSearchAdapter](../concepts/kb-search-adapter.md) implementation.
- **[Knowledge Base Ontology](./knowledge-base-ontology.md)**: It uses the [Vocabulary](../concepts/vocabulary.md) defined in the ontology to perform query expansion with synonyms.

## Key APIs

- **[TfIdfSearchPlugin](../plugins/tf-idf-search-plugin.md)**: The main class that implements the [KBSearchAdapter](../concepts/kb-search-adapter.md) interface. It encapsulates the indexing and search logic [Source 1].
- **[TokenizerStrategy](../apis/tokenizer-strategy.md)**: The interface that defines how text is processed. Key implementations include [HybridTokenizer](../apis/hybrid-tokenizer.md), [EnglishTokenizer](../apis/english-tokenizer.md), [UnicodeTokenizer](../apis/unicode-tokenizer.md), and [NgramTokenizer](../apis/ngram-tokenizer.md) [Source 2].

## Configuration

The search engine works out-of-the-box with no configuration required. When `KnowledgeBase.load()` is called, the [TfIdfSearchPlugin](../plugins/tf-idf-search-plugin.md) is used by default [Source 1].

For more advanced use cases, developers can instantiate and register the plugin manually to customize its behavior, such as providing a different tokenizer or a specific vocabulary for query expansion [Source 1].

```typescript
// Automatic: works with no configuration
const kb = await KnowledgeBase.load('./my-kb');
await kb.search('attention mechanisms'); // Uses TF-IDF internally

// Explicit: register as a plugin for full control
const plugin = new TfIdfSearchPlugin({
  tokenizer: new EnglishTokenizer(),
  vocabulary: ontology.vocabulary,
});
await host.register(plugin);
```

## Extension Points

The primary mechanism for extending the search engine's functionality is by implementing the [TokenizerStrategy](../apis/tokenizer-strategy.md) interface. This allows developers to add support for new languages or introduce custom text processing logic, such as using language-specific word segmentation libraries (e.g., MeCab for Japanese) [Source 2].

## Sources

[Source 1]: src/knowledge/store/tfidfSearch.ts
[Source 2]: src/knowledge/store/tokenizers.ts