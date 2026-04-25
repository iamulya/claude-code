---
export_name: LoopConfig
source_file: src/agents/workflow.ts
category: type
title: LoopConfig
entity_type: api
summary: Configuration options for the `loop` workflow agent, controlling its execution behavior.
search_terms:
 - loop agent configuration
 - workflow loop settings
 - how to stop a loop agent
 - max iterations for agent
 - exit condition for workflow
 - iterative agent refinement
 - agent loop control
 - repeating agent steps
 - yaaf loop function
 - workflow agent iteration
 - shouldExit property
 - onIteration hook
stub: false
compiled_at: 2026-04-24T17:19:40.750Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/workflow.ts
compiled_from_quality: unknown
confidence: 0.99
---

## Overview

`LoopConfig` is a TypeScript type that defines the configuration options for a `loop` [workflow](../concepts/workflow.md) agent. It allows for fine-grained control over the iterative execution of a sequence of agent steps.

This configuration is used to set limits on the number of iterations to prevent infinite loops, define custom logic for [when](./when.md) the loop should terminate, and transform data between iterations. It is passed as the second argument to the `loop` factory function.

## Signature

`LoopConfig` is a type alias for an object with the following properties:

```typescript
export type LoopConfig = {
  /** Name for this workflow instance (default: 'loop') */
  name?: string;

  /**
   * Maximum iterations before forced exit.
   * Default: 5 (prevents runaway loops).
   */
  maxIterations?: number;

  /**
   * Condition to exit the loop early.
   * Receives the output of the last step in each iteration.
   * Return `true` to exit (agent is done).
   * Default: never exits early (runs all iterations).
   */
  shouldExit?: (result: string, iteration: number) => boolean | Promise<boolean>;

  /**
   * Called after each iteration, before the next one starts.
   * Can transform the result before it becomes the next iteration's input.
   */
  onIteration?: (result: string, iteration: number) => string;
};
```

### Properties

- **`name`** (optional, `string`): A name for the workflow instance, used for debugging and tracing. Defaults to `'loop'`.
- **`maxIterations`** (optional, `number`): The maximum number of times the loop will execute. This is a safeguard to prevent runaway processes. Defaults to `5`.
- **`shouldExit`** (optional, `(result: string, iteration: number) => boolean | Promise<boolean>`): A function that is called after each iteration. It receives the final output of the iteration and the current iteration number. If it returns `true`, the loop terminates. By default, this condition is never met, and the loop runs until `maxIterations` is reached.
- **`onIteration`** (optional, `(result: string, iteration: number) => string`): A function called after each iteration completes but before the next one begins. It can be used to transform the output of the current iteration before it is passed as the input to the next iteration.

## Examples

The following example demonstrates creating a `loop` workflow that uses an `evaluator` and an `improver` agent. The loop is configured to run a maximum of 5 times and to exit early if the output from the `improver` agent includes the string "APPROVED".

```typescript
import { loop } from 'yaaf';
import type { WorkflowStep, LoopConfig } from 'yaaf';

// Assume 'evaluator' and 'improver' are existing agent steps (WorkflowStep)
declare const evaluator: WorkflowStep;
declare const improver: WorkflowStep;

// Configuration for the loop
const refineConfig: LoopConfig = {
  maxIterations: 5,
  shouldExit: (result: string) => result.includes('APPROVED'),
};

// Create the looping workflow agent
const refineAgent = loop([evaluator, improver], refineConfig);

// Run the agent with an initial draft
async function runRefinement() {
  const initialDraft = "Draft: An article about AI agents...";
  const polishedResult = await refineAgent.run(initialDraft);
  console.log(polishedResult);
}
```

## See Also

- `loop`: The factory function that creates a looping workflow agent and uses this configuration type.
- `WorkflowAgent`: The common interface for all [Workflow Agents](../subsystems/workflow-agents.md), including those created by `loop`.
- `sequential`: A related workflow for running agents in a linear sequence.
- `parallel`: A related workflow for running agents concurrently.

## Sources

[Source 1]: src/agents/workflow.ts