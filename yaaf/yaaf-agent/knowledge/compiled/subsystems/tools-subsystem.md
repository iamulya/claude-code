---
summary: The YAAF subsystem responsible for managing agent tools, their invocation, and related utilities like loop detection.
primary_files:
 - src/tools/loopDetector.ts
relationships:
 - [object Object]
 - [object Object]
 - [object Object]
 - [object Object]
title: Tools Subsystem
entity_type: subsystem
exports:
 - ToolLoopDetector
 - LoopDetectorConfig
 - ToolCallRecord
 - LoopInfo
search_terms:
 - agent tool loop
 - prevent infinite tool calls
 - detect repetitive tool usage
 - tool loop detection
 - OpenClaw tool loop
 - how to stop agent loops
 - alternating tool pattern
 - tool call history
 - agent cost control
 - YAAF tool management
 - LoopDetectorConfig
 - ToolCallRecord
stub: false
compiled_at: 2026-04-24T18:21:03.359Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/loopDetector.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The [Tools](./tools.md) Subsystem provides [Utilities](./utilities.md) for managing and monitoring tool usage within a YAAF agent. Its primary function is to prevent agents from entering infinite loops where they repeatedly call the same tool with the same arguments [Source 1]. This is a critical safety and cost-control mechanism, as it stops agents from consuming excessive resources or API credits on unproductive, repetitive tasks. The design is inspired by similar functionality in OpenClaw's tool-loop detection [Source 1].

## Architecture

The central component of this subsystem is the `ToolLoopDetector` class. It operates by maintaining a rolling history of recent [Tool Calls](../concepts/tool-calls.md) within a configurable window [Source 1].

[when](../apis/when.md) a tool call is recorded, the detector computes a hash of the tool's arguments. This allows for efficient comparison of different calls to determine if they are identical. The detector then analyzes the history to identify two primary types of repetitive patterns [Source 1]:

1.  **Exact-Repeat**: The same tool is called with the same arguments multiple times in a row.
2.  **Alternating**: Two distinct tool calls are made in an alternating sequence (e.g., A → B → A → B).

A loop is flagged when a pattern's repetition count exceeds a configured threshold. The `ToolCallRecord` type defines the structure for storing historical call data, including the tool name, argument hash, and a timestamp. When a loop is detected, information about it is encapsulated in a `LoopInfo` object, which specifies the loop type, the tools involved, and the number of repetitions [Source 1].

## Integration Points

The `ToolLoopDetector` is designed to be integrated directly into an agent's core execution loop. The agent's runtime is responsible for:
1.  Instantiating the `ToolLoopDetector` with the desired configuration.
2.  Calling the `record()` method after each tool invocation.
3.  Calling the `isLooping()` method to check for a loop condition.
4.  If a loop is detected, the agent can take corrective action, such as breaking the execution cycle and injecting a warning message into the agent's context using `getWarning()` [Source 1].

```ts
// Example of integration within an agent loop
const detector = new ToolLoopDetector({ threshold: 3, windowSize: 10 });

// In the agent loop:
detector.record(toolName, toolArgs);
if (detector.isLooping()) {
  // Break out of the loop, inject a warning message
  const warning = detector.getWarning();
}
```
[Source 1]

## Key APIs

-   **`ToolLoopDetector`**: The main class that implements the loop detection logic. It is instantiated with a `LoopDetectorConfig` object and used to record calls and check for loops [Source 1].
-   **`LoopDetectorConfig`**: A type defining the configuration options for the detector, including `threshold`, `windowSize`, and `detectAlternating` [Source 1].
-   **`ToolCallRecord`**: A type representing a single recorded tool call, containing its name, a hash of its arguments, and a timestamp [Source 1].
-   **`LoopInfo`**: A type that provides structured information about a detected loop, including its type (`exact-repeat` or `alternating`), the tools involved, and the repetition count [Source 1].

## Configuration

The behavior of the `ToolLoopDetector` is controlled by the `LoopDetectorConfig` object provided during its construction. The available options are:

-   `threshold`: The number of consecutive identical or alternating calls required to flag a loop. Defaults to `3` [Source 1].
-   `windowSize`: The number of recent tool calls to keep in history for pattern detection. Defaults to `20` [Source 1].
-   `detectAlternating`: A boolean that enables or disables the detection of alternating patterns (e.g., A→B→A→B). Defaults to `true` [Source 1].

## Sources

[Source 1]: src/tools/loopDetector.ts