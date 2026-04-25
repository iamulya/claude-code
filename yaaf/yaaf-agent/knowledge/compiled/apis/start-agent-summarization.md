---
title: startAgentSummarization
summary: Starts a periodic background process to summarize an agent's progress.
export_name: startAgentSummarization
source_file: src/agents/agentSummary.ts
category: function
entity_type: api
search_terms:
 - agent progress summary
 - background agent monitoring
 - how to get agent status
 - periodic task summarization
 - worker agent UI updates
 - summarize message history
 - agent summarizer
 - coordinator-worker pattern
 - display agent activity
 - stop agent summarization
 - SummarizationHandle
 - AgentSummarizationConfig
stub: false
compiled_at: 2026-04-24T17:40:04.602Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/agentSummary.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `startAgentSummarization` function initiates a periodic, background process to summarize an agent's ongoing work [Source 1]. This is particularly useful in scenarios with multiple agents, such as a coordinator agent managing several worker agents. Each worker can use this function to generate a short, 3-5 word progress summary (e.g., "Reading config.json", "Fixing null check") that can be displayed in a user interface [Source 1].

This function returns a handle that allows the summarization process to be stopped later. The summarization loop is non-overlapping, meaning a new summary generation will not start until the previous one has completed [Source 1].

## Signature / Constructor

The function takes a single configuration object and returns a handle to control the process.

```typescript
export function startAgentSummarization(
  config: AgentSummarizationConfig
): SummarizationHandle;
```

### `AgentSummarizationConfig`

This is the configuration object passed to `startAgentSummarization`.

```typescript
export type AgentSummarizationConfig = {
  /** Unique agent identifier */
  agentId: string;
  /** A small/fast model for generating summaries (not the main model) */
  model: [[[[[[[[ChatModel]]]]]]]];
  /** Function that returns the agent's current message history */
  getMessages: () => Array<{ role: string; content: string }>;
  /** Called with the summary text [[[[[[[[when]]]]]]]] generated */
  onSummary: (summary: string) => void;
  /** Interval between summaries in ms. Default: 30_000 (30s). */
  intervalMs?: number;
  /** Minimum messages before generating a summary. Default: 3. */
  minMessages?: number;
};
```

**Parameters:**

*   `agentId` (string): A unique identifier for the agent being summarized [Source 1].
*   `model` (ChatModel): A small and fast language model used specifically for generating the summaries. This is typically not the agent's primary, more powerful model [Source 1].
*   `getMessages` (() => Array): A function that, when called, returns the current message history of the agent [Source 1].
*   `onSummary` ((summary: string) => void): A callback function that is invoked with the generated summary text each time a summary is created [Source 1].
*   `intervalMs` (number, optional): The time in milliseconds between summarization attempts. Defaults to `30000` (30 seconds) [Source 1].
*   `minMessages` (number, optional): The minimum number of messages that must be present in the history before the first summary is generated. Defaults to `3` [Source 1].

### `SummarizationHandle`

The `startAgentSummarization` function returns an object of type `SummarizationHandle` which provides control over the background process.

```typescript
export type SummarizationHandle = {
  /** Stop the periodic summarization loop. */
  stop: () => void;
  /** Get the most recent summary, or null if none generated yet. */
  lastSummary: () => string | null;
};
```

## Methods & Properties

The returned `SummarizationHandle` object has the following methods:

### `stop()`

Stops the periodic summarization loop. This should be called when the agent has finished its task or is being shut down to prevent unnecessary background processing [Source 1].

**Signature:**
```typescript
stop: () => void;
```

### `lastSummary()`

Returns the most recently generated summary as a string. If no summary has been generated yet, it returns `null` [Source 1].

**Signature:**
```typescript
lastSummary: () => string | null;
```

## Examples

The following example demonstrates how to start the summarization for a worker agent and stop it when the agent's work is complete.

```typescript
// Assume 'smallFastModel' is an initialized ChatModel instance
// and 'worker' is an agent instance with a 'messages' property.

const summaryHandle = startAgentSummarization({
  agentId: 'worker-1',
  model: smallFastModel,
  getMessages: () => worker.messages,
  onSummary: (text) => updateUI(`Worker 1: ${text}`),
  intervalMs: 15000, // Summarize every 15 seconds
});

// ... agent performs its work ...

// Later, when the agent is done:
summaryHandle.stop();
```
[Source 1]

## Sources

[Source 1]: src/agents/agentSummary.ts