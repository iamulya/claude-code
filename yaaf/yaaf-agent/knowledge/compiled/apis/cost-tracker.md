---
title: CostTracker
entity_type: api
summary: A utility for tracking per-model token usage and USD costs with support for session persistence and plugin-based pricing.
export_name: CostTracker
source_file: src/utils/costTracker.ts
category: class
stub: false
compiled_at: 2026-04-16T14:39:09.201Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/utils/costTracker.ts
confidence: 1
---

## Overview
`CostTracker` is a utility class designed for per-model token accounting and USD cost estimation within the YAAF framework. It tracks input, output, and cache tokens across multiple models, maintaining a running total of costs based on a configurable pricing table. 

The class supports session-resumable state, allowing usage data to be saved and restored across session boundaries. It also integrates with the framework's plugin system; if a `PluginHost` is provided during instantiation, the tracker automatically merges pricing declarations from registered `LLMAdapter` plugins to ensure accurate cost calculation without requiring hardcoded model updates in the core library.

## Signature / Constructor

### Constructor
```typescript
constructor(pluginHost?: PluginHost)
```

### Supporting Types
The following types define the data structures used by `CostTracker`:

```typescript
export type UsageRecord = {
  inputTokens: number
  outputTokens: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
}

export type ModelUsage = {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  costUSD: number
  calls: number
}

export type CostSnapshot = {
  models: Record<string, ModelUsage>
  totalCostUSD: number
  totalInputTokens: number
  totalOutputTokens: number
  totalDurationMs: number
  sessionId?: string
  savedAt: string
}
```

## Methods & Properties

### Properties
*   **totalCostUSD**: The cumulative USD cost across all tracked models.
*   **totalInputTokens**: The sum of all input tokens processed.
*   **totalOutputTokens**: The sum of all output tokens generated.
*   **totalDurationMs**: The total duration of tracked operations in milliseconds.

### Methods
*   **record(model: string, usage: UsageRecord)**: Records a single interaction's token usage for a specific model and updates the internal cost and token counters.
*   **save()**: Returns a `CostSnapshot` representing the current state of the tracker for persistence.
*   **formatSummary()**: Returns a human-readable string summarizing the usage breakdown and total costs, suitable for logs or user interfaces.
*   **static restore(snapshot: CostSnapshot)**: A static factory method that creates a new `CostTracker` instance initialized with the data from a previous `CostSnapshot`.

## Examples

### Basic Usage
```typescript
const tracker = new CostTracker();

// Record usage for different models
tracker.record('gpt-4o', { 
  inputTokens: 1000, 
  outputTokens: 500 
});

tracker.record('gpt-4o-mini', { 
  inputTokens: 2000, 
  outputTokens: 100 
});

console.log(tracker.totalCostUSD);   // e.g., 0.0255
console.log(tracker.formatSummary()); // Prints formatted breakdown
```

### Session Persistence
```typescript
// Save current state
const snapshot = tracker.save();

// Restore in a new session
const restoredTracker = CostTracker.restore(snapshot);
console.log(restoredTracker.totalCostUSD); // Matches the saved state
```

## See Also
*   `PluginHost`
*   `LLMAdapter`