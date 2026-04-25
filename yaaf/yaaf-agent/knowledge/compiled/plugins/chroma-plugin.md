---
summary: A YAAF plugin for integrating with Chroma, an open-source embedding database, for vector storage.
title: ChromaPlugin
entity_type: plugin
capabilities:
 - vectorstore
built_in: false
search_terms:
 - ChromaDB integration
 - vector database plugin
 - semantic search with Chroma
 - how to use Chroma with YAAF
 - external vector store
 - production vector memory
 - embedding database
 - Chroma vector store
 - VectorStoreAdapter implementation
 - alternative to VectorMemoryPlugin
 - scalable semantic memory
stub: false
compiled_at: 2026-04-25T00:27:02.291Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/vectorMemory.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

The ChromaPlugin is a community-provided plugin that integrates YAAF with Chroma, an open-source embedding database. It serves as a scalable and production-ready backend for semantic memory and vector search operations [Source 1].

This plugin implements the [VectorStoreAdapter](../apis/vector-store-adapter.md) interface, making it a drop-in replacement for the default in-process [VectorMemoryPlugin](./vector-memory-plugin.md). It is recommended for applications with large document corpora or those requiring a persistent, production-grade vector store. Other community plugins providing similar functionality for different databases include [QdrantPlugin](./qdrant-plugin.md) and [PgvectorPlugin](./pgvector-plugin.md) [Source 1].

## Installation

As a community plugin, ChromaPlugin is not included with the core `yaaf` package and must be installed as a separate dependency. Specific installation instructions are not available in the provided source material.

## Configuration

Configuration details, such as constructor parameters for connecting to a ChromaDB instance, are not available in the provided source material.

## Capabilities

ChromaPlugin implements the `vectorstore` capability.

### vectorstore

By implementing the [VectorStoreAdapter](../apis/vector-store-adapter.md) interface, the plugin provides the following methods for managing vector embeddings [Source 1]:

*   `upsert(id, text, metadata)`: Adds or updates a text document and its corresponding vector embedding in the Chroma database.
*   `search(query, topK, filter)`: Performs a semantic search to find the `topK` most similar documents to a given query string.
*   `delete(id)`: Removes a document from the vector store by its ID.
*   `clear()`: Deletes all entries from the vector store.
*   `size()`: Returns the total number of documents in the store.

## Sources

[Source 1]: src/memory/vectorMemory.ts