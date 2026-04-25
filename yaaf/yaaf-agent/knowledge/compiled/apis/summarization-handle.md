---
title: SummarizationHandle
summary: A handle to control and query an active agent summarization process, allowing it to be stopped or its last summary retrieved.
export_name: SummarizationHandle
source_file: src/agents/agentSummary.ts
category: type
entity_type: api
search_terms:
 - stop agent summary
 - control background summarization
 - get last agent summary
 - agent progress updates
 - manage summarization loop
 - handle for startAgentSummarization
 - cancel periodic summary
 - retrieve latest summary text
 - agent monitoring handle
 - worker progress reporting
 - how to stop summarization
 - get latest progress text
stub: false
compiled_at: 2026-04-24T17:42:11.681Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/agentSummary.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `SummarizationHandle` type defines the object returned by the `startAgentSummarization` function. It provides an interface to control and inspect a running background summarization process for an agent [Source 1].

This handle is used to manually stop the periodic generation of summaries, for instance, [when](./when.md) the agent's task is complete. It also allows retrieving the most recently generated summary text on demand [Source 1].

## Signature

The `SummarizationHandle` is a TypeScript type alias for an object with two methods [Source 1].

```typescript
export type SummarizationHandle = {
  /** Stop the periodic summarization loop. */
  stop: () => void;
  /** Get the most recent summary, or null if none generated yet. */
  lastSummary: () => string | null;
};
```

## Methods & Properties

### stop()

This method stops the periodic summarization loop. Once called, no new summaries will be generated for the associated agent [Source 1].

- **Signature:** `stop(): void`
- **Returns:** `void`

### lastSummary()

This method retrieves the most recent summary string that was generated. If no summary has been generated yet, it returns `null` [Source 1].

- **Signature:** `lastSummary(): string | null`
- **Returns:** `string | null` — The last summary text or `null`.

## Examples

The following example demonstrates how to use the `SummarizationHandle` to stop the process and retrieve the last known status.

```typescript
import { startAgentSummarization, SummarizationHandle } from 'yaaf';
// Assume smallFastModel, worker, and updateUI are defined elsewhere

const summaryHandle: SummarizationHandle = startAgentSummarization({
  agentId: 'worker-1',
  model: smallFastModel,
  getMessages: () => worker.messages,
  onSummary: (text) => updateUI(`Worker 1: ${text}`),
});

// Sometime later, you might want to check the last summary
const currentStatus = summaryHandle.lastSummary();
if (currentStatus) {
  console.log(`Last known status for worker-1: ${currentStatus}`);
}

// When the worker's task is finished, stop the summarization loop
// to prevent further processing and model calls.
worker.on('complete', () => {
  console.log('Worker finished, stopping summarization.');
  summaryHandle.stop();
});
```

## See Also

- `startAgentSummarization`: The function that initiates the summarization process and returns a `SummarizationHandle`.
- `AgentSummarizationConfig`: The configuration object required by `startAgentSummarization`.

## Sources

[Source 1]: src/agents/agentSummary.ts