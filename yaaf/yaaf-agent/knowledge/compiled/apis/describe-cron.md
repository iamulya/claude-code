---
summary: Generates a human-readable description of a cron expression's next scheduled run time.
export_name: describeCron
source_file: src/utils/cron.ts
category: function
tags:
 - utility
 - scheduling
 - cron
title: describeCron
entity_type: api
search_terms:
 - human readable cron
 - explain cron schedule
 - next cron run time
 - cron expression description
 - what does this cron mean
 - cron job timing
 - scheduling utility
 - cron validation
 - next scheduled task
 - format cron time
 - cron string to date
stub: false
compiled_at: 2026-04-24T17:01:28.969Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/cron.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `describeCron` function is a utility that takes a [Cron Expression](../concepts/cron-expression.md) and returns a human-readable string indicating the next time it is scheduled to run. This is useful for displaying schedule information in user interfaces or logs. If the provided cron expression is invalid, the function returns `null` [Source 1].

It calculates the next run time relative to a given starting point, which defaults to the current time (`Date.now()`) if not specified [Source 1].

## Signature

The function takes a cron expression string and an optional starting timestamp in milliseconds.

```typescript
export function describeCron(cron: string, fromMs = Date.now()): string | null;
```

**Parameters:**

*   `cron` (string): A 5-field cron expression (e.g., `'0 9 * * 1-5'`).
*   `fromMs` (number, optional): The starting time in epoch milliseconds from which to calculate the next run time. Defaults to `Date.now()`.

**Returns:**

*   `string | null`: A formatted string describing the next run time (e.g., `'Next: Mon Apr 14 2026 09:00:00'`), or `null` if the cron expression is invalid [Source 1].

## Examples

The following example demonstrates how to get a description for a cron job that runs at 9:00 AM on weekdays.

```typescript
import { describeCron } from 'yaaf';

// Get the description for a job running at 9am on weekdays
const description = describeCron('0 9 * * 1-5');

// The actual date and time will vary based on when the code is run.
// Example output: 'Next: Mon Apr 14 2026 09:00:00'
console.log(description);

// Example with an invalid cron expression
const invalidDescription = describeCron('61 * * * *'); // Minute is out of range
console.log(invalidDescription); // → null
```

## See Also

*   `validateCron`: A function to check if a cron expression is valid.
*   `nextCronRunMs`: A function that returns the next run time as an epoch millisecond timestamp.

## Sources

[Source 1]: src/utils/cron.ts