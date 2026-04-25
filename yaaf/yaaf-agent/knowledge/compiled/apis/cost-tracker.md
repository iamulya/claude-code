---
title: CostTracker
summary: A utility class for per-model token accounting and USD cost estimation, supporting session persistence and plugin integration for dynamic pricing.
export_name: CostTracker
source_file: src/utils/costTracker.ts
category: class
entity_type: api
search_terms:
 - track LLM costs
 - estimate API expenses
 - token usage monitoring
 - cost accounting for agents
 - session cost persistence
 - LLM pricing table
 - how to measure agent cost
 - YAAF cost management
 - plugin-based pricing
 - save and restore usage
 - format usage summary
 - calculate total cost
 - UsageRecord type
 - CostSnapshot type
stub: false
compiled_at: 2026-04-24T16:58:53.928Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/costTracker.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `CostTracker` class is a utility for per-model token accounting and USD cost estimation [Source 1]. It tracks usage metrics such as input, output, and cache tokens for each language model used within an agent or session. The class calculates the associated monetary cost based on a configurable price table [Source 1].

Key features include:
- **Per-Model Accounting**: Tracks token counts and costs separately for each model identifier (e.g., 'gpt-4o', 'gpt-4o-mini') [Source 1].
- **[Session Persistence](../concepts/session-persistence.md)**: The state of the tracker can be serialized into a snapshot and later restored, allowing cost and usage data to persist across application restarts or session boundaries [Source 1].
- **Plugin Integration**: [when](./when.md) a `PluginHost` instance is provided to its constructor, `CostTracker` automatically merges pricing information declared by any registered `[[LLM]]Adapter` plugins. This keeps the internal price table up-to-date without requiring manual configuration for new models [Source 1].
- **Formatted Summaries**: Provides methods to generate human-readable summaries of token usage and total costs, suitable for logging or display in user interfaces [Source 1].

## Signature / Constructor

The `CostTracker` is instantiated as a class. While the full constructor signature is not detailed in the source, it can be initialized with an optional `PluginHost` to enable dynamic pricing updates from plugins [Source 1].

```typescript
import type { PluginHost } from "../plugin/types.js";

export class CostTracker {
  // Constructor can optionally accept a PluginHost instance
  constructor(pluginHost?: PluginHost);
  // ...
}
```

### Related Types

The `CostTracker` class uses the following data structures for recording usage and creating snapshots [Source 1].

#### `UsageRecord`
Represents a single [LLM Call](../concepts/llm-call.md)'s token usage.

```typescript
export type UsageRecord = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
};
```

#### `ModelUsage`
Aggregated usage and cost data for a single model.

```typescript
export type ModelUsage = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  costUSD: number;
  calls: number;
};
```

#### `CostSnapshot`
A serializable representation of the `CostTracker`'s entire state.

```typescript
export type CostSnapshot = {
  models: Record<string, ModelUsage>;
  totalCostUSD: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalDurationMs: number;
  sessionId?: string;
  savedAt: string;
};
```

## Methods & Properties

Based on the source documentation, the class exposes the following public API [Source 1].

### Properties

- **`totalCostUSD: number`**
  Returns the total estimated cost in USD accumulated across all models.

### Methods

- **`record(modelName: string, usage: UsageRecord): void`**
  Records a new usage event for a specified model. It updates the token counts, call count, and total cost for that model.

- **`formatSummary(): string`**
  Returns a formatted string that provides a detailed breakdown of usage and cost for each model, as well as overall totals.

- **`save(): CostSnapshot`**
  Creates and returns a `CostSnapshot` object, which is a serializable representation of the tracker's current state.

- **`static restore(snapshot: CostSnapshot): CostTracker`**
  A static factory method that creates a new `CostTracker` instance from a previously saved `CostSnapshot`.

## Examples

### Basic Usage and Reporting

The following example demonstrates creating a tracker, recording usage for two different models, and then printing the total cost and a formatted summary [Source 1].

```typescript
const tracker = new CostTracker();
tracker.record('gpt-4o', { inputTokens: 1000, outputTokens: 500 });
tracker.record('gpt-4o-mini', { inputTokens: 2000, outputTokens: 100 });

console.log(tracker.totalCostUSD); // e.g., 0.0255
console.log(tracker.formatSummary()); // Prints a formatted breakdown
```

### Session Persistence

This example shows how to save the tracker's state to a snapshot and restore it later, creating a new instance with the same data [Source 1].

```typescript
const tracker = new CostTracker();
tracker.record('gpt-4o', { inputTokens: 1000, outputTokens: 500 });

// Save the current state
const snapshot = tracker.save();

// ... later, in a new session ...

// Restore the tracker from the snapshot
const restoredTracker = CostTracker.restore(snapshot);
console.log(restoredTracker.totalCostUSD); // Will be the same as the original tracker's cost
```

## Sources

[Source 1]: src/utils/costTracker.ts