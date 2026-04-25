---
title: Loop Agent
entity_type: concept
summary: A workflow pattern that repeatedly executes a sequence of agents until a condition is met or a maximum number of iterations is reached.
see_also:
 - concept:Sequential Agent
 - concept:Parallel Agent
search_terms:
 - iterative agent execution
 - agent loop until condition
 - how to make an agent repeat a task
 - refinement loop agent
 - YAAF workflow agents
 - max iterations for agent
 - exit condition for agent loop
 - ADK LoopAgent equivalent
 - evaluator-improver pattern
 - repeating agent sequence
 - agent self-correction loop
 - cyclical agent workflow
stub: false
compiled_at: 2026-04-24T17:58:20.616Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/workflow.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

A Loop Agent is a declarative [Multi-Agent Orchestration](./multi-agent-orchestration.md) pattern in YAAF used for tasks that require iterative refinement [Source 1]. It is one of three primary [workflow](./workflow.md) patterns, alongside the Sequential Agent and Parallel Agent, that allow for building complex agent behaviors without relying on an [LLM](./llm.md) for routing [Source 1].

The core purpose of a Loop Agent is to repeatedly execute a sequence of steps, such as an "evaluate" and "improve" cycle, until a specific exit condition is satisfied or a maximum number of iterations is reached. This pattern is particularly useful for self-correction, quality improvement, and any process where an agent's output is progressively refined [Source 1].

Like other [Workflow Agents](../subsystems/workflow-agents.md) in YAAF, the Loop Agent is implemented as a lightweight, composable function rather than a class, which simplifies testing and composition. This approach is inspired by, but distinct from, the class-based `LoopAgent` found in frameworks like ADK [Source 1].

## How It Works in YAAF

The Loop Agent pattern is implemented through the `loop()` factory function. This function accepts an array of `WorkflowStep` objects and an optional configuration object (`LoopConfig`) [Source 1]. A `WorkflowStep` can be an `AgentRunner` or any other `WorkflowAgent`, allowing for nested and complex workflows [Source 1].

The execution flow is as follows:
1.  The `loop` agent receives an initial input string.
2.  In the first iteration, it executes the provided steps sequentially, passing the output of one step as the input to the next.
3.  The output of the final step in the sequence becomes the result of the current iteration.
4.  This result is then checked against the `shouldExit` condition defined in the configuration. If the condition returns `true`, the loop terminates, and this result is returned as the final output of the entire workflow [Source 1].
5.  If the exit condition is not met, the result from the current iteration becomes the input for the *first* step of the next iteration, and the process repeats [Source 1].
6.  The loop will also terminate if the `maxIterations` count is reached, which prevents runaway execution [Source 1].

The `loop()` function returns a `WorkflowAgent` object, which conforms to the standard interface by exposing a `run()` method. This makes any loop-based workflow seamlessly composable with other agents and workflows [Source 1].

## Configuration

A Loop Agent's behavior is controlled via the `LoopConfig` object passed to the `loop()` function. Key configuration options include:

*   `name`: A string identifier for debugging and tracing purposes [Source 1].
*   `maxIterations`: The maximum number of times the loop can run. This is a safeguard against infinite loops and defaults to 5 [Source 1].
*   `shouldExit`: A function that receives the output of the last step in each iteration. It returns a boolean; if `true`, the loop terminates successfully. By default, this condition is never met, and the loop runs for the maximum number of iterations [Source 1].
*   `onIteration`: An optional function that can transform the result of an iteration before it is passed as input to the next one [Source 1].

### Example

The following example demonstrates a refinement loop where an `evaluator` agent and an `improver` agent work together. The loop continues for a maximum of five iterations or until the `evaluator`'s output includes the string "APPROVED" [Source 1].

```typescript
// Define two agents to participate in the loop
const evaluator: WorkflowStep = /* ... */;
const improver: WorkflowStep = /* ... */;

// Create the loop workflow
const refine = loop([evaluator, improver], {
  maxIterations: 5,
  shouldExit: (result) => result.includes('APPROVED'),
});

// Run the workflow with an initial draft
const polishedResult = await refine.run('Draft: An initial attempt at the document.');
```

## See Also

*   Sequential Agent: For running agents in a simple, linear pipeline.
*   Parallel Agent: For running multiple agents concurrently and merging their results.

## Sources

[Source 1] `src/agents/workflow.ts`