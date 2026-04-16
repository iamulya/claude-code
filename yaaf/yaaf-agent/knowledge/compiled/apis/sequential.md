---
title: sequential
entity_type: api
summary: Creates a sequential pipeline where agents run in order, passing output to the next step.
export_name: sequential
source_file: src/agents/workflow.ts
category: function
stub: false
compiled_at: 2026-04-16T14:15:26.701Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/workflow.ts
confidence: 1
---

## Overview
The `sequential` function is a declarative orchestration utility used to build multi-agent pipelines. It wraps one or more agents (or other workflows) into a single execution unit where each step is executed in order. The output of one step is automatically passed as the input to the subsequent step.

This functional approach is designed as a lightweight alternative to class-heavy orchestration patterns. It allows for the composition of complex logic by nesting sequential, parallel, and loop workflows.

## Signature / Constructor

```typescript
export function sequential(
  steps: WorkflowStep[],
  config?: SequentialConfig,
): WorkflowAgent;
```

### Parameters
*   `steps`: An array of `WorkflowStep` objects (which can be raw `AgentRunner` instances or other `WorkflowAgent` objects).
*   `config`: An optional `SequentialConfig` object to customize the workflow behavior.

### Supporting Types

#### SequentialConfig
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

#### WorkflowStep
A `WorkflowStep` is any object implementing a `run` method. Both `AgentRunner` and `WorkflowAgent` satisfy this interface.
```typescript
export type WorkflowStep = {
  run(input: string, signal?: AbortSignal): Promise<string>;
};
```

#### WorkflowAgent
The object returned by the `sequential` function.
```typescript
export type WorkflowAgent = {
  readonly name: string;
  readonly type: 'sequential' | 'parallel' | 'loop';
  run(input: string, signal?: AbortSignal): Promise<string>;
};
```

## Methods & Properties
The `WorkflowAgent` returned by `sequential` exposes the following:

*   **`name`**: A readonly string identifying the workflow instance, useful for debugging and tracing.
*   **`type`**: Always returns `'sequential'`.
*   **`run(input, signal?)`**: An asynchronous method that executes the pipeline. It iterates through the provided steps, passing the result of each step to the next. It supports an optional `AbortSignal` for cancellation.

## Examples

### Basic Sequential Pipeline
In this example, a researcher gathers information, which is then passed to a writer, and finally to a reviewer.
```typescript
const pipeline = sequential([researcher, writer, reviewer]);

const result = await pipeline.run('Write an article about AI agents');
// researcher runs first → output feeds into writer → writer output into reviewer
```

### Pipeline with Transformation
Using the `transform` configuration to modify data between steps.
```typescript
const pipeline = sequential(
  [researcher, writer],
  {
    name: 'ResearchAndWrite',
    transform: (output, index) => {
      if (index === 0) {
        return `Based on this research: ${output}, write a blog post.`;
      }
      return output;
    }
  }
);
```

## See Also
*   `parallel`
*   `loop`
*   `asStep`
*   `transform`
*   `conditional`