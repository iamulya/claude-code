---
summary: The result object returned by a `ChatModel` after processing a chat request, typically containing messages and other metadata.
export_name: ChatResult
source_file: src/agents/runner.ts
category: type
title: ChatResult
entity_type: api
search_terms:
 - LLM response object
 - chat model output
 - agent run result
 - what does chat model return
 - type for LLM response
 - message history from agent
 - model completion data
 - agent response type
 - LLM output structure
 - chat completion object
stub: false
compiled_at: 2026-04-25T00:05:42.806Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/structuredOutput.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/structuredOutputValidator.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `ChatResult` type represents the complete output from an interaction with a [ChatModel](./chat-model.md). It serves as a standard data structure that encapsulates the [LLM](../concepts/llm.md)'s response, which typically includes one or more [ChatMessage](./chat-message.md) objects, along with any other metadata provided by the model provider.

This type is fundamental in YAAF, as it is the primary return value for core agent and model execution functions. Other components, such as the `StructuredOutputValidator`, consume `ChatResult` objects to perform validation or further processing on the model's output [Source 2].

## Signature

The specific fields of the `ChatResult` type are not fully defined in the provided source materials. However, it is consistently imported from `src/agents/runner.ts` and is used as the return type for chat model operations [Source 1, Source 2].

Conceptually, it encapsulates the model's response messages and associated metadata.

```typescript
import type { ChatMessage } from './runner.js';

// Note: The exact structure is not detailed in the provided sources.
// The following represents a conceptual structure based on its usage.
export type ChatResult = {
  /**
   * An array of one or more ChatMessage objects from the model.
   * This is the primary payload of the response.
   */
  messages: ChatMessage[];

  /**
   * Other potential metadata, such as:
   * - Token usage statistics
   * - Finish reason (e.g., 'stop', 'tool_calls', 'length')
   * - Raw provider response
   */
  [key: string]: any;
};
```

## Properties

While the exact properties are not specified in the source material, a `ChatResult` object conceptually contains:

*   **`messages`**: An array of [ChatMessage](./chat-message.md) objects. This is the main content of the model's reply. For a simple completion, it might be a single message with `role: 'assistant'`. If the model invokes tools, this array could contain tool call requests.

## Examples

The primary use of `ChatResult` is to capture the output of a [ChatModel](./chat-model.md) call and pass it to subsequent processing steps.

```typescript
import { ChatModel, ChatResult, ChatMessage } from 'yaaf';
import { somePostProcessingFunction } from './utils';

// Assume 'myModel' is an initialized ChatModel instance
declare const myModel: ChatModel;

async function getModelResponse(prompt: string): Promise<void> {
  const userMessage: ChatMessage = { role: 'user', content: prompt };

  // The .run() method of a ChatModel returns a Promise<ChatResult>
  const result: ChatResult = await myModel.run([userMessage]);

  // The result object can then be used by other parts of the application
  console.log('Model responded with:', result.messages[0].content);

  // It can also be passed to other functions for validation or analysis
  somePostProcessingFunction(result);
}
```

## See Also

*   [ChatModel](./chat-model.md): The class that produces a `ChatResult`.
*   [ChatMessage](./chat-message.md): The type used for messages within a `ChatResult`.

## Sources

*   [Source 1]: `src/agents/structuredOutput.ts`
*   [Source 2]: `src/security/structuredOutputValidator.ts`