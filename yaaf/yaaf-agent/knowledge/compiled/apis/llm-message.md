---
summary: Type definition for a single message in an LLM conversation context.
export_name: LLMMessage
source_file: src/plugin/types.js
category: type
title: LLMMessage
entity_type: api
search_terms:
 - LLM chat message format
 - conversation history type
 - user assistant system roles
 - LLM input structure
 - agent message object
 - how to format chat history
 - YAAF message type
 - LLMAdapter message parameter
 - tool call message
 - function call message
 - representing conversation turns
 - chat completion message
stub: false
compiled_at: 2026-04-24T17:18:32.885Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/base.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

The `[[[[[[[[LLM]]]]]]]]Message` type represents a single turn or message within a conversational history. An array of `LLMMessage` objects is used to construct the context provided to a Large Language Model for generating a response.

This type is a fundamental part of the `LLMAdapter` interface, serving as the standard format for passing sequences of user prompts, assistant responses, system instructions, and tool outputs to an underlying language model. It ensures a consistent structure for conversational data across different LLM providers.

## Signature

The precise definition of the `LLMMessage` type is not available in the provided source material [Source 1]. It is defined in `src/plugin/types.js` and imported by other modules, such as `BaseLLMAdapter`, for use in their interfaces.

```typescript
// Source: src/models/base.ts
// LLMMessage is imported for use in the LLMAdapter interface.
import type { LLMAdapter, LLMQueryParams, LLMResponse, LLMMessage } from "../plugin/types.js";
```

Conceptually, an `LLMMessage` object contains the necessary information to represent one part of a dialogue, such as the role of the speaker (e.g., 'user', 'assistant', 'system') and the content of the message.

## Examples

While the exact structure is not defined in the source, the following example illustrates the conceptual usage of `LLMMessage` objects [when](./when.md) interacting with an LLM adapter. A conversation is represented as an array of messages, which is then passed to the adapter's `query` method.

```typescript
import { LLMMessage } from 'yaaf';
import { someLLMAdapter } from './my-adapter'; // A hypothetical LLMAdapter instance

async function getChatResponse(prompt: string) {
  // A conversation is an array of LLMMessage objects.
  const conversationHistory: LLMMessage[] = [
    // These objects would conform to the LLMMessage type definition.
    // For example: { role: 'system', content: 'You are a helpful assistant.' },
    // For example: { role: 'user', content: 'What is YAAF?' },
    // For example: { role: 'assistant', content: 'YAAF is Yet Another Agent Framework.' },
    // The new user prompt is the latest message in the history.
    // For example: { role: 'user', content: prompt },
  ];

  // The adapter's query method expects an array of LLMMessage.
  const response = await someLLMAdapter.query({
    messages: conversationHistory,
  });

  console.log(response.message.content);
  return response;
}
```

## Sources

[Source 1]: src/models/base.ts