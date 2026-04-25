---
export_name: sequential
source_file: src/agents/workflow.ts
category: function
title: sequential
entity_type: api
summary: Creates a workflow agent that runs a series of steps in order, passing the output of each step as the input to the next.
search_terms:
 - sequential agent
 - pipeline agent
 - chaining agents together
 - run agents in order
 - workflow orchestration
 - multi-agent systems
 - declarative agent composition
 - agent pipeline
 - connect agent outputs to inputs
 - ADK SequentialAgent equivalent
 - functional agent composition
 - how to run multiple agents
 - linear agent workflow
stub: false
compiled_at: 2026-04-24T17:36:49.796Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/workflow.ts
compiled_from_quality: unknown
confidence: 0.99
---

## Overview

The `sequential` function is a factory for creating a "sequential pipeline" [workflow](../concepts/workflow.md) agent. This type of agent executes a series of steps (other agents or workflows) in a predefined order. The output from each step is passed directly as the input to the subsequent step, forming a chain of operations [Source 1].

This functional approach is part of YAAF's declarative multi-[Agent Orchestration System](../subsystems/agent-orchestration-system.md). It allows developers to compose complex behaviors from simpler, single-purpose agents without needing [LLM](../concepts/llm.md)-based routing. It is the YAAF equivalent of ADK's class-based `SequentialAgent` [Source 1].

Use `sequential` to build linear processes, such as a research, writing, and reviewing pipeline, where each stage depends on the completion of the previous one [Source 1].

## Signature

The `sequential` function takes an array of steps and an optional configuration object, and returns a `WorkflowAgent` [Source 1].

```typescript
export function sequential(
  steps: WorkflowStep[],
  config?: SequentialConfig
): WorkflowAgent;
```

### Parameters

-   **`steps`**: `WorkflowStep[]`
    An array of agents or other workflows to execute in order. A `WorkflowStep` is any object with a compatible `run` method [Source 1].
    ```typescript
    export type WorkflowStep = {
      run(input: string, signal?: AbortSignal): Promise<string>;
    };
    ```

-   **`config`**: `SequentialConfig` (optional)
    An object to configure the pipeline's behavior [Source 1].
    ```typescript
    export type SequentialConfig = {
      /** Name for this workflow instance (default: 'sequential') */
      name?: string;
      /**
       * Transform the output of step N before passing to step N+1.
       * Default: passes output directly as the next input.
       */
      transform?: (output: string, stepIndex: number, stepCount: number) => string;
    };
    ```

### Return Value

The function returns a `WorkflowAgent`, an object that encapsulates the entire sequential pipeline and exposes a single `run` method to execute it [Source 1].

```typescript
export type WorkflowAgent = {
  /** Name of this workflow (for debugging/tracing) */
  readonly name: string;
  /** The workflow type */
  readonly type: "sequential" | "parallel" | "loop";
  /** Run the workflow with a user message */
  run(input: string, signal?: AbortSignal): Promise<string>;
};
```

## Methods & Properties

The `WorkflowAgent` object returned by `sequential` has the following properties and methods:

### Properties

-   **`name`**: `readonly string`
    The name of the workflow instance, taken from `config.name` or defaulting to `'sequential'`. Useful for debugging and tracing [Source 1].

-   **`type`**: `readonly "sequential"`
    Identifies the type of workflow, which is always `"sequential"` for agents created by this function [Source 1].

### Methods

-   **`run(input: string, signal?: AbortSignal): Promise<string>`**
    Executes the sequential pipeline. The `input` string is passed to the first step in the `steps` array. The method awaits the completion of the entire pipeline and returns the final output from the last step as a `Promise<string>` [Source 1].

## Examples

### Basic Sequential Pipeline

This example demonstrates creating a simple three-step pipeline where a researcher agent's output is fed to a writer, whose output is then fed to a reviewer [Source 1].

```typescript
import { sequential } from 'yaaf';
import { researcher, writer, reviewer } from './my-agents';

// Define the pipeline by providing the agents in execution order.
const pipeline = sequential([researcher, writer, reviewer]);

// Run the entire pipeline with a single call.
const result = await pipeline.run('Write an article about AI agents');

// `result` contains the final output from the `reviewer` agent.
console.log(result);
```

### Pipeline with a Transform Step

This example shows how to use the `transform` utility to create a simple, LLM-free step that formats data between two agents in a pipeline [Source 1].

```typescript
import { sequential, transform } from 'yaaf';
import { researcher, reviewer } from './my-agents';

const pipeline = sequential([
  researcher,
  // This step adds a prefix to the researcher's output
  // before passing it to the reviewer.
  transform(output => `Please review this research:\n${output}`),
  reviewer,
]);

const finalReport = await pipeline.run('Summarize the latest trends in AI');
console.log(finalReport);
```

## See Also

-   `parallel`: For running multiple agents concurrently with the same input.
-   `loop`: For repeating a sequence of steps until a condition is met.
-   `WorkflowAgent`: The common interface for all [Workflow Agents](../subsystems/workflow-agents.md).
-   `WorkflowStep`: The type for any component that can be part of a workflow.

## Sources

[Source 1]: src/agents/workflow.ts