---
title: Agent Summarization
entity_type: concept
summary: A pattern for generating periodic, short progress updates from an agent's message history for UI display.
stub: false
compiled_at: 2026-04-16T14:12:48.724Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/agentSummary.ts
confidence: 0.95
---

---
title: "Agent Summarization"
entity_type: "concept"
summary: "A pattern for generating periodic, short progress updates from an agent's message history for UI display."
related_subsystems:
  - "Agents"

## What It Is
Agent Summarization is a background process in YAAF used to provide visibility into the progress of sub-agents or workers. When a coordinator agent spawns worker agents for long-running tasks, the framework uses this pattern to generate brief, human-readable updates (typically 3-5 words) based on the agent's current message history. 

This concept solves the problem of "black box" execution by providing real-time status updates—such as "Reading config.json" or "Fixing null check"—to a user interface without requiring the UI to process or display the entire raw message log.

## How It Works in YAAF
The summarization process is implemented as a non-overlapping periodic loop. It is initiated via the `startAgentSummarization` function, which monitors an agent's message history and invokes a specialized LLM to produce the summary.

Key characteristics of the implementation include:
*   **Model Selection**: Summarization typically utilizes a "small and fast" model rather than the agent's primary reasoning model to minimize latency and token costs.
*   **Non-Overlapping Execution**: The framework ensures that each summarization request completes before the next one is scheduled, preventing a backlog of requests if the model response time exceeds the interval.
*   **State Management**: The process returns a `SummarizationHandle` which allows the parent process to stop the loop or retrieve the `lastSummary` generated.
*   **Thresholds**: To avoid redundant processing, the framework can be configured with a minimum message count (`minMessages`) that must be reached before the first summary is attempted.

## Configuration
Developers configure summarization by passing an `AgentSummarizationConfig` object to the `startAgentSummarization` function.

```ts
export type AgentSummarizationConfig = {
  /** Unique agent identifier */
  agentId: string
  /** A small/fast model for generating summaries (not the main model) */
  model: ChatModel
  /** Function that returns the agent's current message history */
  getMessages: () => Array<{ role: string; content: string }>
  /** Called with the summary text when generated */
  onSummary: (summary: string) => void
  /** Interval between summaries in ms. Default: 30_000 (30s). */
  intervalMs?: number
  /** Minimum messages before generating a summary. Default: 3. */
  minMessages?: number
}
```

### Example Implementation
The following example demonstrates how to attach summarization to a worker agent:

```ts
const summaryHandle = startAgentSummarization({
  agentId: 'worker-1',
  model: smallFastModel,
  getMessages: () => worker.messages,
  onSummary: (text) => updateUI(`Worker 1: ${text}`),
});

// Later, when the agent task is complete:
summaryHandle.stop();
```

## Sources
* `src/agents/agentSummary.ts`