---
title: estimateMessageTokens
entity_type: api
summary: Estimate token count for a structured message, accounting for JSON overhead in tool-use.
export_name: estimateMessageTokens
source_file: src/utils/tokens.ts
category: function
stub: false
compiled_at: 2026-04-16T14:40:16.463Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/utils/tokens.ts
confidence: 1
---

## Overview
`estimateMessageTokens` is a utility function used to calculate the approximate token count of a single structured message. Unlike simple string estimation, this function accounts for the metadata and structural overhead (such as JSON formatting) typically present in messages passed to Large Language Models (LLMs), particularly those involving tool-use or structured outputs.

This function is part of the YAAF token management utilities, which use a conservative character-ratio heuristic (~4 characters per token) to prevent context window overflow.

## Signature / Constructor

```typescript
export function estimateMessageTokens(message: {
  role: string;
  content: string | any;
  [key: string]: any;
}): number;
```

### Parameters
- `message`: An object representing a conversation turn. It must contain at least a `role` and `content` field. The `content` may be a string or a structured object (e.g., for tool calls).

### Returns
- `number`: The estimated token count, rounded up to the nearest integer.

## Examples

### Estimating a Simple User Message
```typescript
import { estimateMessageTokens } from 'yaaf';

const message = {
  role: 'user',
  content: 'What is the capital of France?'
};

const tokens = estimateMessageTokens(message);
console.log(`Estimated tokens: ${tokens}`);
```

### Estimating a Tool-Use Message
When a message contains structured data for tool-calling, the function accounts for the additional JSON overhead.

```typescript
import { estimateMessageTokens } from 'yaaf';

const toolMessage = {
  role: 'assistant',
  content: null,
  tool_calls: [
    {
      id: 'call_123',
      type: 'function',
      function: {
        name: 'get_weather',
        arguments: '{"location": "Paris"}'
      }
    }
  ]
};

const tokens = estimateMessageTokens(toolMessage);
```

## See Also
- `estimateTokens`: Base utility for estimating tokens from raw text.
- `estimateConversationTokens`: Utility for estimating the total tokens in an array of messages.
- `exceedsBudget`: A boolean check to determine if text fits within a specific token limit.