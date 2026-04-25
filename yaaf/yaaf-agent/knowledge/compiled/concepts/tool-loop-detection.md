---
summary: A core mechanism in YAAF to identify and prevent agents from entering repetitive or infinite tool call patterns.
relationships:
 - [object Object]
title: Tool Loop Detection
entity_type: concept
related_subsystems:
 - Tools
search_terms:
 - prevent infinite tool calls
 - repetitive agent behavior
 - detect agent loops
 - agent stuck in a loop
 - tool call pattern detection
 - OpenClaw tool loop
 - alternating tool calls
 - how to stop agent from repeating actions
 - agent cost control
 - YAAF loop detection
 - tool call history
 - consecutive identical calls
stub: false
compiled_at: 2026-04-24T18:04:13.982Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/loopDetector.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

Tool Loop Detection is a mechanism within YAAF designed to identify and break repetitive tool call patterns. Its primary purpose is to prevent agents from getting stuck in infinite or near-infinite loops where they repeatedly call the same tool with the same arguments. This is a critical feature for production-grade agents as it helps avoid wasting computational resources and incurring unnecessary costs from API calls [Source 1].

The implementation in YAAF is inspired by similar functionality found in other agent frameworks, such as OpenClaw's tool-loop detection [Source 1].

## How It Works in YAAF

The core of this mechanism is the `ToolLoopDetector` class, which maintains a rolling window of recent tool call history. For each tool invocation, the agent records the tool's name and a hash of its arguments [Source 1].

The detector analyzes this history to identify two primary types of loops [Source 1]:
1.  **Exact-Repeat**: The same tool is called with the identical arguments multiple times in a row.
2.  **Alternating**: Two or more [Tools](../subsystems/tools.md) are called in a repeating sequence, such as `toolA(args1)` followed by `toolB(args2)`, then `toolA(args1)` again.

In a typical agent execution cycle, a developer would first record the current tool call using `detector.record()`. Then, they would call `detector.isLooping()` to check if a pattern has been detected. If a loop is identified, the agent's logic can intervene, for example, by breaking the loop and injecting a warning message into the agent's context [Source 1].

The `LoopInfo` type provides details about a detected loop, including its `type` (`exact-repeat` or `alternating`), the `tools` involved, and the `count` of repetitions [Source 1].

## Configuration

The behavior of the `ToolLoopDetector` can be customized during its instantiation via the `LoopDetectorConfig` object. The available parameters are [Source 1]:

*   `threshold`: The number of consecutive identical or alternating calls required to flag a loop. The default value is 3.
*   `windowSize`: The number of recent [Tool Calls](./tool-calls.md) to keep in the history for pattern detection. The default is 20.
*   `detectAlternating`: A boolean that enables or disables the detection of alternating patterns (e.g., A→B→A→B). This is enabled by default.

### Example

```typescript
import { ToolLoopDetector } from 'yaaf'; // Fictional import path

// Configure a detector to be more sensitive to loops
const detector = new ToolLoopDetector({
  threshold: 2,         // Flag a loop after just 2 repetitions
  windowSize: 10,       // Only look at the last 10 calls
  detectAlternating: true
});

// Inside the agent's execution logic
function executeTool(toolName: string, toolArgs: any) {
  detector.record(toolName, toolArgs);

  if (detector.isLooping()) {
    const warning = detector.getWarning(); // Fictional method based on example
    console.error("Loop detected:", warning);
    // Halt execution or change strategy
    return;
  }

  // ... proceed with tool execution
}
```

## Sources

[Source 1]: `src/tools/loopDetector.ts`