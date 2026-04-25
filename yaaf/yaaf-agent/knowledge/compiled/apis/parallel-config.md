---
export_name: ParallelConfig
source_file: src/agents/workflow.ts
category: type
title: ParallelConfig
entity_type: api
summary: Configuration options for the `parallel` workflow agent, controlling concurrency, error handling, and result merging.
search_terms:
 - parallel agent configuration
 - fan-out workflow settings
 - how to merge parallel results
 - limit concurrent agents
 - parallel execution error handling
 - fail-fast vs collect errors
 - workflow concurrency limit
 - parallel function options
 - combine agent outputs
 - run multiple agents at once
 - workflow agent settings
 - parallel merge function
stub: false
compiled_at: 2026-04-24T17:25:58.967Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/workflow.ts
compiled_from_quality: unknown
confidence: 0.99
---

## Overview

`ParallelConfig` is a TypeScript type that defines the configuration options for a parallel [workflow](../concepts/workflow.md) created with the `parallel` function. It allows for customization of the workflow's name, how results from concurrent steps are combined, the maximum number of steps to run simultaneously, and the strategy for handling errors in individual steps [Source 1].

This configuration object is passed as the optional second argument to the `parallel` function. It provides fine-grained control over the fan-out/fan-in execution pattern [Source 1].

## Signature

`ParallelConfig` is a type alias for an object with the following properties:

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

### Properties

*   **`name`** `string` (optional)
    A name for the workflow instance, used for debugging and tracing. Defaults to `'parallel'` if not provided [Source 1].

*   **`merge`** `(results: string[], inputs: string[]) => string` (optional)
    A function that takes an array of string results from all completed steps and merges them into a single output string. The `inputs` array contains the original input string passed to each step (which is the same for all steps in a parallel workflow). If not provided, the default behavior is to join the results with double newlines (`\n\n`) [Source 1].

*   **`concurrency`** `number` (optional)
    An integer specifying the maximum number of workflow steps to execute concurrently. This is useful for managing resources or respecting API rate limits. If not specified, there is no limit, and all steps will run in parallel [Source 1].

*   **`onError`** `'fail-fast' | 'collect'` (optional)
    Defines the error handling strategy [when](./when.md) a step fails.
    *   `'fail-fast'` (default): If any step throws an error, all other running and pending steps are aborted, and the entire workflow fails immediately [Source 1].
    *   `'collect'`: If a step fails, the workflow continues executing the other steps. The result for the failed step is replaced with an error message, and these are passed to the `merge` function along with successful results [Source 1].

## Examples

### Custom Merging and Concurrency Limit

This example creates a parallel workflow that runs three agents, but with a concurrency limit of two. It also provides a custom `merge` function to format the final output.

```typescript
import { parallel } from 'yaaf';
import type { WorkflowStep } from 'yaaf';

// Assume agentA, agentB, and agentC are defined WorkflowSteps
declare const agentA: WorkflowStep;
declare const agentB: WorkflowStep;
declare const agentC: WorkflowStep;

const fanOut = parallel(
  [agentA, agentB, agentC],
  {
    name: 'market-data-collector',
    concurrency: 2, // Only run two agents at a time
    merge: (results) => {
      const formattedResults = results.map((res, i) => `Source ${i + 1}:\n${res}`);
      return `--- Market Data Report ---\n\n${formattedResults.join('\n\n')}`;
    },
  }
);

async function run() {
  const combinedData = await fanOut.run('Fetch latest market data for Q3');
  console.log(combinedData);
}
```

### Collecting Errors Instead of Failing

This example demonstrates the `onError: 'collect'` strategy. Even if `flakyAgent` fails, `stableAgent` will complete, and the workflow will produce a result containing the success message and the error message.

```typescript
import { parallel } from 'yaaf';
import type { WorkflowStep } from 'yaaf';

// Assume these agents are defined
declare const stableAgent: WorkflowStep;
declare const flakyAgent: WorkflowStep; // This agent might throw an error

const robustFanOut = parallel(
  [stableAgent, flakyAgent],
  {
    name: 'robust-analysis',
    onError: 'collect',
    merge: (results) => {
      // The result for flakyAgent might be an error message.
      return `Analysis Results:\n\n${results.join('\n\n')}`;
    }
  }
);

async function run() {
  const result = await robustFanOut.run('Analyze customer feedback');
  // If flakyAgent failed, the output might look like:
  // "Analysis Results:
  //
  // Positive sentiment detected.
  //
  // Error in step 'flakyAgent': API connection timed out."
  console.log(result);
}
```

## See Also

*   `parallel` function: The factory function that uses `ParallelConfig` to create a parallel workflow agent.

## Sources

[Source 1] `src/agents/workflow.ts`