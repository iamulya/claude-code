---
summary: Estimates the total token count for an array of messages, representing a conversation history.
export_name: estimateConversationTokens
source_file: src/utils/tokens.ts
category: function
title: estimateConversationTokens
entity_type: api
search_terms:
 - calculate conversation tokens
 - token counting for message history
 - estimate prompt size
 - LLM context window management
 - how to count tokens in a chat
 - message array token estimation
 - conversation token heuristic
 - prevent context overflow
 - token budget for conversation
 - YAAF token utilities
 - chat history token count
stub: false
compiled_at: 2026-04-24T17:04:57.236Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/tokens.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `estimateConversationTokens` function calculates an estimated token count for an entire conversation, which is represented as an array of message objects [Source 1]. It iterates through each message in the array, estimates its individual token count using the same logic as `estimateMessageTokens`, and returns the sum.

This utility is essential for managing the [Context Window](../concepts/context-window.md) of a Large Language Model ([LLM](../concepts/llm.md)). Before sending a conversation history to an LLM, developers can use this function to check if the total number of tokens is within the model's limit, helping to prevent API errors caused by [Context Overflow](../concepts/context-overflow.md). The estimation is designed to be a conservative heuristic, often overestimating slightly to provide a safe buffer [Source 1].

## Signature

The function takes a single argument: an array of message-like objects.

```typescript
export function estimateConversationTokens(
  messages: Array<{
    role: string;
    content: string | any;
    // other properties may exist
  }>
): number;
```

**Parameters:**

- `messages`: An array of objects, where each object represents a message in the conversation. Each object is expected to have at least `role` and `content` properties, similar to the structure used by many LLM provider APIs.

**Returns:**

- `number`: The estimated total token count for all messages in the array, rounded up.

## Examples

### Basic Usage

Here is an example of estimating the token count for a short conversation history.

```typescript
import { estimateConversationTokens } from 'yaaf';

const conversationHistory = [
  {
    role: 'user',
    content: 'Hello, what is the capital of France?',
  },
  {
    role: 'assistant',
    content: 'The capital of France is Paris.',
  },
  {
    role: 'user',
    content: 'Thanks!',
  },
];

const totalTokens = estimateConversationTokens(conversationHistory);

console.log(`Estimated conversation tokens: ${totalTokens}`);
// Example output might be: Estimated conversation tokens: 25
```

## See Also

- `estimateTokens`: For estimating tokens from a plain string.
- `estimateMessageTokens`: For estimating tokens for a single structured message object.
- `exceedsBudget`: For a more efficient boolean check against a token limit.

## Sources

[Source 1]: src/utils/tokens.ts