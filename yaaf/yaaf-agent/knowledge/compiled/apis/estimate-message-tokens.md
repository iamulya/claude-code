---
summary: Estimates token count for a structured message, accounting for JSON overhead in tool-use and structured messages.
export_name: estimateMessageTokens
source_file: src/utils/tokens.ts
category: function
title: estimateMessageTokens
entity_type: api
search_terms:
 - token counting for messages
 - calculate message tokens
 - JSON token overhead
 - tool use token estimation
 - structured message token count
 - how to estimate tokens for an object
 - YAAF token utilities
 - context window management
 - message size calculation
 - token estimation heuristic
 - predict message token length
stub: false
compiled_at: 2026-04-24T17:05:01.444Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/tokens.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `estimateMessageTokens` function is a utility for estimating the number of tokens a single, structured message object will consume. It is designed to be more accurate than simply counting tokens in the message's content because it also accounts for the JSON structure and metadata (like `role`) that contribute to the final token count [when](./when.md) serialized and sent to a language model [Source 1].

This function is particularly useful for managing the [Context Window](../concepts/context-window.md) of an [LLM](../concepts/llm.md). Before adding a new message to a conversation history, developers can use `estimateMessageTokens` to predict its token cost, helping to prevent [Context Overflow](../concepts/context-overflow.md) errors. It is especially valuable for messages involving [Tool Use](../concepts/tool-use.md) or other structured data, where the JSON overhead can be significant.

## Signature

The function takes a single message object and returns an estimated token count as a number.

```typescript
export function estimateMessageTokens(message: {
  role: string;
  content: any;
  [key: string]: any; // Other potential fields like tool_call_id
}): number;
```

### Parameters

- **`message`**: An object representing a single message in a conversation. It typically includes `role` and `content` fields, but the function will account for any properties on the object.

### Returns

- **`number`**: The estimated number of tokens for the entire message object.

## Examples

### Estimating a simple user message

This example shows how to estimate the token count for a standard user message. The result will include tokens for the content string as well as the overhead from the JSON keys like `"role"` and `"content"`.

```typescript
import { estimateMessageTokens } from 'yaaf';

const userMessage = {
  role: 'user',
  content: 'What is the current weather in London?'
};

const tokenCount = estimateMessageTokens(userMessage);

console.log(`Estimated tokens for the message: ${tokenCount}`);
```

### Estimating a tool result message

This example demonstrates estimating tokens for a more complex message, such as the result from a tool call. The function correctly accounts for the entire serialized JSON structure.

```typescript
import { estimateMessageTokens } from 'yaaf';

const toolResultMessage = {
  role: 'tool',
  tool_call_id: 'call_xyz789',
  content: JSON.stringify({
    location: 'London',
    temperature: '15°C',
    condition: 'Partly Cloudy'
  })
};

const tokenCount = estimateMessageTokens(toolResultMessage);

console.log(`Estimated tokens for the tool result: ${tokenCount}`);
```

## See Also

- `estimateTokens`: For estimating tokens from a plain text string.
- `estimateConversationTokens`: For estimating the total token count of an array of messages.
- `exceedsBudget`: A more efficient check to see if text exceeds a token limit without calculating the exact count.

## Sources

[Source 1] src/utils/tokens.ts