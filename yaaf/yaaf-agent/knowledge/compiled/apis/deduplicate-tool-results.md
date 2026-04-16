---
summary: Identifies and replaces consecutive identical tool results in the message history to reduce token usage.
export_name: deduplicateToolResults
source_file: src/context/historySnip.ts
category: function
title: deduplicateToolResults
entity_type: api
stub: false
compiled_at: 2026-04-16T14:17:16.918Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/context/historySnip.ts
confidence: 1
---

## Overview
`deduplicateToolResults` is a utility function designed for conversation history optimization. It performs a pre-compaction pass to identify and remove redundant information from the message history without requiring an LLM call. 

The function targets scenarios where a tool is invoked multiple times and returns the exact same output (for example, repeated calls to read the same file). It retains only the most recent occurrence of the identical output and replaces previous instances with a placeholder string. This process reduces the total token count of the conversation context, making subsequent LLM processing more efficient.

## Signature / Constructor

```typescript
export function deduplicateToolResults(
  messages: MessageLike[],
  placeholder = '[Duplicate result — see below]',
): SnipResult
```

### Parameters
* `messages`: An array of `MessageLike` objects representing the conversation history.
* `placeholder`: (Optional) A string used to replace the content of duplicated tool results. Defaults to `"[Duplicate result — see below]"`.

### Supporting Types

#### MessageLike
```typescript
export type MessageLike = {
  role: string
  content: string
  toolName?: string
  toolCallId?: string
}
```

#### SnipResult
```typescript
export type SnipResult = {
  /** Messages with old content snipped. */
  snipped: MessageLike[]
  /** Estimated tokens freed by snipping. */
  tokensFreed: number
  /** Number of tool results snipped. */
  itemsRemoved: number
}
```

## Examples

### Basic Deduplication
This example demonstrates how the function identifies identical tool outputs and replaces the earlier instance.

```typescript
import { deduplicateToolResults } from 'yaaf';

const history = [
  { 
    role: 'tool', 
    toolName: 'read_file', 
    content: 'export const version = "1.0.0";', 
    toolCallId: 'call_1' 
  },
  { 
    role: 'assistant', 
    content: 'I have checked the version.' 
  },
  { 
    role: 'tool', 
    toolName: 'read_file', 
    content: 'export const version = "1.0.0";', 
    toolCallId: 'call_2' 
  }
];

const { snipped, itemsRemoved, tokensFreed } = deduplicateToolResults(history);

// snipped[0].content is now "[Duplicate result — see below]"
// snipped[2].content remains "export const version = "1.0.0";"
// itemsRemoved will be 1
```

## See Also
* `snipHistory` — A related function for removing old or large tool results based on age and size.