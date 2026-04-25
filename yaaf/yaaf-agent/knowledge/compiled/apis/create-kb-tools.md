---
summary: Factory function to create agent-facing tools for interacting with a `KBStore`.
export_name: createKBTools
source_file: src/knowledge/store/tools.ts
category: function
title: createKBTools
entity_type: api
search_terms:
 - knowledge base tools
 - how to query a KB
 - agent KB interaction
 - KBStore tools
 - list_kb_index
 - fetch_kb_document
 - search_kb
 - document retrieval tools
 - agent knowledge access
 - create tools from KBStore
 - runtime knowledge base query
 - non-RAG document search
 - keyword search tool
stub: false
compiled_at: 2026-04-24T16:59:21.541Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/tools.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `createKB[[[[[[[[Tools]]]]]]]]` function is a factory that generates a set of standard, agent-facing Tools for interacting with a compiled knowledge base at runtime [Source 1]. It takes an initialized and loaded `KBStore` instance and produces tools that allow an agent to browse, search, and retrieve documents from it.

This provides a mechanism for pure [Document Retrieval](../concepts/document-retrieval.md), not to be confused with Retrieval-Augmented Generation (RAG) or vector-based search. The created tools are [Source 1]:
- `list_kb_index`: Returns a table of contents for the knowledge base.
- `fetch_kb_document`: Retrieves the full content of a specific document.
- `search_kb`: Performs a keyword search across all documents in the knowledge base.

These tools are designed to be passed directly to a YAAF agent's constructor, equipping it with the ability to query the provided knowledge source.

## Signature

The function takes a `KBStore` instance and an optional configuration object.

```typescript
export function createKBTools(
  store: KBStore,
  options?: KBToolOptions
): Tool[];
```

### `KBToolOptions`

The optional `options` object allows for customization of the tools' behavior [Source 1].

```typescript
export type KBToolOptions = {
  /** 
   * Maximum characters for fetch_kb_document results. 
   * @default 16000 
   */
  maxDocumentChars?: number;

  /** 
   * Maximum characters for search_kb excerpts. 
   * @default 800 
   */
  maxExcerptChars?: number;

  /** 
   * Maximum search results returned by search_kb. 
   * @default 5 
   */
  maxSearchResults?: number;
};
```

## Examples

The following example demonstrates how to create a `KBStore`, load it, and then use `createKBTools` to generate tools for an agent [Source 1].

```typescript
import { Agent } from 'yaaf';
import { KBStore } from 'yaaf/kb';
import { createKBTools } from 'yaaf/kb';

// 1. Instantiate a KBStore pointing to a compiled KB directory
const store = new KBStore('./my-compiled-kb');

// 2. Load the KB index and data into memory
await store.load();

// 3. Create the set of runtime tools from the store
const tools = createKBTools(store, {
  maxSearchResults: 10,
  maxDocumentChars: 8000,
});

// 4. Provide the tools to an agent
const agent = new Agent({
  tools: tools,
  // ... other agent configuration
});

// The agent can now use list_kb_index, fetch_kb_document, and search_kb.
```

## Sources

[Source 1]: src/knowledge/store/tools.ts