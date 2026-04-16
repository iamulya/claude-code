---
title: Agent Runtime
entity_type: subsystem
summary: The subsystem responsible for managing agent execution, lifecycle, and progress monitoring.
primary_files:
  - src/agents/agentSummary.ts
  - src/agents/runner.ts
exports:
  - startAgentSummarization
  - AgentSummarizationConfig
  - SummarizationHandle
stub: false
compiled_at: 2026-04-16T14:12:50.466Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/agentSummary.ts
confidence: 0.9
---

## Purpose
The Agent Runtime subsystem manages the execution lifecycle of agents within the YAAF framework. Its primary responsibilities include coordinating agent runs and providing real-time visibility into agent progress. It specifically addresses the need for monitoring long-running sub-agents by generating periodic, human-readable summaries of their internal state and message history for UI display or logging purposes.

## Architecture
The runtime utilizes a non-overlapping loop architecture for its monitoring components. When an agent (such as a worker spawned by a coordinator) is active, the runtime can initiate background processes that observe the agent's message history and generate metadata without interfering with the primary execution logic.

### Key Components
- **Summarization Loop**: A background process that periodically evaluates an agent's progress. It is designed to be non-overlapping, meaning each summarization cycle must complete before the next is scheduled.
- **Summarization Handle**: A control object returned when monitoring starts, allowing the parent process to stop the loop or retrieve the most recent status update.
- **Model Delegation**: The runtime distinguishes between the primary model used for agent reasoning and the "summary model"—typically a smaller, faster model—used for generating progress updates.

## Key APIs
The Agent Runtime exposes APIs for lifecycle management and progress tracking.

### startAgentSummarization
Initiates a periodic background summarization of an agent's progress. It requires a configuration object and returns a `SummarizationHandle`.

```typescript
const summaryHandle = startAgentSummarization({
  agentId: 'worker-1',
  model: smallFastModel,
  getMessages: () => worker.messages,
  onSummary: (text) => updateUI(`Worker 1: ${text}`),
});
```

### SummarizationHandle
An interface for managing an active summarization process.
- `stop()`: Terminates the periodic summarization loop.
- `lastSummary()`: Returns the most recently generated summary string or `null` if none has been produced yet.

## Configuration
The runtime's monitoring behavior is configured via the `AgentSummarizationConfig` object:

| Property | Type | Description |
| :--- | :--- | :--- |
| `agentId` | `string` | Unique identifier for the agent being monitored. |
| `model` | `ChatModel` | A small/fast model used specifically for summary generation. |
| `getMessages` | `Function` | A callback that returns the agent's current message history. |
| `onSummary` | `Function` | A callback triggered whenever a new summary is generated. |
| `intervalMs` | `number` | The delay between summarization attempts (Default: 30,000ms). |
| `minMessages` | `number` | The minimum number of messages required in history before a summary is generated (Default: 3). |

## Sources
- `src/agents/agentSummary.ts`