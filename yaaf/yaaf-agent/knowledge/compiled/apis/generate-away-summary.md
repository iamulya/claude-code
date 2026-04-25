---
summary: Generates a short session recap for the 'while you were away' experience, focusing on high-level task and concrete next step.
export_name: generateAwaySummary
source_file: src/utils/awaySummary.ts
category: function
title: generateAwaySummary
entity_type: api
search_terms:
 - session recap
 - while you were away
 - summarize chat history
 - session resume summary
 - agent state recap
 - generate session summary
 - away message
 - contextual summary
 - task continuation
 - next step suggestion
 - conversation summary
 - welcome back message
stub: false
compiled_at: 2026-04-24T17:08:04.103Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/awaySummary.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `generateAwaySummary` function creates a brief, one-to-three sentence recap of an [Agent Session](../concepts/agent-session.md). It is designed for the "while you were away" experience, providing a user with a concise summary [when](./when.md) they resume an existing session [Source 1].

The summary focuses on the high-level task the agent was performing and suggests a concrete next step, helping the user quickly re-engage with the session's context [Source 1].

## Signature

The function is an asynchronous operation that takes a configuration object and returns a promise that resolves to the summary string or `null` [Source 1].

```typescript
export async function generateAwaySummary(
  config: AwaySummaryConfig
): Promise<string | null>;
```

The function returns `null` if the operation is aborted, the message transcript is empty, or an error occurs during generation [Source 1].

### Configuration

The `AwaySummaryConfig` object has the following properties:

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

**Parameters:**

*   `messages` **(required)**: An array of message objects representing the session history to be summarized [Source 1].
*   `model` **(required)**: The `ChatModel` instance to use for generating the summary. A small, [Fast Model](../concepts/fast-model.md) is recommended for this purpose [Source 1].
*   `signal` (optional): An `AbortSignal` to allow for cancellation of the summary generation process [Source 1].
*   `recentMessageWindow` (optional): The maximum number of recent messages to include in the context for summarization. Defaults to `30` [Source 1].
*   `sessionMemory` (optional): A string containing broader session Memory context, which can be included to improve the quality of the summary [Source 1].

## Examples

The following example demonstrates how to generate and display a summary when a user resumes a session.

```typescript
// On session resume:
const recap = await generateAwaySummary({
  messages: session.messages,
  model: smallModel,
});

if (recap) {
  console.log(`Welcome back! ${recap}`);
}
```
[Source 1]

## Sources

[Source 1]: src/utils/awaySummary.ts