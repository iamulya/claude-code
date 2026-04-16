---
title: Workflow System
entity_type: subsystem
summary: A logical subsystem for declarative multi-agent orchestration using functional composition of AgentRunners.
primary_files:
  - src/agents/workflow.ts
exports:
  - sequential
  - parallel
  - loop
  - asStep
  - transform
  - conditional
stub: false
compiled_at: 2026-04-16T14:15:16.801Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/workflow.ts
confidence: 1
---

## Purpose
The Workflow System provides a declarative framework for orchestrating multi-agent systems. It is designed to facilitate complex agent interactions—such as pipelines, fan-outs, and iterative refinement—without relying on LLM-based routing. 

By using functional composition, the system allows developers to treat multiple agents as a single execution unit. This approach is intended to be more lightweight and easier to debug than class-heavy orchestration frameworks, providing predictable execution paths for production-grade agentic workflows.

## Architecture
The Workflow System is built on a functional architecture where workflows are async functions that compose `AgentRunner` instances. 

### Core Interfaces
The system relies on two primary type definitions:
*   **WorkflowStep**: An interface representing any unit that can participate in a workflow. It requires a `run(input: string, signal?: AbortSignal): Promise<string>` method. Both raw `AgentRunner` instances and nested `WorkflowAgent` instances satisfy this interface.
*   **WorkflowAgent**: A specialized `WorkflowStep` that includes metadata such as a `name` and a `type` (sequential, parallel, or loop).

### Execution Patterns
The subsystem implements three fundamental orchestration patterns:
1.  **Sequential**: A pipeline where the output of one step becomes the input for the next.
2.  **Parallel**: A fan-out pattern where multiple steps receive the same input concurrently, and their results are merged.
3.  **Loop**: An iterative pattern that repeats a sequence of steps until a specific exit condition is met or a maximum number of iterations is reached.

## Key APIs
The Workflow System exports several factory functions to create orchestrated agents.

### sequential
Creates a pipeline of steps executed in order.
```typescript
const pipeline = sequential([researcher, writer, reviewer]);
const result = await pipeline.run('Write an article about AI agents');
```

### parallel
Executes multiple steps concurrently and merges the results. It supports concurrency limits and error handling strategies (`fail-fast` or `collect`).
```typescript
const fanOut = parallel([fetchA, fetchB, fetchC], {
  merge: (results) => results.join('\n---\n'),
});
```

### loop
Repeats a sequence of steps. It requires a `maxIterations` setting to prevent infinite loops and supports an optional `shouldExit` predicate.
```typescript
const refine = loop([evaluator, improver], {
  maxIterations: 5,
  shouldExit: (result) => result.includes('APPROVED'),
});
```

### Utility Functions
*   **transform(fn)**: Creates a non-LLM step that modifies data between agents (e.g., formatting strings).
*   **conditional(selector)**: Routes the workflow to different agents based on the input string at runtime.
*   **asStep(runner)**: Explicitly wraps an `AgentRunner` as a `WorkflowStep`.

## Configuration
Each workflow factory accepts a configuration object to fine-tune execution behavior.

### SequentialConfig
*   `name`: Identifier for the workflow.
*   `transform`: A function to modify the output of step $N$ before it reaches step $N+1$.

### ParallelConfig
*   `merge`: Defines how to combine multiple string outputs into one. Defaults to double-newline separation.
*   `concurrency`: Limits the number of simultaneous executions.
*   `onError`: Determines if the workflow should `fail-fast` (abort on first error) or `collect` (continue and return error messages in the result set).

### LoopConfig
*   `maxIterations`: Maximum number of cycles (default: 5).
*   `shouldExit`: A predicate function to terminate the loop early based on the last step's output.
*   `onIteration`: A hook to transform results between iterations.

## Extension Points
The system is extended primarily through functional composition:
*   **Custom Steps**: Developers can implement the `WorkflowStep` interface to integrate custom logic or third-party services into a workflow.
*   **Functional Transforms**: The `transform` helper allows for arbitrary data manipulation between LLM calls.
*   **Dynamic Routing**: The `conditional` helper allows for the implementation of custom routing logic that selects the next `WorkflowStep` based on runtime data.