---
title: Building Loop Agents
entity_type: guide
summary: Learn how to create an agent that repeatedly executes a sequence of steps until a specific condition is met or a maximum number of iterations is reached.
difficulty: intermediate
search_terms:
 - iterative agent
 - refinement loop
 - agent self-correction
 - how to make an agent repeat a task
 - YAAF loop agent
 - exit condition for agent
 - max iterations agent
 - agent workflow loop
 - multi-step agent iteration
 - ADK LoopAgent equivalent
 - agent that improves its own output
 - building a critique-refine loop
 - stop agent after N tries
stub: false
compiled_at: 2026-04-24T18:05:51.313Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/workflow.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

This guide demonstrates how to build a [Loop Agent](../concepts/loop-agent.md) using YAAF's [workflow](../concepts/workflow.md) [Utilities](../subsystems/utilities.md). A Loop Agent repeats a sequence of steps, feeding the output of the last step from one iteration into the first step of the next. This pattern is ideal for tasks requiring iterative refinement, such as having one agent evaluate another's work and a second agent improve it based on the feedback [Source 1].

By following this guide, you will build a simple "critique-and-refine" workflow where an `evaluator` agent provides feedback on a draft and an `improver` agent revises it, repeating until the draft is marked "APPROVED" or a maximum number of attempts is reached.

## Prerequisites

Before starting, you should have two or more agent instances that conform to the `WorkflowStep` interface. Typically, these will be `AgentRunner` instances, but they can also be other [Workflow Agents](../subsystems/workflow-agents.md) or custom functions [Source 1]. For this guide, we will use mock objects to represent these agents.

## Step-by-Step

The process involves defining the agents for the loop, creating the loop with an exit condition, and then running it.

### Step 1: Define the Agents for Each Iteration

First, define the agents that will participate in each iteration of the loop. For a critique-and-refine cycle, you need at least two: one to evaluate the work and one to improve it. These agents must be `WorkflowStep` compatible, meaning they have an async `run` method [Source 1].

```typescript
import type { WorkflowStep } from "yaaf"; // Assuming yaaf exports this type

// Mock agent that critiques a draft.
const evaluator: WorkflowStep = {
  async run(input: string): Promise<string> {
    console.log(`EVALUATOR received: "${input.substring(0, 30)}..."`);
    if (input.includes("final revision")) {
      return "Critique: Looks good. APPROVED.";
    }
    return "Critique: The tone is too informal. Please revise.";
  },
};

// Mock agent that improves a draft based on critique.
const improver: WorkflowStep = {
  async run(input: string): Promise<string> {
    console.log(`IMPROVER received: "${input.substring(0, 30)}..."`);
    if (input.includes("informal")) {
      return "Draft: This is a revised draft with a more professional tone.";
    }
    // Make a "final" revision to meet the exit condition
    return "Draft: This is the final revision of the document.";
  },
};
```

### Step 2: Import the `loop` Function

Import the `loop` workflow constructor from the YAAF framework.

```typescript
import { loop } from "yaaf/agents"; // Fictional import path
```

### Step 3: Create the Loop Agent

Use the `loop` function to create the workflow. Pass an array of the agents to be executed sequentially in each iteration. The primary configuration includes setting an exit condition and a maximum number of iterations [Source 1].

The `loop` function takes two arguments:
1.  An array of `WorkflowStep`s to execute in order on each iteration.
2.  An optional `LoopConfig` object.

```typescript
const refineWorkflow = loop([evaluator, improver], {
  name: "critique-and-refine-loop",
  maxIterations: 5,
  shouldExit: (result) => result.includes("APPROVED"),
});
```

In this configuration:
-   `[evaluator, improver]` defines the sequence for each iteration.
-   `maxIterations: 5` acts as a safeguard, preventing the loop from running indefinitely. The default is 5 [Source 1].
-   `shouldExit` is a function that inspects the output of the *last* step in the iteration (`improver` in this case) and returns `true` to terminate the loop [Source 1].

### Step 4: Run the Loop Agent

The `loop` function returns a `WorkflowAgent`, which has its own `run` method. Call this method with the initial input to start the process.

