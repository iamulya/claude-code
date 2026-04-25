---
summary: A class that detects and prevents agents from entering repetitive tool call patterns.
export_name: ToolLoopDetector
source_file: src/tools/loopDetector.ts
category: class
relationships:
 - [object Object]
 - [object Object]
title: ToolLoopDetector
entity_type: api
search_terms:
 - prevent infinite tool loops
 - detect repetitive tool calls
 - agent getting stuck
 - tool call cycle detection
 - alternating tool pattern
 - avoid expensive agent loops
 - tool call history
 - loop detection algorithm
 - OpenClaw loop detection
 - stop agent from repeating itself
 - tool call threshold
 - rolling window pattern detection
stub: false
compiled_at: 2026-04-24T17:45:19.757Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/loopDetector.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `ToolLoopDetector` class is a utility designed to detect and prevent [LLM](../concepts/llm.md)-powered agents from getting stuck in repetitive tool-calling loops [Source 1]. This is a common failure mode where an agent repeatedly calls the same tool with the same arguments, which can lead to wasted resources and failed tasks. The implementation is inspired by similar functionality in the OpenClaw project [Source 1].

It works by tracking a history of [Tool Calls](../concepts/tool-calls.md) within a rolling window. If it detects that the same tool and arguments have been called a configurable number of times consecutively, or if it detects an alternating pattern of calls, it flags a loop condition. This allows the agent's control logic to intervene, for example by breaking the loop and providing a warning message to the underlying model [Source 1].

## Signature / Constructor

The `ToolLoopDetector` is instantiated with an optional configuration object.

```typescript
export class ToolLoopDetector {
  constructor(config?: LoopDetectorConfig);
  // ... methods
}
```

### Configuration

The constructor accepts a `LoopDetectorConfig` object with the following properties [Source 1]:

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

### Related Types

The following types are used by or related to the `ToolLoopDetector` [Source 1]:

```typescript
// Represents a single recorded tool call
export type ToolCallRecord = {
  name: string;
  argsHash: string;
  timestamp: number;
};

// Describes the state of a detected loop
export type LoopInfo = {
  type: "exact-repeat" | "alternating" | "none";
  /** Tool(s) involved */
  [[[[[[[[Tools]]]]]]]]: string[];
  /** Number of repetitions detected */
  count: number;
};
```

## Methods & Properties

Based on the example usage, the `ToolLoopDetector` class exposes the following public methods [Source 1].

### record()

Records a tool call to be tracked for loop detection.

```typescript
record(toolName: string, toolArgs: any): void;
```

- **`toolName`**: The name of the tool that was called.
- **`toolArgs`**: The arguments passed to the tool. These are hashed internally to check for repetition.

### isLooping()

Checks the recorded history and returns `true` if a loop pattern is detected based on the configured `threshold` and `windowSize`.

```typescript
isLooping(): boolean;
```

### getWarning()

Returns a descriptive warning message if a loop has been detected. This message can be injected into the agent's context to help it break out of the loop.

```typescript
getWarning(): string;
```

## Examples

The following example shows how to instantiate and use the `ToolLoopDetector` within an agent's execution cycle [Source 1].

```typescript
import { ToolLoopDetector } from 'yaaf';

const detector = new ToolLoopDetector({ threshold: 3, windowSize: 10 });

// --- Inside the agent's main loop ---

// Assume toolName and toolArgs are available after the LLM generates a tool call
const toolName = 'search';
const toolArgs = { query: 'best agent frameworks' };

// 1. Record the tool call
detector.record(toolName, toolArgs);

// 2. Check if a loop is detected
if (detector.isLooping()) {
  // 3. Intervene if a loop is found
  const warning = detector.getWarning();
  console.error(warning);
  // Break out of the agent's loop or inject the warning
  // back to the LLM for the next turn.
} else {
  // Proceed with executing the tool call
}
```

## Sources

[Source 1]: src/Tools/loopDetector.ts