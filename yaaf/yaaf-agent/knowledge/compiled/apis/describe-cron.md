---
export_name: describeCron
source_file: src/utils/cron.ts
category: function
summary: Generates a human-readable string describing the next scheduled run time of a cron expression.
title: describeCron
entity_type: api
stub: false
compiled_at: 2026-04-16T14:39:20.502Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/utils/cron.ts
confidence: 1
---

## Overview
The `describeCron` function provides a human-readable representation of the next scheduled execution time for a given cron expression. It is used to translate technical cron syntax into a descriptive string, typically for logging, debugging, or user interface displays. If the provided cron expression is invalid or if no execution time is found within the next calendar year, the function returns `null`.

## Signature / Constructor
```typescript
export function describeCron(cron: string, fromMs = Date.now()): string | null
```

### Parameters
*   `cron`: A string containing a standard 5-field cron expression.
*   `fromMs`: (Optional) The reference epoch time in milliseconds from which to calculate the next run. Defaults to the current system time via `Date.now()`.

### Returns
*   A string in the format `"Next: [Date String]"` if a valid next run time is found.
*   `null` if the cron expression is invalid or no run time is found within one year.

## Examples
### Describing a Weekday Schedule
This example shows how to generate a description for a cron expression scheduled for 9:00 AM on weekdays.

```typescript
import { describeCron } from 'yaaf';

const nextRun = describeCron('0 9 * * 1-5', Date.now());
// Returns: 'Next: Mon Apr 14 2026 09:00:00' (example output)
```

### Handling Invalid Expressions
If an invalid cron expression is passed (e.g., a minute value out of range), the function returns `null`.

```typescript
import { describeCron } from 'yaaf';

const result = describeCron('61 * * * *');
// Returns: null
```

## Sources
- `src/utils/cron.ts`