---
title: ToolLoopDetector
entity_type: api
summary: A utility class used to record tool execution history and identify looping behavior based on configurable thresholds.
export_name: ToolLoopDetector
source_file: src/tools/loopDetector.ts
category: class
stub: false
compiled_at: 2026-04-16T14:12:02.500Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/tools.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/tools/loopDetector.ts
confidence: 1
---

## Overview
`ToolLoopDetector` is a utility designed to identify and mitigate repetitive tool execution patterns in LLM-powered agents. It tracks tool calls and their arguments to detect when an agent has entered an infinite loop—such as calling the same tool with identical parameters multiple times or alternating between a specific set of tools. 

This mechanism is inspired by OpenClaw's tool-loop detection and is primarily used to prevent agents from consuming excessive tokens or API budget when they fail to progress toward a goal.

## Signature / Constructor

```typescript
export class ToolLoopDetector {
  constructor(config?: LoopDetectorConfig);
}
```

### Configuration Types

#### LoopDetectorConfig
| Property | Type | Description |
| :--- | :--- | :--- |
| `threshold` | `number` | Number of consecutive identical calls before flagging a loop. Default: `3`. |
| `windowSize` | `number` | Rolling window size for pattern detection. Default: `20`. |
| `detectAlternating` | `boolean` | Whether to detect alternating patterns (e.g., Tool A → Tool B → Tool A → Tool B). Default: `true`. |

## Methods & Properties

### record()
Records a tool execution event in the internal history.
```typescript
record(name: string, args: any): void
```
- **name**: The name of the tool being called.
- **args**: The arguments passed to the tool (internally hashed for comparison).

### isLooping()
Checks the current execution history against the configured thresholds to determine if a loop is occurring.
```typescript
isLooping(): boolean
```

### getWarning()
Generates a descriptive warning message when a loop is detected, suitable for injecting back into the agent's context to prompt a change in behavior.
```typescript
getWarning(): string
```

### Supporting Types

#### ToolCallRecord
Represents a single entry in the detector's history.
- `name`: `string`
- `argsHash`: `string`
- `timestamp`: `number`

#### LoopInfo
Detailed information about a detected loop.
- `type`: `'exact-repeat' | 'alternating' | 'none'`
- `tools`: `string[]` (The names of the tools involved in the loop)
- `count`: `number` (Number of repetitions detected)

## Examples

### Basic Usage in Agent Hooks
The most common pattern is to use the detector within an agent's `afterToolCall` hook to monitor and interrupt runaway processes.

```typescript
import { ToolLoopDetector } from 'yaaf';

const detector = new ToolLoopDetector({
  threshold: 3,    // Trigger after 3 identical calls
  windowSize: 20,  // Look at last 20 calls
});

// In your agent configuration:
const agentHooks = {
  afterToolCall: async (ctx) => {
    // Record the call
    detector.record(ctx.toolName, ctx.arguments);
    
    // Check for looping behavior
    if (detector.isLooping()) {
      // Return an instruction to the runner to inject a warning
      return {
        action: 'inject',
        message: detector.getWarning(),
      };
    }
    return { action: 'continue' };
  },
};
```

### Manual Detection
```typescript
const detector = new ToolLoopDetector();

detector.record('get_weather', { location: 'San Francisco' });
detector.record('get_weather', { location: 'San Francisco' });
detector.record('get_weather', { location: 'San Francisco' });

if (detector.isLooping()) {
  console.warn(detector.getWarning());
}
```

## See Also
- [Tools Source Material](docs/tools.md)