---
title: HealProgressEvent
summary: Represents progress events emitted during the Linter Heal Mode execution.
export_name: HealProgressEvent
source_file: src/knowledge/compiler/heal.ts
category: type
entity_type: api
search_terms:
 - linter progress callback
 - heal mode events
 - tracking lint fixes
 - onProgress event type
 - healLintIssues progress
 - knowledge base repair status
 - automatic content fixing
 - LLM-powered linting
 - monitoring agent healing
 - compiler heal status
 - YAAF linter events
 - start heal event
stub: false
compiled_at: 2026-04-24T17:11:18.351Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/heal.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `HealProgressEvent` type defines the structure of progress-related events emitted by the `HealLintIssues` function [Source 1]. This allows consumers to monitor the status of the [LLM](../concepts/llm.md)-powered lint repair process in real-time.

This type is used by the optional `onProgress` callback function within the `HealOptions` object. By providing a callback, developers can receive updates as the Healing process executes, such as [when](./when.md) it begins [Source 1].

`HealProgressEvent` is a discriminated union, where the `type` property identifies the specific event being emitted [Source 1].

## Signature

`HealProgressEvent` is a discriminated union type. The following event types are part of the union:

```typescript
export type HealProgressEvent =
  | { type: "[[Heal]]:start"; totalIssues: number; [[Heal]]able: number };
```
[Source 1]

### Event: `[[Heal]]:start`

This event is emitted once at the beginning of the [Heal](../concepts/heal.md)ing process.

*   **`type: "heal:start"`**: A string literal indicating the start of the heal process.
*   **`totalIssues: number`**: The total number of lint issues identified in the report.
*   **`healable: number`**: The number of issues that the heal process will attempt to fix.

## Examples

The following example demonstrates how to provide an `onProgress` callback to the `healLintIssues` function to listen for `HealProgressEvent` updates.

```typescript
import {
  healLintIssues,
  HealOptions,
  HealProgressEvent,
  // ... other necessary imports
} from 'yaaf';

// Assume llm, lintReport, compiledDir, and registry are already defined.

const handleProgress = (event: HealProgressEvent) => {
  switch (event.type) {
    case 'heal:start':
      console.log(
        `Healing started. Attempting to fix ${event.healable} of ${event.totalIssues} total issues.`
      );
      break;
    // Handle other potential event types here in the future.
  }
};

const options: HealOptions = {
  onProgress: handleProgress,
  maxCalls: 50,
};

const healResult = await healLintIssues(
  llm,
  lintReport,
  compiledDir,
  registry,
  options
);

console.log(`Healing complete. ${healResult.healed} issues fixed.`);
```

## See Also

*   `healLintIssues`: The function that performs the healing process and emits these events.
*   `HealOptions`: The configuration object where the `onProgress` callback is defined.
*   `HealResult`: The type defining the final output of the `healLintIssues` function.

## Sources

[Source 1]: src/knowledge/compiler/heal.ts