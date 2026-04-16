---
title: WorkflowAgent
entity_type: api
summary: A composable execution unit that wraps one or more AgentRunners and exposes a standard run interface.
export_name: WorkflowAgent
source_file: src/agents/workflow.ts
category: type
stub: false
compiled_at: 2026-04-16T14:15:22.877Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/workflow.ts
confidence: 1
---

## Overview
`WorkflowAgent` is a core type in YAAF used for declarative multi-agent orchestration. It represents a composable execution unit that wraps one or more `AgentRunners` (or other workflows) into a single interface. 

Unlike frameworks that use heavy class hierarchies for orchestration, YAAF implements workflow agents as lightweight functional units. This approach is designed to make multi-agent systems easier to test, compose, and debug. Workflows allow developers to define execution patterns—such as sequential pipelines, parallel fan-outs, and loops—without relying on LLM-based routing.

## Signature / Constructor

```typescript
export type WorkflowAgent = {
  /** Name of this workflow (for debugging/tracing) */
  readonly name: string
  /** The workflow type */
  readonly type: 'sequential' | 'parallel' | 'loop'
  /** Run the workflow with a user message */
  run(input: string, signal?: AbortSignal): Promise<string>
}
```

### Related Types
*   **WorkflowStep**: An interface representing anything that can participate in a workflow. It must implement a `run(input: string, signal?: AbortSignal): Promise<string>` method. Both raw `AgentRunners` and nested `WorkflowAgents` satisfy this interface.

## Methods & Properties

### Properties
| Property | Type | Description |
| :--- | :--- | :--- |
| `name` | `string` | A readonly string used for debugging and tracing the workflow execution. |
| `type` | `'sequential' \| 'parallel' \| 'loop'` | A readonly string identifying the orchestration pattern used by the agent. |

### Methods
| Method | Signature | Description |
| :--- | :--- | :--- |
| `run` | `(input: string, signal?: AbortSignal) => Promise<string>` | Executes the workflow logic using the provided input string. Supports an optional `AbortSignal` for cancellation. |

## Examples

### Sequential Pipeline
In a sequential workflow, steps run in order, with each step receiving the output of the previous step as its input.

```typescript
import { sequential } from './src/agents/workflow';

const pipeline = sequential([researcher, writer, reviewer]);
const result = await pipeline.run('Write an article about AI agents');
// researcher runs first → output feeds into writer → writer output into reviewer
```

### Parallel Fan-out
A parallel workflow runs all steps concurrently with the same initial input and merges their results.

```typescript
import { parallel } from './src/agents/workflow';

const fanOut = parallel([fetchA, fetchB, fetchC], {
  merge: (results) => results.join('\n---\n'),
});
const combined = await fanOut.run('Gather market data');
```

### Loop with Exit Condition
A loop workflow repeats a sequence of steps until a specific condition is met or a maximum number of iterations is reached.

```typescript
import { loop } from './src/agents/workflow';

const refine = loop([evaluator, improver], {
  maxIterations: 5,
  shouldExit: (result) => result.includes('APPROVED'),
});
const polished = await refine.run('Draft: ...');
```

### Data Transformation
The `transform` helper allows inserting non-LLM logic between agents in a workflow.

```typescript
import { sequential, transform } from './src/agents/workflow';

const pipeline = sequential([
  researcher,
  transform(output => `Please review this research:\n${output}`),
  reviewer,
]);
```

## See Also
* `sequential`: Function to create a sequential `WorkflowAgent`.
* `parallel`: Function to create a parallel `WorkflowAgent`.
* `loop`: Function to create a looping `WorkflowAgent`.
* `conditional`: Helper for routing logic within workflows.