---
title: SearchResult
entity_type: api
summary: Represents a single result returned from a knowledge base search operation, including content and relevance metadata.
export_name: SearchResult
source_file: src/knowledge/store/store.ts
category: type
stub: false
compiled_at: 2026-04-16T14:29:20.564Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/store/index.ts
confidence: 0.85
---

## Overview
`SearchResult` is a TypeScript type used within the YAAF knowledge base subsystem to represent an individual item retrieved during a search operation. It encapsulates the retrieved content along with metadata used to determine the relevance of the result to the original query. This type is the standard output format for knowledge store queries, allowing agents to process and utilize external information in a structured manner.

## Signature / Constructor
The `SearchResult` type is defined in the core store module and exported via the knowledge store barrel.

```typescript
export type SearchResult = {
  content: string;
  score: number;
  metadata: Record<string, any>;
};
```

## Properties
| Property | Type | Description |
| :--- | :--- | :--- |
| `content` | `string` | The raw text or data content of the retrieved document chunk. |
| `score` | `number` | A numerical value representing the relevance of the result to the search query (e.g., cosine similarity). |
| `metadata` | `Record<string, any>` | A collection of key-value pairs containing additional information about the source document, such as IDs, timestamps, or source URLs. |

## Examples
### Basic Usage
This example demonstrates how a `SearchResult` is typically structured when returned from a knowledge base search.

```typescript
import { SearchResult } from 'yaaf/knowledge';

const result: SearchResult = {
  content: "YAAF is a TypeScript-first agent framework.",
  score: 0.95,
  metadata: {
    source: "documentation.md",
    section: "introduction",
    lastUpdated: "2023-10-27"
  }
};

console.log(`Found match with score ${result.score}: ${result.content}`);
```

## See Also
- `CompiledDocument`
- `KBIndexEntry`