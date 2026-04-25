---
summary: Configuration options for the MicroCompactStrategy, including how many recent tool results to keep and which tools are eligible.
export_name: MicroCompactStrategyConfig
source_file: src/context/strategies.ts
category: type
title: MicroCompactStrategyConfig
entity_type: api
search_terms:
 - configure micro-compaction
 - clear old tool results
 - context compaction settings
 - keep recent tool outputs
 - MicroCompactStrategy options
 - reduce context size without LLM
 - token saving strategy
 - placeholder for tool output
 - compactableTools configuration
 - clearedMessage text
 - how to configure MicroCompactStrategy
 - tool result pruning
stub: false
compiled_at: 2026-04-24T17:22:26.779Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/context/strategies.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

`MicroCompactStrategyConfig` is a type alias that defines the configuration options for the `MicroCompactStrategy`. This strategy provides a lightweight method for reducing context size by clearing the content of old tool result messages without performing a full, [LLM](../concepts/llm.md)-based summarization [Source 1].

This approach, modeled after the main YAAF repository's `microCompact` service, preserves the overall message structure, so the agent is aware that a tool was called. However, it replaces the potentially verbose output of the tool with a simple placeholder message, freeing up a significant number of tokens [Source 1].

This configuration type allows users to control which [tool results](../concepts/tool-results.md) are compacted and how many recent results are preserved intact [Source 1].

## Signature

`MicroCompactStrategyConfig` is a TypeScript type alias with the following properties:

```typescript
export type MicroCompactStrategyConfig = {
  /**
   * Number of most-recent tool results to keep intact.
   * @default 5
   */
  keepRecent?: number;

  /**
   * Set of tool names eligible for micro-compaction.
   * If not provided, all tool_result messages are eligible.
   */
  compactable[[[[[[[[Tools]]]]]]]]?: Set<string>;

  /**
   * Sentinel text used to replace cleared content.
   */
  clearedMessage?: string;
};
```
[Source 1]

### Properties

| Property           | Type             | Description                                                                                                                            |
| ------------------ | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `keepRecent`       | `number`         | The number of the most recent tool result messages to preserve without modification. Defaults to `5` [Source 1].                         |
| `compactableTools` | `Set<string>`    | An optional set of tool names. If provided, only results from Tools with these names will be eligible for compaction [Source 1].          |
| `clearedMessage`   | `string`         | An optional string to use as a placeholder for the content of a compacted tool result message [Source 1].                                |

## Examples

### Basic Configuration

This example demonstrates creating a `MicroCompactStrategy` that keeps the 3 most recent tool results and clears older ones.

```typescript
import { MicroCompactStrategy, CompositeStrategy } from 'yaaf';

const strategy = new CompositeStrategy([
  new MicroCompactStrategy({
    keepRecent: 3,
  }),
  // ... other strategies
]);
```

### Advanced Configuration

This example shows how to specify which tools are eligible for compaction and provides a custom message to replace the cleared content.

```typescript
import { MicroCompactStrategy, CompositeStrategy } from 'yaaf';

const strategy = new CompositeStrategy([
  new MicroCompactStrategy({
    keepRecent: 5,
    compactableTools: new Set(['file_system_read', 'database_query']),
    clearedMessage: '[Tool output was cleared to save space]',
  }),
  // ... other strategies
]);
```

## See Also

- `MicroCompactStrategy`: The compaction strategy class that uses this configuration.
- `CompositeStrategy`: A strategy for chaining multiple compaction strategies together, often including `MicroCompactStrategy` as an early step.

## Sources

[Source 1]: src/context/strategies.ts