---
export_name: nextCronRunMs
source_file: src/utils/cron.ts
category: function
summary: Computes the next execution timestamp in epoch milliseconds for a given cron expression.
title: nextCronRunMs
entity_type: api
stub: false
compiled_at: 2026-04-16T14:39:15.931Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/utils/cron.ts
confidence: 1
---

## Overview
`nextCronRunMs` is a utility function used to calculate the next scheduled execution time for a given cron expression. It takes a starting timestamp and determines the subsequent occurrence in epoch milliseconds. This is typically used within the framework to handle task scheduling and periodic agent activities.

The function expects a standard 5-field cron expression and searches for a match within a one-year window from the provided start time.

## Signature / Constructor
```typescript
export function nextCronRunMs(cron: string, fromMs: number): number | null
```

### Parameters
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `cron` | `string` | A 5-field cron expression (e.g., `0 9 * * *`). |
| `fromMs` | `number` | The starting point for the calculation in epoch milliseconds. |

### Returns
`number | null`: The epoch timestamp in milliseconds of the next scheduled run. Returns `null` if the expression is invalid or if no matching time is found within the next year.

## Examples
### Basic Usage
Calculating the next occurrence of a daily 9:00 AM schedule.

```typescript
import { nextCronRunMs } from 'yaaf/utils/cron';

const now = Date.now();
const nextRun = nextCronRunMs('0 9 * * *', now);

if (nextRun) {
  console.log(`The next run is at: ${new Date(nextRun).toISOString()}`);
}
```

## See Also
- `validateCron`
- `describeCron`