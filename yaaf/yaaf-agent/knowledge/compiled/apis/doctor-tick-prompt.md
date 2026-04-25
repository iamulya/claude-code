---
summary: A function that generates the prompt for the YAAF Doctor's periodic wake-up checks.
export_name: DOCTOR_TICK_PROMPT
source_file: src/doctor/prompt.ts
category: function
title: DOCTOR_TICK_PROMPT
entity_type: api
search_terms:
 - doctor agent prompt
 - periodic agent check
 - daemon wake-up prompt
 - how to trigger doctor agent
 - tick prompt function
 - yaaf doctor lifecycle
 - agent monitoring prompt
 - system tick message
 - doctor agent timestamp
 - doctor agent check count
stub: false
compiled_at: 2026-04-24T17:03:34.439Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/doctor/prompt.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`DOCTOR_TICK_PROMPT` is a function that generates the prompt string used to signal a periodic wake-up or "tick" for the YAAF Doctor agent [Source 1].

This prompt is part of the Doctor's daemon-like behavior, informing it what to check on each wake-up cycle. The generated string includes a timestamp and a sequential count, providing context for the check [Source 1].

## Signature

The function takes a timestamp string and a tick count number, and returns a formatted string.

```typescript
(ts: string, count: number) => string;
```

**Parameters:**

*   `ts` (string): The timestamp of the tick, typically in ISO format.
*   `count` (number): The sequential number of this tick event.

**Returns:**

*   (string): A string formatted as an XML-like tag, e.g., `<tick timestamp="..." count="...">`.

## Examples

The following example demonstrates how to generate a tick prompt for the Doctor agent.

```typescript
import { DOCTOR_TICK_PROMPT } from 'yaaf';

const timestamp = new Date('2023-10-27T10:00:00.000Z').toISOString();
const tickCount = 15;

const prompt = DOCTOR_TICK_PROMPT(timestamp, tickCount);

console.log(prompt);
// Output:
// <tick timestamp="2023-10-27T10:00:00.000Z" count="15">
```

## See Also

*   `DOCTOR_SYSTEM_PROMPT`: The main [System Prompt](../concepts/system-prompt.md) that defines the Doctor agent's core identity and capabilities.

## Sources

[Source 1]: src/doctor/prompt.ts