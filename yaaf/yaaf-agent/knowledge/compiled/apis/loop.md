---
title: loop
entity_type: api
summary: Repeats a sequence of steps until a condition is met or maximum iterations are reached.
export_name: loop
source_file: src/agents/workflow.ts
category: function
stub: false
compiled_at: 2026-04-16T14:15:32.633Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/workflow.ts
confidence: 1
---

## Overview
The `loop` function is a declarative orchestration utility used to create iterative multi-agent workflows. It wraps a sequence of steps into a single `WorkflowAgent` that executes those steps repeatedly. 

In each iteration, the provided steps are executed sequentially. The output of the final step in the sequence serves as the input for the first step in the subsequent iteration. This pattern is typically used for refinement cycles, such as an "evaluator-improver" loop, where an agent's output is critiqued and then revised until it meets a specific quality threshold or a maximum number of attempts is reached.

## Signature / Constructor

```typescript
export function loop(
  steps: WorkflowStep[],
  config?: LoopConfig,
): WorkflowAgent
```

### Parameters
*   `steps`: An array of `WorkflowStep` objects (which can be raw `AgentRunner` instances or other nested workflows) to be executed in order during each iteration.
*   `config`: An optional configuration object of type `LoopConfig`.

### LoopConfig
| Property | Type | Description |
| :--- | :--- | :--- |
| `name` | `string` | Optional name for the workflow instance (defaults to 'loop'). |
| `maxIterations` | `number` | Maximum number of iterations before the loop is forced to exit. Defaults to 5 to prevent infinite execution. |
| `shouldExit` | `(result: string, iteration: number) => boolean \| Promise<boolean>` | A predicate function called after each iteration. If it returns `true`, the loop terminates early. |
| `onIteration` | `(result: string, iteration: number) => string` | A hook called after each iteration that can transform the result before it is passed as input to the next iteration. |

## Methods & Properties
The `loop` function returns a `WorkflowAgent` object with the following members:

### Properties
*   `name`: The name of the workflow instance.
*   `type`: Always returns `'loop'`.

### Methods
*   `run(input: string, signal?: AbortSignal): Promise<string>`: Executes the loop logic. It takes an initial input string and returns the final output string from the last iteration performed.

## Examples

### Basic Refinement Loop
This example demonstrates a loop that continues until an evaluator agent includes the word "APPROVED" in its response, or until 5 iterations have passed.

```typescript
const refine = loop([evaluator, improver], {
  maxIterations: 5,
  shouldExit: (result) => result.includes('APPROVED'),
});

const polished = await refine.run('Draft: Initial content for review');
```

### Loop with Iteration Hook
This example uses the `onIteration` hook to format the output between cycles.

```typescript
const iterativeWriter = loop([writer], {
  maxIterations: 3,
  onIteration: (result, i) => `Iteration ${i} result: ${result}`
});
```

## See Also
* `sequential`: A workflow function for running steps in a linear pipeline.
* `parallel`: A workflow function for running steps concurrently.
* `WorkflowAgent`: The interface returned by workflow factory functions.