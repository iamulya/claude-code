---
summary: An adapter interface defining the contract for knowledge base search plugins in YAAF.
title: KBSearchAdapter
entity_type: concept
related_subsystems:
 - knowledge
 - plugin
search_terms:
 - knowledge base search
 - how to add search to KB
 - custom search engine for YAAF
 - search plugin interface
 - pluggable search
 - TF-IDF search
 - vector search adapter
 - implementing a search provider
 - KBSearchDocument
 - KBSearchResult
 - YAAF search contract
 - alternative to TF-IDF search
stub: false
compiled_at: 2026-04-24T17:56:45.279Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/store.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/tfidfSearch.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

The `KBSearchAdapter` is a plugin interface that defines a standardized contract for search engine implementations within the YAAF Knowledge Base subsystem [Source 1]. It serves as an abstraction layer, decoupling the core `KBStore` from any specific search algorithm. This allows developers to provide custom search functionality or replace the default search engine with different technologies, such as vector search or external search APIs, without modifying the core knowledge base components.

The primary problem solved by this adapter is to make the knowledge base's search capabilities pluggable and extensible.

## How It Works in YAAF

The `KBSearchAdapter` is a contract that a plugin must implement to provide search services to the `KBStore` [Source 1]. Any class that implements this interface is responsible for two main tasks:

1.  **Indexing**: Processing a collection of `KBSearchDocument` objects to build a searchable index. This typically happens once [when](../apis/when.md) the `KnowledgeBase` is loaded [Source 2].
2.  **Querying**: Accepting a search query string and returning a list of `KBSearchResult` objects, which include document metadata, a relevance score, and a matching excerpt [Source 1].

YAAF includes a built-in, production-grade implementation of this adapter called `TfIdfSearchPlugin` [Source 1, Source 2]. This [TF-IDF](./tf-idf.md)-based search engine is used automatically by default if no other `KBSearchAdapter` is explicitly registered with the `PluginHost`. This provides robust search functionality out of the box with no configuration required [Source 2].

## Configuration

While the default `TfIdfSearchPlugin` is used automatically, a developer can register a custom `KBSearchAdapter` implementation—or a customized instance of the default plugin—with the `PluginHost`. This provides full control over the search behavior [Source 2].

The following example demonstrates how to explicitly register the `TfIdfSearchPlugin` with a custom tokenizer, overriding the default behavior [Source 2]:

```typescript
// Explicit: register as plugin for full control
const plugin = new TfIdfSearchPlugin({
  tokenizer: new EnglishTokenizer(),
  vocabulary: ontology.vocabulary,
})
await host.register(plugin)

// After registration, any search calls will use this configured instance.
const kb = await KnowledgeBase.load('./my-kb')
await kb.search('attention mechanisms')
```

## Sources

[Source 1] src/knowledge/store/store.ts
[Source 2] src/knowledge/store/tfidfSearch.ts