---
summary: The process of retrieving specific documents or information from a knowledge base without relying on RAG or vector embeddings.
title: Document Retrieval
entity_type: concept
related_subsystems:
 - kb-runtime-tools
see_also:
 - KB Runtime Tools
search_terms:
 - knowledge base search
 - find documents in KB
 - non-RAG retrieval
 - keyword search knowledge base
 - how to query KB
 - fetch article content
 - list KB index
 - pure document retrieval
 - vectorless search
 - KBStore tools
 - agent KB access
 - browse knowledge base
stub: false
compiled_at: 2026-04-25T00:18:47.506Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/tools.ts
compiled_from_quality: unknown
confidence: 1
---

## What It Is

Document Retrieval is the process of finding and retrieving relevant documents from a compiled YAAF Knowledge Base based on explicit queries. A key characteristic of this approach in YAAF is that it does not rely on Retrieval-Augmented Generation (RAG) or vector embeddings [Source 1]. Instead, it provides agents with direct, structured access to the knowledge source through keyword search and index browsing, similar to how a human might interact with a digital encyclopedia.

This method is useful when an agent needs to perform exact lookups, browse the structure of a knowledge base, or conduct simple keyword searches without the overhead and potential abstraction of semantic vector search.

## How It Works in YAAF

In YAAF, Document Retrieval is implemented through a set of agent-facing tools provided by the [KB Runtime Tools](../subsystems/kb-runtime-tools.md) subsystem [Source 1]. These tools are generated from a loaded `KBStore` instance, which represents the compiled knowledge base. This approach is described as "pure document retrieval" [Source 1].

The standard tools available to an agent for this purpose are [Source 1]:

*   **`list_kb_index`**: Returns a table of contents for the knowledge base, allowing the agent to understand the scope and structure of the available information.
*   **`fetch_kb_document`**: Retrieves the full content of a specific article when its identifier is known.
*   **`search_kb`**: Performs a keyword-based search across all articles in the knowledge base and returns relevant excerpts.

An agent can use these tools sequentially to discover and read information. For example, it might first use `list_kb_index` to see available topics, then `search_kb` to narrow down to a few relevant articles, and finally `fetch_kb_document` to read the most promising one.

## Configuration

The behavior of the document retrieval tools can be configured when they are created using the `createKBTools` function. The options allow developers to set limits on the amount of data returned, which helps manage the agent's context window and token budget [Source 1].

The available options are defined in the `KBToolOptions` type [Source 1]:

```typescript
export type KBToolOptions = {
  /** Maximum characters for fetch_kb_document results. Default: 16000 */
  maxDocumentChars?: number;
  /** Maximum characters for search_kb excerpts. Default: 800 */
  maxExcerptChars?: number;
  /** Maximum search results returned. Default: 5 */
  maxSearchResults?: number;
};
```

These options are passed when initializing the tools for an agent [Source 1]:

```typescript
import { KBStore } from "./store.js";
import { createKBTools } from "./tools.js";

// Load the knowledge base
const store = new KBStore('./my-kb');
await store.load();

// Create the tools with custom configuration
const tools = createKBTools(store, {
  maxDocumentChars: 10000,
  maxSearchResults: 3,
});

// Provide the tools to an agent
// const agent = new Agent({ tools });
```

## See Also

*   [KB Runtime Tools](../subsystems/kb-runtime-tools.md)

## Sources

*   [Source 1]: `src/knowledge/store/tools.ts`