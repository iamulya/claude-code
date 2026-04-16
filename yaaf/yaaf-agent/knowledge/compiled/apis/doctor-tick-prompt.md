---
title: DOCTOR_TICK_PROMPT
entity_type: api
summary: A function that generates a periodic prompt for the Doctor daemon to perform scheduled checks and maintenance tasks.
export_name: DOCTOR_TICK_PROMPT
source_file: src/doctor/prompt.ts
category: function
stub: false
compiled_at: 2026-04-16T14:17:43.954Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/doctor/prompt.ts
confidence: 1
---

## Overview
`DOCTOR_TICK_PROMPT` is a utility function used by the YAAF Doctor subsystem to generate a structured signal for the Doctor daemon. This prompt is delivered to the LLM-powered Doctor agent during its periodic wake-up cycles (ticks). 

The function provides the agent with temporal context (the current timestamp) and sequence context (the tick count), allowing the daemon to track its operational history and perform scheduled maintenance or project analysis tasks. The Doctor agent uses this prompt in conjunction with its static knowledge of YAAF architecture and dynamic project context accessed via tools.

## Signature / Constructor
```typescript
export const DOCTOR_TICK_PROMPT = (ts: string, count: number): string => {
  // Returns a formatted XML-like string
}
```

### Parameters
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `ts` | `string` | A string representation of the current timestamp. |
| `count` | `number` | The current iteration count of the daemon's wake-up cycle. |

## Examples

### Basic Usage
This example demonstrates how the framework generates a tick prompt for the Doctor daemon.

```typescript
import { DOCTOR_TICK_PROMPT } from 'yaaf/doctor';

const timestamp = new Date().toISOString();
const tickCount = 42;

const prompt = DOCTOR_TICK_PROMPT(timestamp, tickCount);
// Output: <tick timestamp="2023-10-27T10:00:00.000Z" count="42">
```

## See Also
- `DOCTOR_SYSTEM_PROMPT`