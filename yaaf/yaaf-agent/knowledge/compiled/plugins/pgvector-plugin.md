---
summary: A YAAF plugin for integrating with PostgreSQL using the pgvector extension for vector storage.
title: PgvectorPlugin
entity_type: plugin
capabilities:
 - vectorstore
built_in: false
search_terms:
 - PostgreSQL vector search
 - pgvector YAAF integration
 - how to use postgres for vector memory
 - production vector store
 - semantic search with postgres
 - vector database plugin
 - pgvector adapter
 - external vector database
 - replace VectorMemoryPlugin
 - scalable vector memory
 - Postgres LLM agent memory
 - persistent vector storage
stub: false
compiled_at: 2026-04-25T00:27:18.120Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/vectorMemory.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

The `PgvectorPlugin` is a community-provided plugin that integrates YAAF with PostgreSQL using the `pgvector` extension for vector storage and search [Source 1]. It implements the [VectorStoreAdapter](../apis/vector-store-adapter.md) capability, making it a suitable, production-grade replacement for the built-in [VectorMemoryPlugin](./vector-memory-plugin.md) when working with large document corpora or requiring persistent storage [Source 1].

## Installation

Installation details for this community plugin are not available in the provided source material.

## Configuration

Configuration details for this community plugin are not available in the provided source material.

## Capabilities

The `PgvectorPlugin` provides the `vectorstore` capability by implementing the [VectorStoreAdapter](../apis/vector-store-adapter.md) interface [Source 1]. This allows an [Agent](../apis/agent.md) to use a PostgreSQL database with the `pgvector` extension for its semantic memory.

The implementation of the [VectorStoreAdapter](../apis/vector-store-adapter.md) interface provides the following functionalities [Source 1]:
- **`upsert(id, text, metadata)`**: Creates or updates a vector embedding for a given text document.
- **`search(query, topK, filter)`**: Performs a semantic search to find the `topK` most similar documents to a query string.
- **`delete(id)`**: Removes a document and its corresponding vector from the store.
- **`clear()`**: Deletes all entries from the vector store.
- **`size()`**: Returns the total number of documents in the store.

## Sources

[Source 1] Source: `src/memory/vectorMemory.ts`