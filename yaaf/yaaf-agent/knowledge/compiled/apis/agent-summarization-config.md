---
title: AgentSummarizationConfig
summary: Defines the configuration options for the periodic agent progress summarization process.
export_name: AgentSummarizationConfig
source_file: src/agents/agentSummary.ts
category: type
entity_type: api
search_terms:
 - agent progress summary
 - background summarization
 - worker status update
 - how to show agent progress
 - periodic task summary
 - configure agent summarizer
 - summary interval
 - getMessages for summary
 - onSummary callback
 - sub-agent monitoring
 - coordinator worker UI
 - startAgentSummarization config
stub: false
compiled_at: 2026-04-24T16:47:32.891Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/agentSummary.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `AgentSummarizationConfig` type defines the set of parameters required to configure the periodic background summarization of an agent's progress [Source 1]. This configuration object is passed to the `startAgentSummarization` function to initiate the process.

This feature is typically used [when](./when.md) a primary agent (a "coordinator") spawns sub-agents or "workers." Each worker can be configured to periodically generate a short, 3-5 word summary of its current activity (e.g., "Reading config.json," "Fixing null check"). These summaries are useful for displaying real-time progress in a user interface without exposing the full verbosity of the agent's internal message history [Source 1].

## Signature

`AgentSummarizationConfig` is a TypeScript type alias with the following structure:

```typescript
export type AgentSummarizationConfig = {
  /** Unique agent identifier */
  agentId: string;

  /** A small/[[[[[[[[Fast Model]]]]]]]] for generating summaries (not the main model) */
  model: ChatModel;

  /** Function that returns the agent's current message history */
  getMessages: () => Array<{ role: string; content: string }>;

  /** Called with the summary text when generated */
  onSummary: (summary: string) => void;

  /** Interval between summaries in ms. Default: 30_000 (30s). */
  intervalMs?: number;

  /** Minimum messages before generating a summary. Default: 3. */
  minMessages?: number;
};
```

### Properties

| Property      | Type                                                 | Description                                                                                                                            |
|---------------|------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------|
| `agentId`     | `string`                                             | A unique identifier for the agent being summarized [Source 1].                                                                         |
| `model`       | `ChatModel`                                          | The language model used to generate the summaries. It is recommended to use a small, Fast Model for this task to minimize overhead [Source 1]. |
| `getMessages` | `() => Array<{ role: string; content: string }>`     | A function that, when called, returns the current message history of the agent. This history is used as context for the summary [Source 1]. |
| `onSummary`   | `(summary: string) => void`                          | A callback function that is invoked with the generated summary text each time a new summary is created [Source 1].                       |
| `intervalMs`  | `number` (optional)                                  | The time in milliseconds between summarization attempts. Defaults to `30000` (30 seconds) if not specified [Source 1].                    |
| `minMessages` | `number` (optional)                                  | The minimum number of messages that must be present in the agent's history before the first summary is generated. Defaults to `3` [Source 1]. |

## Examples

The following example demonstrates how to create an `AgentSummarizationConfig` object and use it with the `startAgentSummarization` function to monitor a worker agent.

```typescript
import { startAgentSummarization, AgentSummarizationConfig } from 'yaaf';
import { smallFastModel } from './models'; // Assume this is a configured ChatModel
import { worker } from './myWorkerAgent'; // Assume this is a running agent instance

// Define the configuration for the summarization process.
const summaryConfig: AgentSummarizationConfig = {
  agentId: 'worker-1',
  model: smallFastModel,
  getMessages: () => worker.messages, // Function to get the worker's message history
  onSummary: (text) => {
    // Update a UI element with the latest progress
    console.log(`Progress for Worker 1: ${text}`);
  },
  intervalMs: 15000, // Generate a summary every 15 seconds
  minMessages: 5,
};

// Start the background summarization.
const summaryHandle = startAgentSummarization(summaryConfig);

// When the worker's task is complete, stop the summarization loop.
// worker.on('done', () => {
//   summaryHandle.stop();
// });
```

## See Also

*   `startAgentSummarization`: The function that consumes this configuration object to start the summarization process.
*   `SummarizationHandle`: The object returned by `startAgentSummarization`, which provides methods to control the summarization loop.

## Sources

[Source 1]: src/agents/agentSummary.ts