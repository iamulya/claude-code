---
export_name: GuardrailStatus
source_file: src/utils/guardrails.ts
category: type
summary: An enum-like type representing the current status of a guardrail check (ok, warning, error, blocked).
title: GuardrailStatus
entity_type: api
search_terms:
 - guardrail state
 - budget check status
 - resource limit state
 - agent safety check result
 - ok status
 - warning status
 - error status
 - blocked status
 - cost limit check
 - token limit check
 - turn limit check
 - guardrail check result type
stub: false
compiled_at: 2026-04-24T17:10:42.762Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/guardrails.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`GuardrailStatus` is a string literal type that represents the outcome of a resource usage check performed by the `Guardrails` class [Source 1]. It indicates how close the current resource consumption is to the configured limits.

This type is a key component of the `GuardrailCheckResult` and `GuardrailDetail` types, providing a clear, tiered status for both the overall check and for individual monitored resources [Source 1]. The status levels allow an agent to react differently based on the severity of resource usage, from logging a simple warning to halting execution entirely.

The four possible statuses are [Source 1]:
*   `ok`: Resource usage is well within the configured limits.
*   `warning`: Usage has passed the `warningPct` threshold (e.g., 80%), indicating that limits are being approached.
*   `error`: Usage has passed the `errorPct` threshold (e.g., 95%), indicating a critical level of consumption.
*   `blocked`: A hard limit has been exceeded, and the agent's operation should be stopped to prevent further resource consumption.

## Signature

`GuardrailStatus` is defined as a union of four string literals [Source 1].

```typescript
export type GuardrailStatus = "ok" | "warning" | "error" | "blocked";
```

## Examples

The primary use of `GuardrailStatus` is to interpret the result of a check from a `Guardrails` instance. A `switch` statement can be used to handle the different potential outcomes.

```typescript
import { Guardrails, GuardrailCheckResult, GuardrailStatus, CostTracker } from 'yaaf';

// Assume guardrails and tracker are initialized
const guardrails = new Guardrails({
  maxTokensPerSession: 10000,
  warningPct: 80,
  errorPct: 95,
});
const tracker = new CostTracker();

// In a real scenario, the tracker would be updated with model usage.
// For this example, we'll manually set it to simulate a warning state.
tracker.add({
  model: 'gpt-4',
  usage: { total_tokens: 8500, prompt_tokens: 8000, completion_tokens: 500 },
  cost: 0,
});


const check: GuardrailCheckResult = guardrails.check(tracker);

// The overall status reflects the most severe status of any single resource.
switch (check.status) {
  case 'ok':
    console.log('All resource usage is within normal limits.');
    break;
  case 'warning':
    console.warn('Resource usage is approaching limits.', check.details);
    // Example output: Resource usage is approaching limits. [{ resource: 'tokens', status: 'warning', ... }]
    break;
  case 'error':
    console.error('Resource usage is critically high.', check.details);
    break;
  case 'blocked':
    console.error(`Agent blocked: ${check.reason}`);
    // Terminate the agent's operation
    break;
}
```

## See Also

*   `Guardrails`: The class that performs checks and produces results containing a `GuardrailStatus`.
*   `GuardrailCheckResult`: The return type of `guardrails.check()`, which includes an overall `GuardrailStatus`.
*   `GuardrailDetail`: An object describing the status of a single monitored resource, which also contains a `GuardrailStatus`.
*   `GuardrailResource`: The type defining the resources that can be monitored (e.g., "cost", "tokens").

## Sources

[Source 1]: src/utils/guardrails.ts