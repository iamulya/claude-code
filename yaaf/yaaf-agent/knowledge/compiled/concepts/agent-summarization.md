---
title: Agent Summarization
summary: The core concept of generating periodic, concise progress summaries for sub-agents to provide real-time status updates.
primary_files:
 - src/agents/agentSummary.ts
entity_type: concept
search_terms:
 - sub-agent progress updates
 - real-time agent status
 - how to monitor worker agents
 - periodic task summary
 - background agent monitoring
 - YAAF worker status
 - agent progress reporting
 - summarize agent history
 - displaying agent activity
 - coordinator-worker pattern
 - UI updates for agents
 - get agent progress
stub: false
compiled_at: 2026-04-24T17:51:57.099Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/agentSummary.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

Agent Summarization is a YAAF pattern for generating periodic, concise progress summaries for sub-agents, often referred to as workers [Source 1]. In architectures where a primary agent (a "coordinator") spawns multiple worker agents to perform tasks, it can be difficult to track the real-time status of each worker. Agent Summarization solves this by using a lightweight, background process to periodically inspect a worker's message history and generate a short, human-readable summary of its current activity [Source 1].

These summaries are typically 3-5 words long, such as "Reading config.json" or "Fixing null check," making them ideal for display in a user interface to provide users with at-a-glance progress updates without interrupting the agent's primary task [Source 1].

## How It Works in YAAF

The mechanism is initiated by calling the `startAgentSummarization` function, which sets up a recurring background task for a specific agent [Source 1]. This function returns a `SummarizationHandle` object containing `stop()` and `lastSummary()` methods to control the process and retrieve the latest summary.

The summarization loop is non-overlapping, meaning a new summary generation will not begin until the previous one has completed. This prevents multiple summarization requests from queuing up if the model response is slow [Source 1].

The process is configured via an `AgentSummarizationConfig` object, which specifies [Source 1]:
*   **`agentId`**: A unique identifier for the agent being monitored.
*   **`model`**: A small and fast language model, distinct from the agent's main operational model, to ensure summarization is a low-cost operation.
*   **`getMessages`**: A callback function that provides the summarization process with access to the target agent's current message history.
*   **`onSummary`**: A callback function that is invoked with the generated summary text, allowing developers to push the update to a UI or [Logging System](../subsystems/logging-system.md).
*   **`intervalMs`**: The time in milliseconds between summarization attempts. The default is 30,000 ms (30 seconds).
*   **`minMessages`**: The minimum number of messages that must exist in the agent's history before the first summary is generated. The default is 3.

## Configuration

A developer enables Agent Summarization by importing `startAgentSummarization` and calling it with a configuration object. The returned handle should be stored so the summarization loop can be stopped [when](../apis/when.md) the agent's task is complete [Source 1].

```typescript
import { startAgentSummarization } from 'yaaf';
import { smallFastModel } from './models';
import { workerAgent } from './worker';

// Start summarization for a worker agent
const summaryHandle = startAgentSummarization({
  agentId: 'worker-1',
  model: smallFastModel,
  getMessages: () => workerAgent.messages,
  onSummary: (text) => {
    // Example: Update a UI component with the latest status
    console.log(`Worker 1 Status: ${text}`);
  },
  intervalMs: 15000, // Check every 15 seconds
});

// ... worker agent runs and does its work ...

// When the agent's task is finished, stop the summarization loop
// to clean up resources.
summaryHandle.stop();
```

## Sources
[Source 1] src/agents/agentSummary.ts