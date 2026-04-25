---
summary: Provides agent-facing tools for querying a compiled Knowledge Base at runtime, enabling browsing, searching, and reading documents without RAG or vector embeddings.
primary_files:
 - src/knowledge/store/tools.ts
title: KB Runtime Tools
entity_type: subsystem
exports:
 - createKBTools
 - KBToolOptions
search_terms:
 - knowledge base tools
 - agent KB access
 - how to search knowledge base
 - list KB documents
 - fetch KB article
 - keyword search in KB
 - runtime KB query
 - non-RAG knowledge access
 - document retrieval tools
 - using KBStore with agents
 - createKBTools function
 - agent tool for reading files
stub: false
compiled_at: 2026-04-24T18:13:50.321Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/tools.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The KB Runtime [Tools](./tools.md) subsystem provides a set of standard, agent-facing tools for interacting with a compiled YAAF Knowledge Base (KB) at runtime [Source 1]. It enables an agent to browse the contents of a KB, perform keyword searches, and retrieve the full text of specific documents. This functionality is designed for pure [Document Retrieval](../concepts/document-retrieval.md) and does not involve Retrieval-Augmented Generation (RAG) or [Vector Embeddings](../concepts/vector-embeddings.md) [Source 1].

## Architecture

This subsystem is centered around the `createKBTools` factory function, which generates three distinct tools from a loaded `KBStore` instance [Source 1]. These tools are standard YAAF `Tool` objects, designed to be directly consumed by an agent's tool-use mechanism [Source 1].

The three tools provided are [Source 1]:
*   **`list_kb_index`**: Returns a table of contents for the knowledge base, formatted similarly to an `llms.txt` file.
*   **`fetch_kb_document`**: Retrieves the full content of a single, specified article from the knowledge base.
*   **`search_kb`**: Performs a keyword search across all articles within the knowledge base.

The behavior of these tools, such as the length of returned content and the number of search results, can be controlled via a `KBToolOptions` configuration object [Source 1].

## Integration Points

The KB Runtime [Tools Subsystem](./tools-subsystem.md) integrates with the core agent by providing a set of tools that can be included in an agent's configuration. The primary dependency is the `KBStore` class; an initialized and loaded `KBStore` instance must be passed to the `createKBTools` function to generate the tools [Source 1].

## Key APIs

*   **`createKBTools(store: KBStore, options?: KBToolOptions)`**: A factory function that accepts a `KBStore` instance and an optional configuration object. It returns an array containing the three knowledge base interaction tools (`list_kb_index`, `fetch_kb_document`, `search_kb`) [Source 1].
*   **`KBToolOptions`**: A type definition for the configuration object passed to `createKBTools`. It allows for customization of the tools' output [Source 1].

## Configuration

The behavior of the generated tools can be customized by providing a `KBToolOptions` object to the `createKBTools` function. The available options are [Source 1]:

*   `maxDocumentChars`: The maximum number of characters to return for the `fetch_kb_document` tool. Defaults to 16,000.
*   `maxExcerptChars`: The maximum number of characters for excerpts in `search_kb` results. Defaults to 800.
*   `maxSearchResults`: The maximum number of results to return from the `search_kb` tool. Defaults to 5.

### Example Usage

The following example demonstrates how to create a `KBStore`, load it, generate the tools, and provide them to a new agent [Source 1].

```typescript
const store = new KBStore('./my-kb')
await store.load()
const tools = createKBTools(store)
const agent = new Agent({ tools })
```

## Sources

[Source 1]: src/knowledge/store/tools.ts