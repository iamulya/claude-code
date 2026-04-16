---
title: KBToolOptions
entity_type: api
summary: Configuration options for Knowledge Base runtime tools, including character limits and search result counts.
export_name: KBToolOptions
source_file: src/knowledge/store/tools.ts
category: type
stub: false
compiled_at: 2026-04-16T14:29:33.668Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/store/tools.ts
confidence: 1
---

## Overview
`KBToolOptions` is a configuration object used when initializing Knowledge Base (KB) runtime tools. These tools allow agents to interact with a compiled `KBStore` to perform tasks such as listing available documents, fetching specific article content, and performing keyword searches.

The options defined in this type control the verbosity and resource consumption of the tools, ensuring that the content returned to the LLM stays within context window limits.

## Signature
```typescript
export type KBToolOptions = {
  maxDocumentChars?: number
  maxExcerptChars?: number
  maxSearchResults?: number
}
```

## Properties
| Property | Type | Description | Default |
| :--- | :--- | :--- | :--- |
| `maxDocumentChars` | `number` | The maximum number of characters returned when using the `fetch_kb_document` tool. | `16000` |
| `maxExcerptChars` | `number` | The maximum number of characters for each result excerpt when using the `search_kb` tool. | `800` |
| `maxSearchResults` | `number` | The maximum number of search results returned by the `search_kb` tool. | `5` |

## Examples

### Basic Configuration
This example demonstrates how to pass custom options to the `createKBTools` function to increase the number of search results and decrease the document character limit.

```typescript
import { KBStore } from './src/knowledge/store/store.js';
import { createKBTools, KBToolOptions } from './src/knowledge/store/tools.js';

const store = new KBStore('./docs/kb');
await store.load();

const options: KBToolOptions = {
  maxDocumentChars: 10000,
  maxSearchResults: 10,
  maxExcerptChars: 500
};

const tools = createKBTools(store, options);
```

### Default Usage
If no options are provided, the tools use the default values defined in the framework.

```typescript
const store = new KBStore('./docs/kb');
await store.load();

// Uses default: 16000 chars/doc, 800 chars/excerpt, 5 results
const tools = createKBTools(store);
```