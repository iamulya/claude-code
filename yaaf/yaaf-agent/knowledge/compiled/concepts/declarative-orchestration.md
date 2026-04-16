---
title: Declarative Orchestration
entity_type: concept
summary: A design principle in YAAF that favors functional composition of agents over complex class hierarchies or LLM-based routing for predictable workflows.
related_subsystems:
  - agents/workflow
stub: false
compiled_at: 2026-04-16T14:15:18.481Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/workflow.ts
confidence: 1
---

## What It Is
Declarative Orchestration is a design pattern in YAAF used to build multi-agent systems through functional composition. Unlike frameworks that rely on non-deterministic LLM-based routing or complex class hierarchies, YAAF treats workflows as predictable, composable execution units.

This approach solves the overhead and debugging challenges associated with "heavy" agent architectures. By using lightweight functions to define the relationship between agents, developers can ensure execution flow is deterministic, easier to test, and simpler to trace.

## How It Works in YAAF
In YAAF, orchestration is built around the `WorkflowAgent` and `WorkflowStep` interfaces. A `WorkflowAgent` is an async function that wraps one or more `AgentRunners` into a single execution unit. Because `AgentRunner` implements the `run()` method, it naturally satisfies the `WorkflowStep` interface, allowing raw agents and nested workflows to be composed interchangeably.

The framework provides three primary execution patterns:

### Sequential Pipeline
The `sequential()` function creates a pipeline where agents run in a specific order. The output of one step is automatically passed as the input to the next. This is equivalent to the `SequentialAgent` pattern found in other frameworks but implemented as a functional composition.

### Parallel Fan-out
The `parallel()` function executes multiple steps concurrently using the same initial input. Once all steps complete, their results are combined using a merge function. This pattern is useful for gathering data from multiple sources or performing independent tasks simultaneously.

### Loop with Exit Condition
The `loop()` function repeats a sequence of steps until a specific condition is met or a maximum number of iterations is reached. This is typically used for iterative refinement, where an evaluator agent checks the work of a generator agent.

### Utility Steps
YAAF provides helper functions to handle logic and data transformation within a declarative workflow:
*   **`transform`**: A pass-through step that modifies text (e.g., formatting) without calling an LLM.
*   **`conditional`**: Routes the workflow to different agents based on programmatic logic rather than LLM intent detection.
*   **`asStep`**: Explicitly wraps an `AgentRunner` for use within a workflow.

## Configuration
Workflows are configured through plain TypeScript objects passed to the orchestration functions.

### Sequential Configuration
Developers can provide a `transform` function to modify data between steps in a pipeline.

```ts
const pipeline = sequential([researcher, writer, reviewer], {
  name: 'ArticlePipeline',
  transform: (output, index) => `Step ${index} result: ${output}`
});
```

### Parallel Configuration
Parallel execution supports concurrency limits and error handling strategies (`fail-fast` or `collect`).

```ts
const fanOut = parallel([fetchA, fetchB], {
  concurrency: 2,
  merge: (results) => results.join('\n---\n'),
  onError: 'collect'
});
```

### Loop Configuration
Loops include safety mechanisms such as `maxIterations` to prevent infinite execution.

```ts
const refine = loop([evaluator, improver], {
  maxIterations: 5,
  shouldExit: (result) => result.includes('APPROVED'),
  onIteration: (result, i) => `Iteration ${i}: ${result}`
});
```

## See Also
* [[AgentRunner]]
* [[WorkflowAgent]]
* [[WorkflowStep]]