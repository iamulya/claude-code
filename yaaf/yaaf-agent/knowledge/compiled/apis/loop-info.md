---
summary: Describes the details of a detected tool loop, including its type and involved tools.
export_name: LoopInfo
source_file: src/tools/loopDetector.ts
category: type
relationships:
 - [object Object]
title: LoopInfo
entity_type: api
search_terms:
 - detecting infinite loops
 - agent getting stuck
 - repetitive tool calls
 - tool loop details
 - exact-repeat loop
 - alternating tool pattern
 - loop detection information
 - tool call cycle
 - preventing agent loops
 - what is a tool loop
 - loop detector output
 - tool call history analysis
stub: false
compiled_at: 2026-04-24T17:19:55.104Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/loopDetector.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `LoopInfo` type is a data structure that provides detailed information about a detected repetitive tool-calling pattern. It is used by the `ToolLoopDetector` class to report the nature of a loop, allowing an agent's control logic to respond appropriately.

This object specifies whether the loop consists of the exact same tool call being repeated or an alternating pattern between two different [Tool Calls](../concepts/tool-calls.md). It also includes the names of the involved [Tools](../subsystems/tools.md) and the number of repetitions that were detected.

## Signature

`LoopInfo` is a TypeScript type alias with the following structure:

```typescript
export type LoopInfo = {
  /**
   * The kind of loop detected.
   * - "exact-repeat": The same tool is called with the same arguments consecutively.
   * - "alternating": A pattern of two different tool calls repeats (e.g., A -> B -> A -> B).
   * - "none": No loop has been detected.
   */
  type: "exact-repeat" | "alternating" | "none";

  /**
   * An array containing the name(s) of the tool(s) involved in the loop.
   * This will contain one tool name for an "exact-repeat" loop and two for an "alternating" loop.
   */
  tools: string[];

  /**
   * The number of consecutive repetitions that triggered the loop detection.
   */
  count: number;
};
```

## Examples

The `LoopInfo` object is typically obtained from an instance of `ToolLoopDetector`. An agent can inspect this object to decide how to break a loop.

```typescript
import { ToolLoopDetector, LoopInfo } from 'yaaf';

const detector = new ToolLoopDetector({ threshold: 3 });

// Simulate some tool calls
detector.record('search', { query: 'weather in SF' });
detector.record('search', { query: 'weather in SF' });
detector.record('search', { query: 'weather in SF' });

// Check for a loop and inspect the LoopInfo object
if (detector.isLooping()) {
  const loopDetails: LoopInfo = detector.getLoopInfo();

  console.log(`Loop detected! Type: ${loopDetails.type}`);
  // Expected output: Loop detected! Type: exact-repeat

  console.log(`Involved tools: ${loopDetails.tools.join(', ')}`);
  // Expected output: Involved tools: search

  console.log(`Repetition count: ${loopDetails.count}`);
  // Expected output: Repetition count: 3

  // Agent logic can now use this info to generate a warning or take corrective action.
}
```

## See Also

- `ToolLoopDetector`: The class that detects tool loops and produces `LoopInfo` objects.

## Sources

[Source 1] src/tools/loopDetector.ts