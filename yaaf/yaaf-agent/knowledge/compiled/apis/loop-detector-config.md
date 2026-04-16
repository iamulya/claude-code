---
title: LoopDetectorConfig
entity_type: api
summary: Configuration interface for defining thresholds and window sizes for the ToolLoopDetector.
export_name: LoopDetectorConfig
source_file: src/tools/loopDetector.ts
category: type
stub: false
compiled_at: 2026-04-16T14:37:37.755Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/tools/loopDetector.ts
confidence: 1
---

## Overview
`LoopDetectorConfig` is a configuration object used to initialize a `ToolLoopDetector`. It defines the sensitivity and behavior of the loop detection logic, which is designed to prevent agents from entering infinite loops of identical or alternating tool calls. This mechanism is inspired by OpenClaw's tool-loop detection and serves as a safeguard against excessive resource consumption and API costs.

## Signature / Constructor
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

## Methods & Properties
| Property | Type | Description |
| :--- | :--- | :--- |
| `threshold` | `number` | (Optional) The number of consecutive identical tool calls (matching both name and arguments) required to flag a loop. Defaults to `3`. |
| `windowSize` | `number` | (Optional) The size of the rolling history window maintained for pattern analysis. Defaults to `20`. |
| `detectAlternating` | `boolean` | (Optional) Whether the detector should identify alternating patterns (e.g., Tool A → Tool B → Tool A → Tool B). Defaults to `true`. |

## Examples
### Basic Configuration
```typescript
const config: LoopDetectorConfig = {
  threshold: 3,
  windowSize: 10,
  detectAlternating: true
};

// Usage with ToolLoopDetector
const detector = new ToolLoopDetector(config);
```

### Strict Detection
To detect loops more aggressively, the threshold can be lowered.
```typescript
const strictConfig: LoopDetectorConfig = {
  threshold: 2,
  windowSize: 5
};
```