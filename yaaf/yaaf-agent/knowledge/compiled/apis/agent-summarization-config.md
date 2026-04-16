---
title: AgentSummarizationConfig
entity_type: api
summary: Configuration options for the agent summarization process.
export_name: AgentSummarizationConfig
source_file: src/agents/agentSummary.ts
category: type
stub: false
compiled_at: 2026-04-16T14:12:58.121Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/agentSummary.ts
confidence: 1
---

## Overview
`AgentSummarizationConfig` defines the parameters for the background summarization process of an agent's activity. This configuration is used to facilitate periodic, non-blocking progress updates (typically 3–5 words) for sub-agents or workers. These summaries are intended for UI display to provide visibility into an agent's current task without requiring the user to inspect the full message history.

## Signature
```typescript
export type AgentSummarizationConfig = {
  agentId: string
  model: ChatModel
  getMessages: () => Array<{ role: string; content: string }>
  onSummary: (summary: string) => void
  intervalMs?: number
  minMessages?: number
}
```

## Properties
| Property | Type | Description |
| :--- | :--- | :--- |
| `agentId` | `string` | A unique identifier for the agent being summarized. |
| `model` | `ChatModel` | The LLM provider used to generate the summary. It is recommended to use a small, fast model for this purpose. |
| `getMessages` | `() => Array<{ role: string; content: string }>` | A function that returns the agent's current message history. |
| `onSummary` | `(summary: string) => void` | A callback function triggered whenever a new summary is generated. |
| `intervalMs` | `number` | (Optional) The interval between summarization attempts in milliseconds. Defaults to `30000` (30 seconds). |
| `minMessages` | `number` | (Optional) The minimum number of messages that must be present in the history before a summary is generated. Defaults to `3`. |

## Examples
The following example demonstrates how to configure summarization for a worker agent.

```typescript
import { startAgentSummarization } from './agentSummary';

const config: AgentSummarizationConfig = {
  agentId: 'worker-1',
  model: smallFastModel,
  getMessages: () => worker.messages,
  onSummary: (text) => {
    console.log(`Worker 1 is currently: ${text}`);
  },
  intervalMs: 15000, // Summarize every 15 seconds
  minMessages: 5     // Wait until 5 messages are present
};

const summaryHandle = startAgentSummarization(config);

// Stop summarization when the agent completes its task
// summaryHandle.stop();
```

## See Also
- `startAgentSummarization`
- `SummarizationHandle`
- `ChatModel`