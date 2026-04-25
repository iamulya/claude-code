---
summary: Validate a 5-field cron expression.
export_name: validateCron
source_file: src/utils/cron.ts
category: function
tags:
 - utility
 - scheduling
 - cron
title: validateCron
entity_type: api
search_terms:
 - cron expression validation
 - check if cron string is valid
 - cron syntax check
 - scheduling expression validator
 - "5-field cron format"
 - how to validate cron jobs
 - cron string parser
 - task scheduling utility
 - cron job syntax
 - validate scheduled task time
 - cron expression helper
stub: false
compiled_at: 2026-04-24T17:47:04.491Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/cron.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `validateCron` function is a utility that checks if a given string is a syntactically valid 5-field [Cron Expression](../concepts/cron-expression.md) [Source 1]. It returns `true` if the expression is valid and `false` otherwise.

This function is typically used to validate user input or configuration values for scheduled tasks or agents before attempting to use them for scheduling, preventing runtime errors from malformed cron strings.

## Signature

```typescript
export function validateCron(expr: string): boolean;
```

**Parameters:**

*   `expr` (string): The 5-field cron expression to validate.

**Returns:**

*   `boolean`: `true` if the expression is valid, `false` otherwise.

## Examples

The following examples demonstrate how to use `validateCron` to check both valid and invalid cron expressions [Source 1].

```typescript
// Check a valid expression for 9am on weekdays
const isValid = validateCron('0 9 * * 1-5');
// => true

// Check an invalid expression where the minute (61) is out of range
const isInvalid = validateCron('61 * * * *');
// => false
```

## See Also

*   `nextCronRunMs`: A related utility function that computes the next execution time for a given cron expression.
*   `describeCron`: A function that provides a human-readable description of the next execution time for a cron expression.

## Sources

[Source 1]: src/utils/cron.ts