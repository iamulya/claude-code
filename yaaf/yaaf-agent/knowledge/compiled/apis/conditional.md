---
export_name: conditional
source_file: src/agents/workflow.ts
category: function
title: conditional
entity_type: api
summary: Creates a workflow step that dynamically routes to different agents based on the input.
search_terms:
 - dynamic agent routing
 - conditional workflow step
 - how to route between agents
 - agent selector
 - workflow branching
 - if/else for agents
 - switch statement for agents
 - content-based routing
 - YAAF workflow control flow
 - choose agent based on input
 - agent orchestration logic
 - router agent
 - programmatic agent dispatch
stub: false
compiled_at: 2026-04-24T16:57:23.620Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/workflow.ts
compiled_from_quality: unknown
confidence: 0.99
---

## Overview

The `conditional` function is a factory that creates a `WorkflowStep` for implementing dynamic, content-based routing within a [workflow](../concepts/workflow.md) [Source 1]. It acts as a programmable switch, allowing a workflow to execute different agents or sub-workflows based on the content of the input string at that stage [Source 1].

This is a key component for building complex, non-linear agent systems without relying on an [LLM](../concepts/llm.md) for routing decisions. It enables deterministic control flow based on simple logic, such as checking for keywords in the input [Source 1]. The created step can be used within any workflow constructor, such as `sequential`, `parallel`, or `loop`.

## Signature

The function takes a single `selector` function as its argument and returns a `WorkflowStep` [Source 1].

```typescript
export function conditional(
  selector: (input: string) => WorkflowStep | Promise<WorkflowStep>,
): WorkflowStep
```

### Parameters

-   **`selector`**: `(input: string) => WorkflowStep | Promise<WorkflowStep>`
    A function that receives the current input string and must return the `WorkflowStep` (e.g., an `AgentRunner` or another `WorkflowAgent`) to be executed next. This function can be synchronous or asynchronous [Source 1].

### Returns

-   **`WorkflowStep`**
    An object that conforms to the `WorkflowStep` interface, which can be included in the `steps` array of other [Workflow Agents](../subsystems/workflow-agents.md) [Source 1].

## Examples

The following example demonstrates creating a router that dispatches tasks to either a `codeAgent` or a `generalAgent` based on whether the input contains the word "code" [Source 1].

```typescript
import { conditional, sequential } from 'yaaf';
import type { AgentRunner, WorkflowStep } from 'yaaf';

// Assume these are pre-configured AgentRunners
declare const codeAgent: AgentRunner;
declare const generalAgent: AgentRunner;
declare const summarizerAgent: AgentRunner;

// Create a conditional routing step
const router: WorkflowStep = conditional(async (input: string) => {
  console.log(`Routing based on input: "${input.substring(0, 20)}..."`);
  if (input.toLowerCase().includes('code')) {
    return codeAgent;
  }
  return generalAgent;
});

// Use the router in a sequential workflow
const pipeline = sequential([
  router,       // First step: route to the correct agent
  summarizerAgent // Second step: summarize the output of the chosen agent
]);

// Example run that will use the generalAgent
const result1 = await pipeline.run('Explain the theory of relativity.');

// Example run that will use the codeAgent
const result2 = await pipeline.run('Write a python script to list files.');
```

## See Also

-   `sequential`: For executing steps in a linear sequence.
-   `parallel`: For executing steps concurrently.
-   `loop`: For repeating a sequence of steps.
-   `WorkflowStep`: The interface that all workflow participants must satisfy.

## Sources

[Source 1]: src/agents/workflow.ts