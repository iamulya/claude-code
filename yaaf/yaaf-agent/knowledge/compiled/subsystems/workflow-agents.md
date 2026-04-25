---
title: Workflow Agents
entity_type: subsystem
summary: Provides a set of composable functions for orchestrating multiple agents in sequential, parallel, or looping patterns without requiring LLM-based routing.
primary_files:
 - src/agents/workflow.ts
exports:
 - WorkflowAgent
 - WorkflowStep
 - sequential
 - parallel
 - loop
 - asStep
 - transform
 - conditional
search_terms:
 - multi-agent systems
 - agent orchestration
 - sequential agent pipeline
 - parallel agent execution
 - looping agent workflow
 - agent composition
 - how to chain agents together
 - fan-out fan-in pattern
 - state machine for agents
 - ADK SequentialAgent equivalent
 - functional agent composition
 - declarative agent workflows
 - control flow for LLM agents
stub: false
compiled_at: 2026-04-24T18:21:52.120Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/workflow.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Purpose

The [workflow](../concepts/workflow.md) Agents subsystem provides [Tools](./tools.md) for declarative, [Multi-Agent Orchestration](../concepts/multi-agent-orchestration.md) [Source 1]. It enables developers to build complex systems by composing multiple individual agents into predictable execution patterns. The primary goal is to manage control flow between agents without relying on a central, [LLM](../concepts/llm.md)-based router agent, which can be unpredictable and costly [Source 1].

This subsystem offers three main composition patterns: sequential pipelines, parallel fan-out/fan-in, and conditional loops. The design is inspired by similar concepts in frameworks like ADK (e.g., `SequentialAgent`, `ParallelAgent`, `LoopAgent`) but implements them as lightweight, composable functions rather than a heavy class hierarchy. This functional approach aims to make workflows easier to test, compose, and debug [Source 1].

## Architecture

The architecture of Workflow Agents is functional and compositional, centered around two key type definitions: `WorkflowStep` and `WorkflowAgent` [Source 1].

- **`WorkflowStep`**: This is a generic interface for any unit of work that can participate in a workflow. It is defined as any object with an asynchronous `run(input: string, signal?: AbortSignal): Promise<string>` method. Both `AgentRunner` instances and `WorkflowAgent`s satisfy this interface, allowing for nested and complex workflow structures [Source 1].

- **`WorkflowAgent`**: This represents a composed workflow. It is an object that also conforms to the `WorkflowStep` interface, exposing its own `run` method. This allows an entire workflow to be treated as a single agent. Each `WorkflowAgent` has a `name` and a `type` (`sequential`, `parallel`, or `loop`) for debugging and tracing purposes [Source 1].

The core of the subsystem consists of higher-order functions (`sequential`, `parallel`, `loop`) that accept an array of `WorkflowStep` objects and a configuration object, returning a new `WorkflowAgent` that encapsulates the specified logic [Source 1]. Helper functions like `transform` and `conditional` create specialized `WorkflowStep`s for tasks like data formatting or simple routing logic without involving an LLM [Source 1].

## Integration Points

The Workflow Agents subsystem primarily integrates with the core agent runtime. It consumes `AgentRunner` instances, which are the standard execution units for individual agents in YAAF. By wrapping `AgentRunner`s, this subsystem elevates them from individual workers to steps in a larger, coordinated process.

Because a `WorkflowAgent` itself satisfies the `WorkflowStep` interface (which is compatible with the `AgentRunner`'s `run` method), a composed workflow can be used anywhere a single `AgentRunner` is expected. This allows for hierarchical composition, where a complex workflow can be a single step inside another, larger workflow [Source 1].

## Key APIs

The public API surface consists of factory functions that create `WorkflowAgent`s and helper functions for creating custom steps [Source 1].

### Workflow Composition

- **`sequential(steps: WorkflowStep[], config?: SequentialConfig): WorkflowAgent`**
  Creates a pipeline that executes a series of steps in order. The output of each step becomes the input for the next. This is equivalent to ADK's `SequentialAgent` [Source 1].
  ```typescript
  const pipeline = sequential([researcher, writer, reviewer]);
  const result = await pipeline.run('Write an article about AI agents');
  ```

- **`parallel(steps: WorkflowStep[], config?: ParallelConfig): WorkflowAgent`**
  Executes all steps concurrently with the same initial input. After all steps complete (or fail), their results are combined into a single string output. This is equivalent to ADK's `ParallelAgent` [Source 1].
  ```typescript
  const fanOut = parallel([fetchA, fetchB, fetchC], {
    merge: (results) => results.join('\n---\n'),
  });
  const combined = await fanOut.run('Gather market data');
  ```

- **`loop(steps: WorkflowStep[], config?: LoopConfig): WorkflowAgent`**
  Repeatedly executes a sequence of steps until an exit condition is met or a maximum number of iterations is reached. The output of the last step in an iteration becomes the input for the first step of the next iteration. This is equivalent to ADK's `LoopAgent` [Source 1].
  ```typescript
  const refine = loop([evaluator, improver], {
    maxIterations: 5,
    shouldExit: (result) => result.includes('APPROVED'),
  });
  const polished = await refine.run('Draft: ...');
  ```

### Custom Step Creation

- **`transform(fn: (input: string) => string | Promise<string>): WorkflowStep`**
  Creates a simple, stateless step for transforming data between agents without an [LLM Call](../concepts/llm-call.md). This is useful for formatting, prepending instructions, or extracting data [Source 1].
  ```typescript
  const pipeline = sequential([
    researcher,
    transform(output => `Please review this research:\n${output}`),
    reviewer,
  ]);
  ```

- **`conditional(selector: (input: string) => WorkflowStep | Promise<WorkflowStep>): WorkflowStep`**
  Creates a dynamic routing step. The provided selector function receives the input and returns the appropriate `WorkflowStep` to execute next [Source 1].
  ```typescript
  const router = conditional(input => {
    if (input.includes('code')) return codeAgent;
    return generalAgent;
  });
  ```

- **`asStep(runner: AgentRunner): WorkflowStep`**
  A helper function for explicitly marking an `AgentRunner` as a `WorkflowStep`. Since `AgentRunner` already matches the interface, this is primarily for code clarity and intent [Source 1].

## Configuration

Each workflow composition function accepts an optional configuration object to customize its behavior [Source 1].

### `SequentialConfig`
- `name`: A string identifier for the workflow instance, used in tracing. Defaults to `'sequential'`.
- `transform`: A function `(output, stepIndex, stepCount) => string` that can modify the output of a step before it is passed as input to the next.

### `ParallelConfig`
- `name`: A string identifier for the workflow instance. Defaults to `'parallel'`.
- `merge`: A function `(results, inputs) => string` that combines the array of string results from all parallel steps into a single output string. Defaults to joining with double newlines.
- `concurrency`: A number limiting how many steps can run concurrently. Useful for rate-limiting. Defaults to unlimited.
- `onError`: A string determining failure handling. `'fail-fast'` (default) aborts all running steps on the first error. `'collect'` allows other steps to finish and includes error messages in the results array.

### `LoopConfig`
- `name`: A string identifier for the workflow instance. Defaults to `'loop'`.
- `maxIterations`: The maximum number of times the loop can run. Defaults to 5 to prevent infinite loops.
- `shouldExit`: A function `(result, iteration) => boolean | Promise<boolean>` that is checked after each iteration. If it returns `true`, the loop terminates early.
- `onIteration`: A function `(result, iteration) => string` called after each iteration to transform the result before it becomes the next iteration's input.

## Sources
[Source 1] src/agents/workflow.ts