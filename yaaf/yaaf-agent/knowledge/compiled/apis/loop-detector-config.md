---
summary: Defines the configuration options for the ToolLoopDetector class.
export_name: LoopDetectorConfig
source_file: src/tools/loopDetector.ts
category: type
relationships:
 - [object Object]
title: LoopDetectorConfig
entity_type: api
search_terms:
 - tool loop detection settings
 - prevent infinite tool calls
 - configure loop detector
 - repetitive tool call configuration
 - threshold for tool loops
 - window size for pattern detection
 - alternating tool call detection
 - ToolLoopDetector options
 - agent stuck in a loop
 - how to stop agent loops
 - YAAF tool safety
 - loop detection parameters
stub: false
compiled_at: 2026-04-24T17:19:55.629Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/loopDetector.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

`LoopDetectorConfig` is a TypeScript type that defines the configuration object for the `ToolLoopDetector` class. It allows developers to customize the behavior of the [Tool Loop Detection](../concepts/tool-loop-detection.md) mechanism, which is designed to prevent agents from getting stuck in repetitive, non-productive cycles of [Tool Calls](../concepts/tool-calls.md) [Source 1].

By adjusting these settings, one can control the sensitivity of the detector, the size of the history it considers, and the types of patterns it looks for. This is a key part of building robust agents that can gracefully handle situations where they might otherwise enter an infinite loop, saving computational resources and preventing failures [Source 1].

## Signature

The `LoopDetectorConfig` is a type alias for an object with the following optional properties:

```typescript
export type LoopDetectorConfig = {
  /**
   * Number of consecutive identical calls before flagging a loop.
   * Default: 3
   */
  threshold?: number;
  /**
   * Rolling window size for pattern detection.
   * Default: 20
   */
  windowSize?: number;
  /**
   * Also detect alternating patterns (A→B→A→B)?
   * Default: true
   */
  detectAlternating?: boolean;
};
```

### Properties

- **`threshold`** `number` (optional)
  - The number of identical, consecutive tool calls required to trigger a loop detection.
  - **Default**: `3` [Source 1].

- **`windowSize`** `number` (optional)
  - The number of recent tool calls to keep in [Memory](../concepts/memory.md) for pattern detection. This defines the rolling window of history the detector analyzes.
  - **Default**: `20` [Source 1].

- **`detectAlternating`** `boolean` (optional)
  - If `true`, the detector will also identify alternating patterns, such as a tool `A` call followed by a tool `B` call, repeated multiple times (e.g., A → B → A → B).
  - **Default**: `true` [Source 1].

## Examples

The following example demonstrates how to create a `LoopDetectorConfig` object and use it to instantiate a `ToolLoopDetector`.

```typescript
import { ToolLoopDetector, LoopDetectorConfig } from 'yaaf';

// Define a custom configuration for the loop detector.
// This configuration is more lenient than the default.
const customConfig: LoopDetectorConfig = {
  threshold: 5,       // Require 5 identical calls to trigger a loop.
  windowSize: 30,     // Look at the last 30 tool calls for patterns.
  detectAlternating: false // Ignore A->B->A->B patterns.
};

// Pass the configuration when creating a new detector instance.
const detector = new ToolLoopDetector(customConfig);

// This detector will now use the custom thresholds and settings
// when tracking tool calls within an agent's execution cycle.
```

## See Also

- `ToolLoopDetector`: The class that consumes this configuration to perform loop detection.

## Sources

[Source 1]: src/[Tools](../subsystems/tools.md)/loopDetector.ts