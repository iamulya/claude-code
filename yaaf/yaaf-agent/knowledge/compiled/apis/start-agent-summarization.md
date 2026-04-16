---
title: startAgentSummarization
entity_type: api
summary: Starts a periodic background loop to summarize an agent's progress based on its message history.
export_name: startAgentSummarization
source_file: src/agents/agentSummary.ts
category: function
stub: false
compiled_at: 2026-04-16T14:12:54.359Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/agentSummary.ts
confidence: 1
---

## Overview
`startAgentSummarization` is a utility function designed to provide real-time visibility into an agent's activities. It initiates a non-overlapping background loop that periodically analyzes an agent's message history to generate a concise (typically 3-5 words) progress summary. 

This function is primarily used in multi-agent systems where a coordinator spawns worker agents. By using a small, fast model for summarization, the framework can update user interfaces with status strings like "Reading config.json" or "Fixing null check" without interrupting the worker's primary execution flow.

## Signature / Constructor

```typescript
export function startAgentSummarization(
  config: AgentSummarizationConfig,
): SummarizationHandle;
```

### AgentSummarizationConfig
The configuration object defines how the summarization loop behaves:

| Property | Type | Description |
| :--- | :--- | :--- |
| `agentId` | `string` | Unique identifier for the agent being summarized. |
| `model` | `ChatModel` | A model instance used to generate the summary. Usually a smaller, faster model than the agent's primary model. |
| `getMessages` | `() => Array<{ role: string; content: string }>` | A provider function that returns the agent's current message history. |
| `onSummary` | `(summary: string) => void` | Callback triggered whenever a new summary is successfully generated. |
| `intervalMs` | `number` | (Optional) Time between summarization attempts in milliseconds. Defaults to `30_000` (30 seconds). |
| `minMessages` | `number` | (Optional) Minimum number of messages required in history before summarization begins. Defaults to `3`. |

## Methods & Properties
The function returns a `SummarizationHandle` object used to manage the background process.

### SummarizationHandle
*   **`stop()`**: Stops the periodic summarization loop.
*   **`lastSummary()`**: Returns the most recently generated summary string, or `null` if no summary has been produced yet.

## Examples

### Basic Usage
This example demonstrates how to attach a summarization loop to a worker agent and update a UI component.

```typescript
import { startAgentSummarization } from 'yaaf';

const summaryHandle = startAgentSummarization({
  agentId: 'worker-1',
  model: smallFastModel,
  getMessages: () => worker.messages,
  onSummary: (text) => {
    console.log(`Current Status: ${text}`);
    updateUI(`Worker 1: ${text}`);
  },
  intervalMs: 15000, // Summarize every 15 seconds
});

// Later, when the agent task is complete or the component unmounts:
summaryHandle.stop();
```

## See Also
* `ChatModel` (The model interface used for summarization)