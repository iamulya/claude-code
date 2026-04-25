---
summary: A memory optimization strategy where resources, such as document bodies, are loaded from storage only when they are actually needed.
title: Lazy Loading
entity_type: concept
related_subsystems:
 - knowledge_base
search_terms:
 - memory optimization
 - loading resources on demand
 - reduce memory usage
 - KBStore memory model
 - how does KBStore load documents
 - lazy document loading
 - on-demand resource loading
 - frontmatter vs body loading
 - LRU cache for documents
 - steady-state memory reduction
 - performance optimization
stub: false
compiled_at: 2026-04-24T17:57:09.560Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/store.ts
compiled_from_quality: unknown
confidence: 0.85
---

## What It Is

Lazy Loading is a design pattern and [Memory](./memory.md) optimization strategy used in YAAF to minimize memory consumption. The core principle is to defer the loading of resource-intensive data until the moment it is explicitly requested. In the context of the YAAF Knowledge Base, this means that the full text (body) of an article is not loaded into memory [when](../apis/when.md) the application starts. Instead, only lightweight metadata is loaded initially.

This approach solves the problem of high steady-state memory usage that would occur if all knowledge base articles were loaded into memory at once. For a knowledge base with 1000 articles, this strategy can reduce memory usage from approximately 16MB to 2MB [Source 1].

## How It Works in YAAF

Lazy loading is implemented within the `KBStore` subsystem, which provides read-only access to the compiled knowledge base [Source 1].

The process follows these steps:
1.  **Initial Load**: During the `KBStore.load()` process, the system iterates through all compiled articles but only parses and stores their [Frontmatter](./frontmatter.md) metadata. This metadata is defined by the `DocumentMeta` type and includes fields like `docId`, `title`, `entityType`, `wordCount`, and `tokenEstimate` [Source 1].
2.  **Search Indexing**: The full body of each document is read from disk once to populate the index of the configured `KBSearchAdapter`. After the index is built, the document bodies are released from memory [Source 1].
3.  **On-Demand Retrieval**: When a specific article is requested via a method like `getDocument()`, the `KBStore` reads the full body of that single document from the filesystem.
4.  **Caching**: To optimize performance for frequently accessed documents, the loaded document body is stored in a Least Recently Used (LRU) cache. If a cached document is requested again, it is served from memory, avoiding a disk read. When the cache is full, the least recently used item is evicted to make space for a new one [Source 1].

This mechanism ensures that the application's memory footprint remains low, holding only the metadata for all documents and the full bodies of a small, recently-used subset.

## Configuration

The LRU cache used for storing document bodies is configurable. The default cache size is 200 entries [Source 1].

## Sources

[Source 1]: src/knowledge/store/store.ts