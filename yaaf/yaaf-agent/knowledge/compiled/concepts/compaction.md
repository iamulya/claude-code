---
title: Compaction
entity_type: concept
summary: The process of reducing the token footprint of a conversation history to fit within model limits.
stub: false
compiled_at: 2026-04-16T14:16:44.874Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/context/circuitBreaker.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/context/contentReplacement.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/context/contextManager.ts
confidence: 1
---

---
title: "Compaction"
entity_type: "concept"
summary: "The process of reducing the token footprint of a conversation history to fit within model limits."
related_subsystems:
  - "Context Management"

## What It Is
Compaction is the mechanism YAAF uses to manage the finite context window of Large Language Models (LLMs). As a conversation progresses, the accumulation of messages, tool results, and system prompts eventually exceeds the model's maximum token capacity. Compaction prevents "out of memory" errors or message truncation by condensing the existing history into a smaller token footprint while attempting to preserve the essential state and facts of the session.

This process is critical for production-grade agents that perform long-running tasks, as it allows the agent to maintain continuity without losing track of previous file edits or high-level goals.

## How It Works in YAAF
The compaction lifecycle is managed primarily by the `ContextManager`. It monitors the total token usage against a calculated threshold:
`Threshold = contextWindowTokens - maxOutputTokens - autoCompactBuffer (default 13,000)`

### The Compaction Process
When the `ContextManager` determines that compaction is required, it typically follows these steps:
1.  **Summarization**: The system sends the current message history to an LLM with a prompt to summarize the conversation.
2.  **Replacement**: The original message history is replaced with a single summary message and a "compact boundary" marker.
3.  **State Preservation**: Knowledge of file modifications is preserved using the `ContentReplacementTracker`. This ensures that even if the messages describing a file edit are compacted, the system remembers which files were changed (e.g., `create`, `modify`, `delete`, or `rename`).
4.  **Re-injection**: Recently-read file contents or critical context sections are re-injected as attachments to ensure the LLM retains immediate access to active working files.
5.  **Fact Extraction**: An optional `onExtractFacts` hook can be triggered to pull specific data points into long-term memory before the source messages are removed.

### Micro-Compaction
YAAF supports "micro-compaction" as a lightweight alternative or precursor to full compaction. This strategy targets `tool_result` messages, which often contain large amounts of data (like file contents or terminal output). Micro-compaction clears the content of older tool results while keeping the metadata intact, preserving the history of the tool call without the token cost. By default, YAAF keeps the 5 most recent tool results.

### Safety and Reliability
To prevent infinite loops or wasted API calls in cases where a context is irrecoverably oversized, YAAF employs a `CompactionCircuitBreaker`. 
- **Failure Threshold**: If auto-compaction fails 3 consecutive times, the circuit opens and stops further attempts.
- **Auto-Reset**: The circuit breaker defaults to a 5-minute reset period (`300,000` ms).

## Configuration
Compaction is configured via the `ContextManagerConfig`. Developers can choose from several built-in strategies or define a `CompositeStrategy` to chain multiple approaches.

```typescript
import { 
  ContextManager, 
  CompositeStrategy, 
  MicroCompactStrategy, 
  SummarizeStrategy 
} from 'yaaf';

const ctx = new ContextManager({
  contextWindowTokens: 200_000,
  maxOutputTokens: 16_384,
  autoCompactBuffer: 13_000,
  // Use a multi-tier pipeline
  strategy: new CompositeStrategy([
    // First, clear old tool results to save space
    new MicroCompactStrategy({ keepRecent: 5 }),
    // If still over budget, perform full LLM summarization
    new SummarizeStrategy(),
  ], { continueAfterPartial: true }),
  
  // Optional: Extract facts for long-term memory during compaction
  onExtractFacts: async (messages) => {
    // Logic to identify key facts
    return ["User prefers TypeScript over JavaScript", "Project uses Vitest"];
  }
});
```

### Available Strategies
- **SummarizeStrategy**: Uses an LLM to generate a structured summary of the history.
- **TruncateStrategy**: Drops the oldest N% of messages.
- **SlidingWindowStrategy**: Maintains only the most recent messages within the token budget.
- **MicroCompactStrategy**: Clears content from old tool results.
- **TimeBasedMicroCompactStrategy**: Clears tool results after a specific time duration.
- **SessionMemoryStrategy**: Extracts memory while keeping only the most recent messages.

## See Also
- [[ContextManager]]
- [[CompactionCircuitBreaker]]
- [[ContentReplacementTracker]]