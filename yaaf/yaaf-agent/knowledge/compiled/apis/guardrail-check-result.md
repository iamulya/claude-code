---
export_name: GuardrailCheckResult
source_file: src/utils/guardrails.ts
category: type
summary: Represents the comprehensive result of a Guardrails check, indicating overall status and detailed resource usage.
title: GuardrailCheckResult
entity_type: api
search_terms:
 - guardrail check status
 - agent budget result
 - resource limit check
 - cost tracking status
 - token usage result
 - turn limit check
 - guardrail blocked status
 - check guardrail outcome
 - Guardrails.check return type
 - agent safety check result
 - prevent runaway agent
 - budget exceeded details
stub: false
compiled_at: 2026-04-24T17:10:11.634Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/guardrails.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `GuardrailCheckResult` type is a data structure that encapsulates the outcome of a resource usage check performed by the `Guardrails.check()` method [Source 1]. It provides both a high-level summary of the agent's status relative to its configured budget limits and a detailed breakdown of each monitored resource.

This object is central to implementing safety mechanisms that prevent runaway agent behavior. By inspecting the `status` and `blocked` properties, an application can decide whether to continue execution, issue a warning to the user, or halt the agent completely by throwing an error like `BudgetExceededError` [Source 1].

## Signature

`GuardrailCheckResult` is a type alias for an object with the following structure [Source 1]:

```typescript
export type GuardrailCheckResult = {
  /** The most severe status among all checked resources. */
  status: GuardrailStatus;

  /** A boolean flag indicating if any resource has exceeded its limit. */
  blocked: boolean;

  /** An explanatory message if the status is 'blocked'. */
  reason?: string;

  /** A detailed report for each monitored resource. */
  details: GuardrailDetail[];
};
```

### Properties

*   **`status: GuardrailStatus`**
    The overall status of the check, representing the most severe status found across all monitored resources. `GuardrailStatus` can be one of the following string literals [Source 1]:
    *   `'ok'`: All resources are within safe limits.
    *   `'warning'`: At least one resource has exceeded the `warningPct` threshold.
    *   `'error'`: At least one resource has exceeded the `errorPct` threshold.
    *   `'blocked'`: At least one resource has reached or exceeded 100% of its limit.

*   **`blocked: boolean`**
    A convenience property that is `true` if `status` is `'blocked'`, and `false` otherwise. This is useful for simple conditional checks to halt execution [Source 1].

*   **`reason?: string`**
    An optional human-readable string that explains why the agent was blocked. This is typically present only [when](./when.md) `status` is `'blocked'` [Source 1].

*   **`details: GuardrailDetail[]`**
    An array containing a detailed status report for each individual resource being tracked (e.g., `cost`, `tokens`). Each `GuardrailDetail` object includes the resource name, its specific status, current usage, configured limit, and percentage used [Source 1].

## Examples

The following example demonstrates how to use the `GuardrailCheckResult` object returned by `Guardrails.check()` to control agent execution flow.

```typescript
import { Guardrails, CostTracker, BudgetExceededError, GuardrailCheckResult } from 'yaaf';

// Configure guardrails with limits
const guardrails = new Guardrails({
  maxCostUSD: 1.00,
  maxTurnsPerRun: 10,
  warningPct: 80,
});

const tracker = new CostTracker();

// Simulate some agent activity
tracker.addTurn();
tracker.addTurn();
tracker.addCost(0.85); // This will trigger a warning (85% of $1.00)

// Perform a check and inspect the result
const checkResult: GuardrailCheckResult = guardrails.check(tracker);

if (checkResult.blocked) {
  // This block would run if a hard limit was exceeded
  console.error(`Agent stopped: ${checkResult.reason}`);
  throw new BudgetExceededError(checkResult.reason);
} else if (checkResult.status !== 'ok') {
  // This block runs for 'warning' or 'error' states
  console.warn(`Agent resource status: ${checkResult.status}`);

  // Log the details of the resource(s) that triggered the status
  checkResult.details.forEach(detail => {
    if (detail.status !== 'ok') {
      console.log(
        `-> Resource '${detail.resource}': ${detail.current.toFixed(2)} / ${detail.limit} (${(detail.pctUsed * 100).toFixed(1)}%)`
      );
    }
  });
} else {
  console.log("All resource checks passed. Agent can proceed.");
}

/*
Expected Console Output:

Agent resource status: warning
-> Resource 'cost': 0.85 / 1 (85.0%)
*/
```

## Sources

[Source 1]: src/utils/guardrails.ts