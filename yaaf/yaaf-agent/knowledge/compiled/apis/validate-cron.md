---
export_name: validateCron
source_file: src/utils/cron.ts
category: function
summary: Validates a 5-field cron expression string for syntax and range correctness.
title: validateCron
entity_type: api
stub: false
compiled_at: 2026-04-16T14:39:15.005Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/utils/cron.ts
confidence: 1
---

## Overview
`validateCron` is a utility function used to verify the syntax and value ranges of a standard 5-field cron expression. It ensures that the provided string conforms to the expected format (minute, hour, day of month, month, day of week) and that all values fall within their respective valid ranges. This is typically used to validate configuration inputs for scheduled agent tasks.

## Signature
```typescript
export function validateCron(expr: string): boolean;
```

### Parameters
- `expr`: A string representing the cron expression to validate.

### Returns
- `boolean`: Returns `true` if the expression is a valid 5-field cron string; `false` otherwise.

## Examples
The following examples demonstrate basic validation of cron strings, including range checking.

```typescript
import { validateCron } from 'yaaf';

// Valid: 9:00 AM on weekdays (Monday through Friday)
const isValid = validateCron('0 9 * * 1-5'); 
// returns true

// Invalid: Minute value (61) is out of the valid range (0-59)
const isInvalidRange = validateCron('61 * * * *'); 
// returns false

// Invalid: Incorrect number of fields (requires exactly 5)
const isInvalidFormat = validateCron('* * * *'); 
// returns false
```

## See Also
- nextCronRunMs
- describeCron