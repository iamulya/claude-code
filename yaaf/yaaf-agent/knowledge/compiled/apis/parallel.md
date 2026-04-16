---
title: parallel
entity_type: api
summary: Executes multiple agents concurrently on the same input and merges their results.
export_name: parallel
source_file: src/agents/workflow.ts
category: function
stub: false
compiled_at: 2026-04-16T14:15:31.547Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/workflow.ts
confidence: 1
---

## Overview
The `parallel` function is a workflow orchestrator that implements a "fan-out" execution pattern. It accepts an array of agents (or other workflow steps) and executes them concurrently using the same initial input string. Once all steps complete, their individual outputs are aggregated into a single string result based on a configurable merge strategy.

This function is designed as a lightweight, functional alternative to class-based orchestration found in other frameworks. It is typically used for tasks such as gathering data from multiple sources simultaneously, generating multiple variations of content, or performing independent validations in parallel.

## Signature / Constructor

```typescript
export function parallel(
  steps: WorkflowStep[],
  config?: ParallelConfig,
): WorkflowAgent;
```

### Parameters
*   `steps`: An array of `WorkflowStep` objects (which can be raw AgentRunners or nested workflows).
*   `config`: An optional `ParallelConfig` object to customize execution behavior.

### Configuration Types

#### ParallelConfig
| Property | Type | Description |
| :--- | :--- | :--- |
| `name` | `string` | Name for the workflow instance (default: `'parallel'`). |
| `merge` | `(results: string[], inputs: string[]) => string` | Function to combine results. Default joins results with double newlines (`\n\n`). |
| `concurrency` | `number` | Maximum number of concurrent steps. Default is unlimited. |
| `onError` | `'fail-fast' \| 'collect'` | Error handling strategy. `'fail-fast'` (default) aborts all steps on the first error. `'collect'` continues execution and replaces failed results with error messages. |

#### WorkflowStep
An interface representing any object with a `run` method:
```typescript
export type WorkflowStep = {
  run(input: string, signal?: AbortSignal): Promise<string>;
};
```

## Methods & Properties
The `parallel` function returns a `WorkflowAgent` object with the following members:

| Member | Type | Description |
| :--- | :--- | :--- |
| `name` | `string` | The name of the workflow instance. |
| `type` | `'parallel'` | The constant workflow type identifier. |
| `run()` | `(input: string, signal?: AbortSignal) => Promise<string>` | Executes the parallel workflow. |

## Examples

### Basic Fan-out
This example demonstrates gathering data from three different sources concurrently and merging the results with a custom separator.

```typescript
const fanOut = parallel([fetchA, fetchB, fetchC], {
  name: 'MarketDataGatherer',
  merge: (results) => results.join('\n---\n'),
});

const combined = await fanOut.run('Gather market data for AAPL');
```

### Controlled Concurrency
Using the `concurrency` and `onError` options to manage rate limits and partial failures.

```typescript
const safeParallel = parallel([task1, task2, task3, task4], {
  concurrency: 2,
  onError: 'collect',
});

const result = await safeParallel.run('Process batch');
```

## See Also
* `sequential`: For running agents in a pipeline where output feeds into the next input.
* `loop`: For repeating agent execution until a condition is met.
* `asStep`: For wrapping standard runners into workflow-compatible steps.