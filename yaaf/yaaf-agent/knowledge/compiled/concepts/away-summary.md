---
summary: A core YAAF concept for providing users with a concise recap of an agent session when they return after a period of inactivity.
title: Away Summary
entity_type: concept
search_terms:
 - while you were away
 - session recap
 - session summary
 - user return experience
 - agent inactivity summary
 - how to summarize agent conversation
 - welcome back message
 - task progress summary
 - next step reminder
 - generate session recap
 - away message
stub: false
compiled_at: 2026-04-24T17:52:52.027Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/awaySummary.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

An Away Summary is a concise, automatically generated recap of an [Agent Session](./agent-session.md), presented to a user [when](../apis/when.md) they return after a period of inactivity [Source 1]. This feature, often referred to as a "while you were away" summary, aims to improve the user experience for long-running or asynchronous agent interactions.

The summary typically consists of one to three sentences that highlight the high-level task the agent was working on and the concrete next step, allowing the user to quickly re-orient themselves and understand the current state of the session without needing to review the entire conversation history [Source 1].

## How It Works in YAAF

In YAAF, this functionality is provided by the `generateAwaySummary` asynchronous function [Source 1]. This utility takes a configuration object containing the necessary context to generate the summary.

The core inputs are the session's message history and a language model (`ChatModel`) to perform the summarization. The framework recommends using a small, [Fast Model](./fast-model.md) for this purpose to ensure a quick response upon session resumption [Source 1]. The function processes a configurable number of recent messages (defaulting to 30) and can also incorporate broader session [Memory](./memory.md) to generate a more contextually aware recap [Source 1].

The function is designed to be robust, returning `null` if the summarization is aborted, if the message history is empty, or if an error occurs during generation [Source 1].

## Configuration

The behavior of the Away Summary generation is controlled via the `AwaySummaryConfig` object passed to the `generateAwaySummary` function.

The configuration options are defined by the `AwaySummaryConfig` type [Source 1]:
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
  /** Optional session memory to include for broader context. */
  sessionMemory?: string;
};
```

A typical implementation involves calling this function when a user's session is resumed and displaying the result as a welcome message [Source 1].

```typescript
// On session resume:
const recap = await generateAwaySummary({
  messages: session.messages,
  model: smallModel,
});
if (recap) console.log(`Welcome back! ${recap}`);
```

## Sources
[Source 1]: src/utils/awaySummary.ts