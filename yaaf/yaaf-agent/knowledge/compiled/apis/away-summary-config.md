---
summary: Defines the configuration options for the `generateAwaySummary` function, including session messages, model, and context parameters.
export_name: AwaySummaryConfig
source_file: src/utils/awaySummary.ts
category: type
title: AwaySummaryConfig
entity_type: api
search_terms:
 - session recap configuration
 - while you were away summary
 - configure away summary
 - generateAwaySummary parameters
 - session resume message
 - chat history summary options
 - LLM session recap
 - message window size
 - abort signal for summary
 - session memory context
 - recap generation settings
stub: false
compiled_at: 2026-04-24T16:52:14.215Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/awaySummary.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`AwaySummaryConfig` is a TypeScript type alias that defines the structure of the configuration object required by the `generateAwaySummary` function [Source 1]. This function is used to generate a brief, 1-3 sentence "while you were away" recap [when](./when.md) a user resumes a session. The configuration object specifies the chat history, the language model to use for summarization, and other parameters that control the context and execution of the summary generation [Source 1].

## Signature

`AwaySummaryConfig` is an object type with the following properties:

```typescript
export type AwaySummaryConfig = {
  /** Session messages to summarize. */
  messages: ReadonlyArray<{ role: string; content: string }>;
  /** Model to use (small/fast recommended). */
  model: ChatModel;
  /** Abort signal. */
  signal?: AbortSignal;
  /** Maximum recent messages to include in context. Default: 30. */
  recentMessageWindow?: number;
  /** Optional session [[[[[[[[Memory]]]]]]]] to include for broader context. */
  sessionMemory?: string;
};
```

### Properties

*   **`messages`**: `ReadonlyArray<{ role: string; content: string }>` (required)
    The array of session messages that will be summarized [Source 1].

*   **`model`**: `ChatModel` (required)
    The language model instance responsible for generating the summary. The source documentation recommends using a small, [Fast Model](../concepts/fast-model.md) for this purpose [Source 1].

*   **`signal`**: `AbortSignal` (optional)
    An optional `AbortSignal` to allow for the cancellation of the summary generation process [Source 1].

*   **`recentMessageWindow`**: `number` (optional)
    The maximum number of recent messages from the end of the `messages` array to include in the context for summarization. If not provided, this defaults to 30 [Source 1].

*   **`sessionMemory`**: `string` (optional)
    An optional string containing broader session context or Memory, which can be provided to the model to generate a more informed summary [Source 1].

## Examples

The following example demonstrates how to create an `AwaySummaryConfig` object and pass it to the `generateAwaySummary` function to get a session recap.

```typescript
import { generateAwaySummary, AwaySummaryConfig } from 'yaaf';
import type { ChatModel } from 'yaaf';

// Assume these are provided by your application's session management
declare const sessionMessages: ReadonlyArray<{ role: string; content: string }>;
declare const smallModel: ChatModel;
declare const sessionMemory: string;

// Create the configuration object
const summaryConfig: AwaySummaryConfig = {
  messages: sessionMessages,
  model: smallModel,
  recentMessageWindow: 20, // Optionally override the default
  sessionMemory: sessionMemory, // Provide extra context
};

// Generate the summary
async function showRecap() {
  const recap = await generateAwaySummary(summaryConfig);

  if (recap) {
    console.log(`Welcome back! While you were away: ${recap}`);
  }
}

showRecap();
```

## See Also

*   `generateAwaySummary`: The function that consumes the `AwaySummaryConfig` object to produce a session summary.

## Sources

[Source 1]: src/utils/awaySummary.ts