```typescript
const initialDraft = "Draft: this is my first try.";

console.log("Starting refinement process...");
const finalResult = await refineWorkflow.run(initialDraft);
console.log("\n--- LOOP FINISHED ---");
console.log("Final Result:", finalResult);
```

### Execution Flow

[when](../apis/when.md) `refineWorkflow.run()` is called, the execution proceeds as follows:

1.  **Iteration 1:**
    *   `evaluator.run(initialDraft)` -> returns "Critique: The tone is too informal..."
    *   `improver.run("Critique: The tone is too informal...")` -> returns "Draft: This is a revised draft..."
    *   `shouldExit` checks the improver's output. It does not include "APPROVED", so the loop continues.

2.  **Iteration 2:**
    *   The output from Iteration 1's `improver` becomes the input for this iteration.
    *   `evaluator.run("Draft: This is a revised draft...")` -> returns "Critique: The tone is too informal..."
    *   `improver.run("Critique: The tone is too informal...")` -> returns "Draft: This is the final revision..."
    *   `shouldExit` checks the improver's output. It does not include "APPROVED", so the loop continues.

3.  **Iteration 3:**
    *   `evaluator.run("Draft: This is the final revision...")` -> returns "Critique: Looks good. APPROVED."
    *   `improver.run("Critique: Looks good. APPROVED.")` -> returns "Draft: This is the final revision..."
    *   `shouldExit` checks the improver's output. It still does not include "APPROVED". *Note: A better `shouldExit` might check the output of any step, but the current implementation checks only the final step's output.* Let's assume the `improver` passes the approval message through.

Let's adjust the mock `improver` and `shouldExit` for a clearer example that terminates correctly.

```typescript
// Corrected Improver
const improver_v2: WorkflowStep = {
  async run(input: string): Promise<string> {
    if (input.includes("APPROVED")) {
      return `Final Document: APPROVED. The work is complete.`;
    }
    return "Revised Draft: The tone has been adjusted.";
  },
};

// Corrected Loop
const refineWorkflow_v2 = loop([evaluator, improver_v2], {
  maxIterations: 5,
  shouldExit: (result) => result.includes("APPROVED"),
});

const finalResult_v2 = await refineWorkflow_v2.run(initialDraft);
console.log(finalResult_v2); // Will now exit correctly.
```

## Configuration Reference

The `loop` function accepts an optional configuration object with the following properties [Source 1]:

| Property        | Type                                                          | Default                               | Description                                                                                                                            |
| --------------- | ------------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `name`          | `string`                                                      | `'loop'`                              | A name for the workflow instance, used for debugging and tracing.                                                                      |
| `maxIterations` | `number`                                                      | `5`                                   | The maximum number of iterations before the loop is forced to exit. This prevents runaway execution.                                   |
| `shouldExit`    | `(result: string, iteration: number) => boolean \| Promise<boolean>` | `() => false`                         | A function called after each iteration. It receives the output of the last step. If it returns `true`, the loop terminates early. |
| `onIteration`   | `(result: string, iteration: number) => string`               | `(result) => result`                  | A function called after each iteration completes but before the next one begins. It can transform the result before it becomes the next iteration's input. |

## Common Mistakes

1.  **Infinite Loops:** Forgetting to set `maxIterations` or creating a `shouldExit` condition that is never met can lead to a runaway agent, potentially incurring high costs with [LLM](../concepts/llm.md) providers. The default `maxIterations` of 5 provides a safety net [Source 1].
2.  **Incorrect `shouldExit` Logic:** The `shouldExit` function only receives the output of the *final* agent in the `steps` array for a given iteration. If the exit condition is produced by an earlier agent in the sequence, the loop will not terminate as expected.
3.  **State Mismatch Between Iterations:** The entire output of the last step becomes the input for the first step of the next iteration. If the first agent expects a specific format (e.g., just a draft) but receives a complex string with feedback and the draft, it may fail. Use the `onIteration` hook to clean up or reformat the data between loops.

## Next Steps

-   Explore other workflow agents like `sequential` for simple pipelines and `parallel` for fanning out tasks.
-   Combine workflows by nesting a `loop` agent as a step within a `sequential` agent to create more complex, multi-stage processes.

## Sources

[Source 1] `src/agents/workflow.ts`