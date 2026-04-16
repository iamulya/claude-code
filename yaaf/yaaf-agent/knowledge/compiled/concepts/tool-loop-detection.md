---
title: Tool Loop Detection
entity_type: concept
summary: A safety mechanism that prevents agents from entering infinite loops by detecting and breaking repetitive tool call patterns.
stub: false
compiled_at: 2026-04-16T14:37:37.664Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/tools/loopDetector.ts
confidence: 0.95
---

---
title: Tool Loop Detection
entity_type: concept
summary: A safety mechanism that prevents agents from entering infinite loops by detecting and breaking repetitive tool call patterns.
related_subsystems:
  - tools

## What It Is
Tool Loop Detection is a safety mechanism in YAAF designed to prevent autonomous agents from entering infinite loops during tool execution. This occurs when an agent repeatedly invokes the same tool with identical arguments or oscillates between a specific set of tools without progressing toward a goal.

The primary purpose of this concept is to prevent "burning money"—the unnecessary consumption of LLM API credits and computational resources—by identifying non-productive repetitive patterns and allowing the framework to intervene, typically by breaking the loop and injecting a warning into the agent's context.

## How It Works in YAAF
The mechanism is implemented via the `ToolLoopDetector` class. It maintains a rolling history of tool invocations to identify patterns that exceed a defined threshold of repetition.

### Detection Mechanisms
YAAF supports two primary types of loop detection:
1.  **Exact Repeat (`exact-repeat`)**: Detects when the same tool is called with the identical arguments multiple times consecutively.
2.  **Alternating Patterns (`alternating`)**: Detects patterns where an agent switches back and forth between different tools (e.g., Tool A → Tool B → Tool A → Tool B).

### Implementation Details
The detector tracks tool calls using the `ToolCallRecord` type, which stores:
*   The tool name.
*   A cryptographic hash of the tool arguments (`argsHash`).
*   A timestamp of the invocation.

In a standard agent loop, the framework calls `detector.record(toolName, toolArgs)` for every tool invocation. The detector then evaluates the history within a specific `windowSize`. If the number of repetitions meets the `threshold`, `detector.isLooping()` returns true, and the framework can retrieve a diagnostic warning via `detector.getWarning()`.

## Configuration
The behavior of the loop detector is governed by the `LoopDetectorConfig` object. Developers can tune the sensitivity of the detection to balance between safety and allowing legitimate repetitive tasks.

```typescript
export type LoopDetectorConfig = {
  /**
   * Number of consecutive identical calls before flagging a loop.
   * Default: 3
   */
  threshold?: number
  /**
   * Rolling window size for pattern detection.
   * Default: 20
   */
  windowSize?: number
  /**
   * Also detect alternating patterns (A→B→A→B)?
   * Default: true
   */
  detectAlternating?: boolean
}
```

### Example Usage
```ts
const detector = new ToolLoopDetector({ threshold: 3, windowSize: 10 });

// In the agent loop:
detector.record(toolName, toolArgs);
if (detector.isLooping()) {
  // Break out of the loop, inject a warning message
  const warning = detector.getWarning();
}
```

## Sources
* `src/tools/loopDetector.ts`