---
export_name: WorkflowAgent
source_file: src/agents/workflow.ts
category: type
title: WorkflowAgent
entity_type: api
summary: A type representing a composable execution unit that orchestrates one or more agents in a declarative workflow.
search_terms:
 - multi-agent orchestration
 - agent composition
 - sequential agent pipeline
 - parallel agent execution
 - looping agent workflow
 - how to chain agents together
 - fan-out fan-in pattern
 - agent routing
 - conditional agent logic
 - functional agent composition
 - run agents in a sequence
 - run multiple agents at once
 - agent workflow patterns
 - state machine for agents
stub: false
compiled_at: 2026-04-24T17:49:43.227Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/workflow.ts
compiled_from_quality: unknown
confidence: 0.99
---

## Overview

`WorkflowAgent` is a type that represents a declarative, [Multi-Agent Orchestration](../concepts/multi-agent-orchestration.md) unit [Source 1]. It provides a way to compose multiple agents or other [workflow](../concepts/workflow.md)s into a single, runnable entity without relying on a central [LLM](../concepts/llm.md) for routing. This approach allows for building complex, predictable [Multi-Agent Systems](../concepts/multi-agent-systems.md).

YAAF implements workflows as lightweight, composable asynchronous functions that return a `WorkflowAgent`. This functional approach is designed to be easier to test, compose, and debug compared to class-based hierarchies found in other frameworks [Source 1].

The primary patterns for creating a `WorkflowAgent` are:
*   **Sequential**: Runs agents in a series, with the output of one feeding into the next.
*   **Parallel**: Runs multiple agents concurrently with the same input and merges their results.
*   **Loop**: Repeats a sequence of agents until an exit condition is met or a maximum number of iterations is reached.

A `WorkflowAgent` exposes the same `run()` interface as a standard `AgentRunner`, allowing workflows to be nested within other workflows seamlessly [Source 1].

## Signature

The `WorkflowAgent` is a TypeScript type alias, not a class. Instances are created using factory functions like `sequential`, `parallel`, and `loop`.

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

Workflows are composed of steps, which can be any object that conforms to the `WorkflowStep` interface. This includes `AgentRunner` instances and other `WorkflowAgent`s [Source 1].

```typescript
export type WorkflowStep = {
  run(input: string, signal?: AbortSignal): Promise<string>;
};
```

## Properties

A `WorkflowAgent` object has the following read-only properties:

| Property | Type                               | Description                                    |
| :------- | :--------------------------------- | :--------------------------------------------- |
| `name`   | `string`                           | The name of the workflow for tracing and debugging. |
| `type`   | `"sequential" \| "parallel" \| "loop"` | The execution pattern of the workflow.         |

## Methods

A `WorkflowAgent` object has a single method:

### run()

Executes the workflow with a given input.

**Signature**
```typescript
run(input: string, signal?: AbortSignal): Promise<string>
```

**Parameters**
*   `input` (`string`): The initial input message to start the workflow.
*   `signal` (`AbortSignal`, optional): An `AbortSignal` to cancel the workflow execution.

**Returns**
*   `Promise<string>`: A promise that resolves to the final string output of the workflow.

## Examples

### Sequential Pipeline

This example runs a `researcher`, `writer`, and `reviewer` agent in order. The output from the researcher is passed to the writer, and the writer's output is passed to the reviewer [Source 1].

```typescript
import { sequential } from 'yaaf';
// Assume researcher, writer, and reviewer are defined AgentRunners
const pipeline = sequential([researcher, writer, reviewer]);
const result = await pipeline.run('Write an article about AI agents');
```

### Parallel Fan-out

This example runs three data-fetching agents concurrently with the same input. The results are then combined into a single string using a custom `merge` function [Source 1].

```typescript
import { parallel } from 'yaaf';
// Assume fetchA, fetchB, and fetchC are defined AgentRunners
const fanOut = parallel([fetchA, fetchB, fetchC], {
  merge: (results) => results.join('\n---\n'),
});
const combined = await fanOut.run('Gather market data');
```

### Loop with Exit Condition

This example creates a refinement loop with an `evaluator` and an `improver`. The loop runs for a maximum of 5 iterations but will exit early if the `evaluator`'s output includes the word "APPROVED" [Source 1].

```typescript
import { loop } from 'yaaf';
// Assume evaluator and improver are defined AgentRunners
const refine = loop([evaluator, improver], {
  maxIterations: 5,
  shouldExit: (result) => result.includes('APPROVED'),
});
const polished = await refine.run('Draft: ...');
```

## Sources

[Source 1]: src/agents/workflow.ts