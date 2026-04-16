---
title: estimateConversationTokens
entity_type: api
summary: Estimate tokens for an array of messages in a conversation history.
export_name: estimateConversationTokens
source_file: src/utils/tokens.ts
category: function
stub: false
compiled_at: 2026-04-16T14:40:25.762Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/utils/tokens.ts
confidence: 1
---

## Overview
`estimateConversationTokens` is a utility function designed to calculate the approximate token count for a collection of messages. It is primarily used to manage context windows and prevent token overflow when sending conversation histories to Large Language Models (LLMs).

The function aggregates estimates for individual messages, incorporating heuristics that account for the character-to-token ratio and the structural overhead (such as JSON formatting) inherent in multi-turn conversations. The underlying heuristic assumes approximately 4 characters per token for English text and code, intentionally overestimating by 5-15% to provide a safety buffer against context limit violations.

## Signature / Constructor

```typescript
export function estimateConversationTokens(
  messages: Array<{
    role: string;
    content: string | any;
    [key: string]: any;
  }>
): number
```

### Parameters
- `messages`: An array of message objects. Each object typically contains a `role` (e.g., "system", "user", "assistant") and `content`. The function also accounts for additional fields that might be present in structured tool-use or metadata.

### Returns
- `number`: The total estimated token count for the entire array, rounded up to the nearest integer.

## Examples

### Estimating a Standard Conversation
This example demonstrates how to estimate the token usage for a simple system prompt and user query.

```typescript
import { estimateConversationTokens } from 'yaaf';

const history = [
  { 
    role: 'system', 
    content: 'You are a helpful assistant that summarizes technical documentation.' 
  },
  { 
    role: 'user', 
    content: 'Can you explain how the YAAF token utility works?' 
  }
];

const estimatedTokens = estimateConversationTokens(history);
console.log(`Estimated conversation size: ${estimatedTokens} tokens`);
```

### Context Window Management
Using the estimate to truncate history before calling a provider.

```typescript
import { estimateConversationTokens } from 'yaaf';

const MAX_CONTEXT = 4096;
const history = [ /* ... many messages ... */ ];

const currentUsage = estimateConversationTokens(history);

if (currentUsage > MAX_CONTEXT) {
  // Logic to prune or summarize history
  console.warn('Conversation exceeds context budget');
}
```

## See Also
- `estimateTokens`: The underlying function for estimating tokens from raw strings.
- `estimateMessageTokens`: The function used to estimate tokens for a single message object.
- `exceedsBudget`: A boolean check for text against a specific token limit.

### Sources
- `src/utils/tokens.ts`