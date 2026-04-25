---
summary: Represents a single search result item returned by the Honcho memory service.
export_name: HonchoSearchResult
source_file: src/integrations/honcho.ts
category: type
title: HonchoSearchResult
entity_type: api
search_terms:
 - Honcho search result type
 - what is a honcho search result
 - honcho memory search
 - honcho plugin search results
 - search result structure
 - honcho search score
 - honcho search metadata
 - honcho search content
 - honcho session id in search
 - honcho message id in search
 - data type for honcho search
stub: false
compiled_at: 2026-04-24T17:12:08.145Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/honcho.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`HonchoSearchResult` is a TypeScript type that defines the structure of an object returned from a search query performed by the `HonchoPlugin`. Each object represents a single piece of information retrieved from the Honcho [Memory](../concepts/memory.md) service that matches the search criteria.

This type is primarily used to handle the results from memory search operations, providing not only the content of the memory but also a relevance score, unique identifiers, and any associated metadata.

## Signature

`HonchoSearchResult` is a type alias for an object with the following properties:

```typescript
export type HonchoSearchResult = {
  content: string;
  score: number;
  sessionId: string;
  messageId: string;
  metadata?: Record<string, unknown>;
};
```

### Properties

- **`content`**: `string`
  The textual content of the retrieved memory item.

- **`score`**: `number`
  A numerical value indicating the relevance of this result to the search query. Higher scores typically indicate a better match.

- **`sessionId`**: `string`
  The unique identifier for the session in which this memory was recorded.

- **`messageId`**: `string`
  The unique identifier for the specific message or memory item.

- **`metadata`**: `Record<string, unknown>` (optional)
  An optional object containing any unstructured metadata that was saved along with the memory item.

## Examples

The following example demonstrates how to process an array of `HonchoSearchResult` objects that might be returned from a search method on an initialized `HonchoPlugin` instance.

```typescript
import type { HonchoPlugin, HonchoSearchResult } from 'yaaf';

// Assume 'honcho' is an initialized and registered instance of HonchoPlugin.
// The search method is hypothetical but illustrates the usage of the type.
declare const honcho: HonchoPlugin;

async function findAndDisplayMemories(peerId: string, query: string): Promise<void> {
  // A search operation would return an array of HonchoSearchResult objects.
  const searchResults: HonchoSearchResult[] = await honcho.search(peerId, query);

  if (searchResults.length === 0) {
    console.log(`No memories found for query: "${query}"`);
    return;
  }

  console.log(`Top search results for "${query}":`);
  for (const result of searchResults) {
    console.log(
      `- [Score: ${result.score.toFixed(3)}] ${result.content} (Session: ${result.sessionId})`
    );
    if (result.metadata) {
      console.log(`  Metadata: ${JSON.stringify(result.metadata)}`);
    }
  }
}

// Example usage:
// findAndDisplayMemories('user-123', 'user preferences for UI');
```

## See Also

- `HonchoPlugin`: The plugin that provides memory search capabilities and returns `HonchoSearchResult` objects.
- `HonchoConfig`: The configuration object used to initialize the `HonchoPlugin`.

## Sources

[Source 1] src/[Integrations](../subsystems/integrations.md)/honcho.ts