---
summary: The mechanism for tracking and managing token usage against a model's context window to prevent overflow.
title: Token Budgeting
entity_type: concept
related_subsystems:
  - Context Management
  - Cost Tracking
stub: false
compiled_at: 2026-04-16T14:17:05.993Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/context/contextManager.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/utils/costTracker.ts
confidence: 0.95
---

## What It Is
Token Budgeting is the process of monitoring and controlling the consumption of an LLM's finite context window. In YAAF, this mechanism ensures that the combination of system instructions, user-provided context, tool definitions, and conversation history does not exceed the model's maximum token limit. 

Effective budgeting prevents "context overflow" errors and ensures there is always sufficient "headroom" (reserved output tokens) for the model to generate a complete response. It also facilitates cost management by providing granular accounting of input, output, and cache-related token usage.

## How It Works in YAAF
Token budgeting is primarily handled by the `ContextManager` in conjunction with the `CostTracker`. The framework divides the context window into several logical segments:

1.  **System Context**: Environment information, date, and Git status.
2.  **User Context**: Persistent memory files (e.g., `CLAUDE.md`) and project-specific instructions.
3.  **Tool Schemas**: The definitions of available tools, which typically consume a fixed overhead of approximately 20,000 to 40,000 tokens.
4.  **Conversation Messages**: The running history of user and assistant interactions.

### The Compaction Threshold
The `ContextManager` monitors the total token count of these segments. When the total usage approaches the model's limit, the framework triggers **Auto-compaction**. The threshold for this trigger is calculated using the following formula:

$$Threshold = ContextWindow - MaxOutputTokens - Buffer$$

By default, YAAF uses a 13,000-token buffer to ensure the model does not hit hard limits during a turn.

### Compaction Strategies
When the budget is exceeded, YAAF employs various strategies to reclaim space:
*   **Summarization**: Sending message history to an LLM to generate a concise summary, replacing old messages with the summary.
*   **Micro-compaction**: Clearing the content of older `tool_result` messages while keeping the most recent ones (default: 5).
*   **Truncation**: Dropping the oldest percentage of messages.
*   **Sliding Window**: Maintaining only the most recent messages that fit within the budget.

### Cost Accounting
While `ContextManager` handles the window lifecycle, the `CostTracker` provides the accounting layer. It records:
*   **Input/Output Tokens**: Standard usage per model.
*   **Cache Tokens**: Tracking `cacheReadTokens` and `cacheWriteTokens` for providers that support context caching.
*   **USD Estimation**: Mapping token counts to configurable price tables to provide real-time session cost summaries.

## Configuration
Developers configure token budgeting through the `ContextManagerConfig` object. This allows for fine-tuning the window size, reserved output, and the specific buffer used for compaction triggers.

```typescript
import { ContextManager } from 'yaaf/context';

const ctx = new ContextManager({
  // Total capacity of the target model
  contextWindowTokens: 200_000,
  
  // Tokens reserved for the model's response
  maxOutputTokens: 16_384,
  
  // Safety margin before compaction triggers (default: 13,000)
  autoCompactBuffer: 15_000,
  
  // Number of recent tool results to preserve during micro-compaction
  microCompactKeepRecent: 5,
  
  // Optional: Custom token estimation logic
  estimateTokensFn: (text) => text.length / 4, 
});
```

Usage can be tracked and persisted using the `CostTracker`:

```typescript
import { CostTracker } from 'yaaf/utils';

const tracker = new CostTracker();
tracker.record('gpt-4o', { 
  inputTokens: 1000, 
  outputTokens: 500,
  cacheReadTokens: 200 
});

console.log(tracker.formatSummary());
```

## See Also
* [[Context Management]]
* [[Cost Tracking]]
* [[Compaction Strategies]]