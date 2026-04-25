---
summary: Represents a single record of a tool call, used by the ToolLoopDetector for pattern analysis.
export_name: ToolCallRecord
source_file: src/tools/loopDetector.ts
category: type
relationships:
 - [object Object]
title: ToolCallRecord
entity_type: api
search_terms:
 - tool call history
 - agent loop detection
 - tracking tool usage
 - tool call arguments hash
 - preventing infinite loops
 - ToolLoopDetector data structure
 - record tool invocation
 - tool call timestamp
 - detecting repetitive agent behavior
 - what is a ToolCallRecord
 - tool call signature
stub: false
compiled_at: 2026-04-24T17:44:41.419Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/loopDetector.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

`ToolCallRecord` is a TypeScript type that defines the data structure for a single, recorded tool invocation. It is used internally by the `ToolLoopDetector` class to maintain a history of recent [Tool Calls](../concepts/tool-calls.md).

Each record captures the essential information needed to detect repetitive patterns: the name of the tool called, a hash of the arguments it was called with, and the time of the call. By analyzing a sequence of these records, the `ToolLoopDetector` can identify [when](./when.md) an agent is stuck in a loop, calling the same tool with the same arguments repeatedly.

## Signature

The `ToolCallRecord` is a type alias for an object with the following properties:

```typescript
export type ToolCallRecord = {
  name: string;
  argsHash: string;
  timestamp: number;
};
```

### Properties

- **`name: string`**
  The name of the tool that was invoked.

- **`argsHash: string`**
  A cryptographic hash of the arguments passed to the tool. Hashing the arguments provides a consistent and compact way to check for equality without storing potentially large argument objects.

- **`timestamp: number`**
  A numerical timestamp (e.g., from `Date.now()`) indicating when the tool call was recorded.

## Examples

`ToolCallRecord` is not typically instantiated directly by the user. Instead, it is created and managed internally by the `ToolLoopDetector` class. The following example shows the context in which `ToolCallRecord` objects are used.

```typescript
import { ToolLoopDetector } from 'yaaf';

// The detector maintains a list of ToolCallRecord objects internally.
const detector = new ToolLoopDetector({ threshold: 3, windowSize: 10 });

// In an agent's execution loop...
function processToolCall(toolName: string, toolArgs: any) {
  // The record method creates a ToolCallRecord internally and adds it to its history.
  detector.record(toolName, toolArgs);

  if (detector.isLooping()) {
    // The detector has identified a repetitive pattern in its internal
    // list of ToolCallRecord objects.
    const warning = detector.getWarning();
    console.warn('Loop detected:', warning);
    // Handle the loop, e.g., by returning an error to the LLM.
  } else {
    // Execute the tool call normally.
  }
}
```

## See Also

- `ToolLoopDetector`: The class that uses `ToolCallRecord` to detect and prevent infinite tool call loops.

## Sources

[Source 1] src/[Tools](../subsystems/tools.md)/loopDetector.ts