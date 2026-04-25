---
summary: Compute the next fire time (epoch ms) after `fromMs` for a given cron expression.
export_name: nextCronRunMs
source_file: src/utils/cron.ts
category: function
tags:
 - utility
 - scheduling
 - cron
title: nextCronRunMs
entity_type: api
search_terms:
 - calculate next cron job time
 - cron expression to timestamp
 - find next schedule execution
 - cron job scheduling
 - time until next cron run
 - convert cron to milliseconds
 - schedule task from cron string
 - cron utility function
 - get next execution time
 - predict cron fire time
 - epoch ms from cron
 - YAAF scheduling helper
stub: false
compiled_at: 2026-04-24T17:22:41.049Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/cron.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `nextCronRunMs` function is a utility for calculating the next scheduled execution time of a cron job. Given a standard 5-field [Cron Expression](../concepts/cron-expression.md) and a starting timestamp, it returns the epoch millisecond timestamp of the next time the schedule should fire [Source 1].

This function is useful for any component that needs to schedule future actions based on a cron pattern, such as a recurring agent trigger or a scheduled maintenance task.

If no matching time is found within the next year from the provided `fromMs` timestamp, the function will return `null` [Source 1].

## Signature

```typescript
export function nextCronRunMs(cron: string, fromMs: number): number | null;
```

**Parameters:**

*   `cron: string`: A 5-field cron expression (minute, hour, day of month, month, day of week).
*   `fromMs: number`: The starting point for the search, provided as an epoch millisecond timestamp. The function finds the first valid run time *after* this point.

**Returns:**

*   `number | null`: The epoch millisecond timestamp of the next scheduled run, or `null` if no valid time is found within the next year [Source 1].

## Examples

### Basic Usage

Calculate the next 9:00 AM from the current time.

```typescript
// Get the timestamp for the next time it's 9:00 AM
const nextRun = nextCronRunMs('0 9 * * *', Date.now());

if (nextRun !== null) {
  console.log(`Next run is scheduled for: ${new Date(nextRun).toISOString()}`);
} else {
  console.log('No scheduled run found in the next year.');
}

// Example output:
// Next run is scheduled for: 2023-10-27T09:00:00.000Z
```
[Source 1]

## See Also

*   `validateCron`: A utility function to check if a cron expression is valid.
*   `describeCron`: A utility function to get a human-readable description of the next run time.

## Sources

[Source 1]: src/utils/cron.ts