---
export_name: parallel
source_file: src/agents/workflow.ts
category: function
title: parallel
entity_type: api
summary: A factory function that creates a workflow agent to run multiple agents or workflows concurrently with the same input and merge their results.
search_terms:
 - run agents in parallel
 - concurrent agent execution
 - fan-out agent pattern
 - multi-agent workflow
 - orchestrate multiple agents
 - parallel agent runner
 - combine agent outputs
 - workflow agent composition
 - handle multiple API calls at once
 - error handling for parallel tasks
 - limit concurrency
 - fail-fast vs collect errors
 - ADK ParallelAgent equivalent
stub: false
compiled_at: 2026-04-24T17:25:54.411Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/workflow.ts
compiled_from_quality: unknown
confidence: 0.99
---

## Overview

The `parallel` function is a factory that creates a `WorkflowAgent` for running multiple agents or sub-[workflow](../concepts/workflow.md)s concurrently. This pattern is often called "fan-out/fan-in." All steps in the parallel workflow receive the exact same initial input. They execute simultaneously, and once all have completed, their individual string outputs are collected and merged into a single final string.

This approach is useful for tasks that can be broken down into independent sub-tasks, such as querying multiple data sources, running different analysis [Tools](../subsystems/tools.md) on the same data, or calling several APIs at once.

The `parallel` function is part of YAAF's functional approach to [Multi-Agent Orchestration](../concepts/multi-agent-orchestration.md), providing a lightweight alternative to class-based systems like the `ParallelAgent` found in other frameworks [Source 1].

## Signature / Constructor

The `parallel` function takes an array of `WorkflowStep` objects and an optional configuration object. It returns a `WorkflowAgent`.

```typescript
export function parallel(
  steps: WorkflowStep[],
  config?: ParallelConfig
): WorkflowAgent;
```

### Parameters

-   `steps: WorkflowStep[]`: An array of agents or other [Workflow Agents](../subsystems/workflow-agents.md) to execute in parallel. A `WorkflowStep` is any object with a compatible `run` method.
-   `config?: ParallelConfig`: An optional configuration object to customize the workflow's behavior.

### Configuration (`ParallelConfig`)

The `ParallelConfig` object allows for fine-tuning the parallel execution:

```typescript
export type ParallelConfig = {
  /** Name for this workflow instance (default: 'parallel') */
  name?: string;

  /**
   * Merge results from all parallel steps into a single output.
   * Default: joins with double newlines.
   */
  merge?: (results: string[], inputs: string[]) => string;

  /**
   * Maximum number of concurrent steps. Default: unlimited.
   * Useful if you have rate-limited API keys.
   */
  concurrency?: number;

  /**
   * How to handle individual step failures.
   * - 'fail-fast': abort all on first failure (default)
   * - 'collect': continue running, replace failed results with error messages
   */
  onError?: "fail-fast" | "collect";
};
```

-   `name`: A string identifier for debugging and tracing purposes. Defaults to `'parallel'`.
-   `merge`: A function to combine the array of string results from each step into a single output string. If not provided, it joins the results with `\n\n`.
-   `concurrency`: A number that limits how many steps can run at the same time. This is useful for managing resources or respecting API rate limits. By default, there is no limit.
-   `onError`: Defines the error handling strategy.
    -   `'fail-fast'` (default): If any step throws an error, all other running steps are aborted, and the entire workflow fails.
    -   `'collect'`: The workflow continues even if some steps fail. The results from failed steps are replaced with their error messages in the final merged output.

## Methods & Properties

The `parallel` function returns a `WorkflowAgent` object with the following properties and methods:

### Properties

-   `name: string`: The name of the workflow, taken from `config.name` or defaulting to `'parallel'`.
-   `type: "parallel"`: A read-only property identifying the workflow type.

### Methods

#### `run()`

Executes the parallel workflow.

```typescript
run(input: string, signal?: AbortSignal): Promise<string>;
```

-   **Parameters:**
    -   `input: string`: The input message passed to every step in the workflow.
    -   `signal?: AbortSignal`: An optional `AbortSignal` to cancel the entire workflow execution.
-   **Returns:** `Promise<string>` — A promise that resolves to the final merged string output after all steps have completed.

## Examples

### Basic Fan-Out and Merge

This example demonstrates running three mock agents in parallel to gather data and then combining their outputs with a custom `merge` function.

```typescript
import { parallel } from 'yaaf';
import type { WorkflowStep } from 'yaaf';

// Mock agents for demonstration. In a real app, these would be AgentRunners.
const fetchApiA: WorkflowStep = {
  run: async (query) => `Result from API A for "${query}"`
};
const fetchApiB: WorkflowStep = {
  run: async (query) => `Result from API B for "${query}"`
};
const fetchApiC: WorkflowStep = {
  run: async (query) => `Result from API C for "${query}"`
};

// Create a parallel workflow agent
const dataGatherer = parallel(
  [fetchApiA, fetchApiB, fetchApiC],
  {
    name: 'market-data-gatherer',
    merge: (results) => {
      return `--- Combined Market Data ---\n${results.join('\n---\n')}`;
    },
  }
);

// Run the workflow
async function main() {
  const combinedData = await dataGatherer.run('Q1 financial reports');
  console.log(combinedData);
}

main();

/*
Expected output:
--- Combined Market Data ---
Result from API A for "Q1 financial reports"
---
Result from API B for "Q1 financial reports"
---
Result from API C for "Q1 financial reports"
*/
```

### Handling Errors with `collect`

This example shows how to use the `onError: 'collect'` strategy to allow the workflow to succeed even if one of the steps fails.

```typescript
import { parallel } from 'yaaf';
import type { WorkflowStep } from 'yaaf';

const successfulStep: WorkflowStep = {
  run: async () => `This step succeeded.`
};
const failingStep: WorkflowStep = {
  run: async () => { throw new Error("API call failed!"); }
};

const resilientWorkflow = parallel(
  [successfulStep, failingStep],
  {
    onError: 'collect',
    merge: (results) => `Workflow finished.\nResults:\n- ${results.join('\n- ')}`
  }
);

async function main() {
  const result = await resilientWorkflow.run('start');
  console.log(result);
}

main();

/*
Expected output:
Workflow finished.
Results:
- This step succeeded.
- Error: API call failed!
*/
```

## See Also

-   `sequential`: For running agents in a sequence, where the output of one becomes the input for the next.
-   `loop`: For repeating a sequence of agents until a condition is met.
-   `WorkflowAgent`: The common interface for all workflow agents returned by `parallel`, `sequential`, and `loop`.
-   `WorkflowStep`: The interface that agents must satisfy to be included in a workflow.

## Sources

[Source 1]: src/agents/workflow.ts