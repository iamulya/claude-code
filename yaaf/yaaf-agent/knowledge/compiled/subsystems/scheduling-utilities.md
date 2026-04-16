---
primary_files:
  - src/utils/cron.ts
summary: A utility subsystem providing logic for cron expression validation, parsing, and next-run calculations.
title: Scheduling Utilities
entity_type: subsystem
exports:
  - validateCron
  - nextCronRunMs
  - describeCron
stub: false
compiled_at: 2026-04-16T14:39:21.995Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/utils/cron.ts
confidence: 0.95
---

## Purpose
The Scheduling Utilities subsystem provides a standardized mechanism for handling time-based scheduling logic within the YAAF framework. It focuses on the validation, parsing, and calculation of 5-field cron expressions, enabling other framework components to determine when specific agent actions or tasks should be executed.

## Architecture
This subsystem is implemented as a collection of stateless utility functions. It does not manage an internal execution loop or task queue; instead, it provides the underlying logic required for higher-level scheduling components to function. The architecture is centered around the interpretation of standard 5-field cron strings.

## Key APIs
The subsystem exports three primary functions for managing cron-based schedules:

### validateCron
Validates whether a given string conforms to the 5-field cron expression format. It returns `true` if the expression is valid and `false` otherwise.

```typescript
validateCron('0 9 * * 1-5')  // true — 9am weekdays
validateCron('61 * * * *')   // false — minute out of range
```

### nextCronRunMs
Calculates the next occurrence of a schedule based on a cron expression and a starting timestamp (in epoch milliseconds). If no matching time is found within the next calendar year, it returns `null`.

```typescript
const next = nextCronRunMs('0 9 * * *', Date.now())
// Returns epoch ms of the next occurrence at 9:00 AM
```

### describeCron
Generates a human-readable string describing the next scheduled fire time. This is primarily used for logging or user interface feedback. It returns `null` if the cron expression is invalid.

```typescript
describeCron('0 9 * * 1-5', Date.now())
// Example output: 'Next: Mon Apr 14 2026 09:00:00'
```

## Sources
- `src/utils/cron.ts`