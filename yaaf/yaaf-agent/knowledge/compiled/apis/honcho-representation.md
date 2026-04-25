---
summary: Represents a stored memory or context item in Honcho.
export_name: HonchoRepresentation
source_file: src/integrations/honcho.ts
category: type
title: HonchoRepresentation
entity_type: api
search_terms:
 - Honcho memory item
 - Honcho context object
 - structure of Honcho data
 - Honcho peer data
 - Honcho session data
 - what is a Honcho representation
 - Honcho data model
 - Honcho storage format
 - peerId in Honcho
 - sessionId in Honcho
 - Honcho content field
 - Honcho API data types
stub: false
compiled_at: 2026-04-24T17:11:53.706Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/honcho.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`HonchoRepresentation` is a TypeScript type that defines the data structure for a single item stored in the Honcho cloud [Memory](../concepts/memory.md) system [Source 1]. This type is used to represent memories, user context, or other pieces of information retrieved from Honcho. It provides a standardized format for data associated with a specific peer (user) and, optionally, a session.

## Signature

`HonchoRepresentation` is a type alias for an object with the following properties [Source 1]:

```typescript
export type HonchoRepresentation = {
  peerId: string;
  sessionId?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};
```

### Properties

*   **`peerId: string`**
    The unique identifier for the user, agent, or entity to whom this memory item belongs.

*   **`sessionId?: string`**
    An optional identifier for the specific session or conversation this item is associated with.

*   **`content: string`**
    The string content of the memory or context item.

*   **`createdAt: string`**
    An ISO 8601 timestamp string indicating [when](./when.md) the item was first created.

*   **`updatedAt: string`**
    An ISO 8601 timestamp string indicating when the item was last updated.

## Examples

The following example demonstrates the structure of a `HonchoRepresentation` object and how one might interact with it after retrieving it from a data source.

```typescript
import type { HonchoRepresentation } from 'yaaf';

// This is a hypothetical function that returns a HonchoRepresentation object.
// In a real application, this data would come from the HonchoPlugin.
async function fetchLatestMemory(peerId: string): Promise<HonchoRepresentation> {
  // In a real scenario, this would be an API call.
  return {
    peerId: 'user-42',
    sessionId: 'session-xyz-987',
    content: 'User has expressed interest in quantum computing.',
    createdAt: '2023-11-01T14:30:00Z',
    updatedAt: '2023-11-01T14:30:00Z',
  };
}

async function displayUserMemory() {
  const memoryItem: HonchoRepresentation = await fetchLatestMemory('user-42');

  console.log(`Memory for Peer: ${memoryItem.peerId}`);
  console.log(`Session: ${memoryItem.sessionId}`);
  console.log(`Content: "${memoryItem.content}"`);
  console.log(`Created: ${new Date(memoryItem.createdAt).toLocaleString()}`);
}

displayUserMemory();
```

## See Also

*   `HonchoPlugin`: The main class for integrating YAAF with the Honcho service.
*   `HonchoSearchResult`: A related type that represents the structure of items returned from a Honcho search query.

## Sources

[Source 1] src/[Integrations](../subsystems/integrations.md)/honcho.ts