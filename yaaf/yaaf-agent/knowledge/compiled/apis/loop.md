---
title: loop
entity_type: api
summary: A factory function that creates a workflow agent to repeat a sequence of steps until a condition is met or a maximum number of iterations is reached.
export_name: loop
source_file: src/agents/workflow.ts
category: function
search_terms:
 - repeat agent steps
 - iterative agent workflow
 - how to make an agent loop
 - multi-agent refinement loop
 - workflow agent exit condition
 - max iterations for agent
 - agent self-correction loop
 - run agent multiple times
 - composable agent execution
 - functional agent orchestration
 - evaluator-improver pattern
 - run workflow until condition met
 - cyclical agent graph
stub: false
compiled_at: 2026-04-24T17:19:48.290Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/doctor.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/workflow.ts
compiled_from_quality: unknown
confidence: 0.99
---

## Overview

The `loop` function is a factory for creating a `WorkflowAgent` that executes a sequence of steps repeatedly. It is part of YAAF's functional, composable approach to [Multi-Agent Orchestration](../concepts/multi-agent-orchestration.md), providing an alternative to class-based systems [Source 2].

This [workflow](../concepts/workflow.md) is designed for iterative refinement tasks, such as an "evaluator-improver" pattern. In each iteration, the provided `steps` are executed sequentially. The output of the final step in an iteration becomes the input for the first step of the next iteration [Source 2].

The loop terminates [when](./when.md) one of two conditions is met:
1. The `maxIterations` limit is reached.
2. The `shouldExit` function returns `true`.

The `loop` function is presented as an equivalent to the `LoopAgent` found in other frameworks like ADK [Source 2].

## Signature

The `loop` function takes an array of steps and an optional configuration object, and it returns a `WorkflowAgent` [Source 2].

```typescript
export function loop(
  steps: WorkflowStep[],
  config?: LoopConfig
): WorkflowAgent;
```

### Parameters

*   **`steps: WorkflowStep[]`**: An array of agents or other workflows to execute sequentially on each iteration. A `WorkflowStep` is any object with a compatible `run` method, such as an `AgentRunner` or another `WorkflowAgent` [Source 2].
*   **`config?: LoopConfig`**: An optional configuration object to control the loop's behavior [Source 2].

### Configuration (`LoopConfig`)

The `LoopConfig` object has the following properties:

| Property        | Type                                                              | Description                                                                                                                              |
| --------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `name`          | `string`                                                          | An optional name for the workflow instance, used for debugging and tracing. Defaults to `'loop'` [Source 2].                           |
| `maxIterations` | `number`                                                          | The maximum number of iterations before the loop is forced to exit. This prevents runaway loops. Defaults to `5` [Source 2].             |
| `shouldExit`    | `(result: string, iteration: number) => boolean \| Promise<boolean>` | A function called after each iteration. It receives the output of the last step. If it returns `true`, the loop terminates [Source 2]. |
| `onIteration`   | `(result: string, iteration: number) => string`                   | An optional function called after each iteration. It can transform the result before it is passed as input to the next iteration [Source 2]. |

## Methods & Properties

The `loop` function returns a `WorkflowAgent` object with the following properties and methods [Source 2]:

### Properties

*   **`name: string`**: The name of the workflow, taken from `LoopConfig.name` or defaulting to `'loop'`.
*   **`type: "loop"`**: A read-only property identifying the workflow type.

### Methods

#### `run()`

Executes the loop workflow.

**Signature:**
```typescript
run(input: string, signal?: AbortSignal): Promise<string>
```

**Parameters:**
*   `input: string`: The initial input to the first step of the first iteration.
*   `signal?: AbortSignal`: An optional `AbortSignal` to cancel the execution.

**Returns:** `Promise<string>` — The output from the final iteration of the loop.

## Examples

The following example demonstrates a refinement loop where an `evaluator` agent and an `improver` agent work together. The loop continues for a maximum of 5 iterations or until the `evaluator`'s output includes the word "APPROVED" [Source 2].

```typescript
import { loop } from 'yaaf';
import { evaluator, improver } from './my-agents'; // Assume these are defined AgentRunners

const refineWorkflow = loop([evaluator, improver], {
  name: 'refine-draft',
  maxIterations: 5,
  shouldExit: (result) => result.includes('APPROVED'),
});

const initialDraft = "Draft: AI agents are becoming more capable.";
const polishedResult = await refineWorkflow.run(initialDraft);

console.log(polishedResult);
// Example output might be: "APPROVED. Final Draft: AI agents, powered by advanced LLMs, are demonstrating increasingly sophisticated capabilities in complex problem-solving."
```

## See Also

*   `sequential`: A workflow agent for running steps in a simple sequence.
*   `parallel`: A workflow agent for running steps concurrently.
*   `WorkflowAgent`: The common interface for all [Workflow Agents](../subsystems/workflow-agents.md).
*   `WorkflowStep`: The type representing a single step in a workflow.

## Sources

*   [Source 1] YAAF Doctor documentation
*   [Source 2] `src/agents/workflow.ts`