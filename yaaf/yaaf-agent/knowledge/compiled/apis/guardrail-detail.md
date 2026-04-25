---
export_name: GuardrailDetail
source_file: src/utils/guardrails.ts
category: type
summary: Provides detailed information for a single resource within a Guardrails check result, including current usage, limit, and percentage used.
title: GuardrailDetail
entity_type: api
search_terms:
 - guardrail check details
 - resource usage status
 - cost tracking information
 - token limit details
 - agent budget monitoring
 - GuardrailCheckResult details
 - current vs limit
 - percentage used guardrail
 - runaway agent prevention
 - resource consumption object
 - what is GuardrailDetail
 - budget check result
stub: false
compiled_at: 2026-04-24T17:10:26.194Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/guardrails.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `GuardrailDetail` type is a data structure that represents the state of a single monitored resource (such as cost, tokens, or turns) within the YAAF Guardrails subsystem [Source 1]. It is a component of the `GuardrailCheckResult` object, which is returned by the `Guardrails.check()` method.

Each `GuardrailDetail` object provides a granular view of one specific budget limit, detailing its current usage, the configured limit, the percentage of the budget consumed, and its overall status (`ok`, `warning`, `error`, or `blocked`) [Source 1]. An array of these objects allows an application to inspect the state of all active guardrails at once.

## Signature

`GuardrailDetail` is a TypeScript type alias for an object with the following structure [Source 1]:

```typescript
export type GuardrailDetail = {
  resource: GuardrailResource;
  status: GuardrailStatus;
  current: number;
  limit: number;
  pctUsed: number;
};
```

### Constituent Types

The properties of `GuardrailDetail` use the following related types [Source 1]:

```typescript
// The specific resource being monitored.
export type GuardrailResource = "cost" | "tokens" | "turns" | "input_tokens";

// The current state of the resource relative to its limit.
export type GuardrailStatus = "ok" | "warning" | "error" | "blocked";
```

## Properties

| Property   | Type                                | Description                                                                                                                            |
| :--------- | :---------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------- |
| `resource` | `GuardrailResource`                 | The name of the resource being tracked, such as `"cost"` or `"tokens"` [Source 1].                                                     |
| `status`   | `GuardrailStatus`                   | The calculated status of the resource based on its usage percentage against the configured warning, error, and blocking thresholds [Source 1]. |
| `current`  | `number`                            | The current accumulated value for the resource (e.g., total cost in USD, total tokens used) [Source 1].                                  |
| `limit`    | `number`                            | The configured maximum value for this resource. Can be `Infinity` if no limit is set [Source 1].                                         |
| `pctUsed`  | `number`                            | The percentage of the limit that has been consumed (`current / limit * 100`) [Source 1].                                               |

## Examples

The `GuardrailDetail` type is not instantiated directly but is consumed as part of the `details` array within a `GuardrailCheckResult`. The following example shows how to inspect these details after performing a check.

```typescript
import { Guardrails, GuardrailCheckResult, CostTracker } from 'yaaf';

// 1. Configure guardrails with specific limits
const guardrails = new Guardrails({
  maxCostUSD: 1.00,
  maxTokensPerSession: 20000,
  warningPct: 80, // Trigger 'warning' status at 80% usage
});

// 2. Assume a CostTracker has accumulated usage over time
const tracker = new CostTracker();
tracker.record({
  costUSD: 0.85, // 85% of the $1.00 limit
  totalTokens: 10000, // 50% of the 20k token limit
  // ... other properties
});

// 3. Perform a check
const checkResult: GuardrailCheckResult = guardrails.check(tracker);

// 4. Iterate over the GuardrailDetail objects in the result
console.log(`Overall Status: ${checkResult.status}`); // "warning"

checkResult.details.forEach(detail => {
  console.log(`\n--- Resource: ${detail.resource} ---`);
  console.log(`  Status: ${detail.status}`);
  console.log(`  Usage: ${detail.current} / ${detail.limit}`);
  console.log(`  Percent Used: ${detail.pctUsed.toFixed(2)}%`);
});

/*
Example Console Output:

Overall Status: warning

--- Resource: cost ---
  Status: warning
  Usage: 0.85 / 1
  Percent Used: 85.00%

--- Resource: tokens ---
  Status: ok
  Usage: 10000 / 20000
  Percent Used: 50.00%
*/
```

## Sources

[Source 1]: src/utils/guardrails.ts