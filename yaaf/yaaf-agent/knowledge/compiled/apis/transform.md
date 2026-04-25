---
export_name: transform
source_file: src/agents/workflow.ts
category: function
title: transform
entity_type: api
summary: Creates a simple, stateless workflow step that transforms text without using an LLM.
search_terms:
 - data formatting between agents
 - workflow text manipulation
 - pass-through workflow step
 - modify agent output
 - connect agents with custom logic
 - simple workflow utility
 - no-LLM workflow step
 - transform agent input
 - sequential pipeline formatting
 - add prefix to agent output
 - custom workflow logic
 - lightweight workflow step
stub: false
compiled_at: 2026-04-24T17:45:51.205Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/workflow.ts
compiled_from_quality: unknown
confidence: 0.99
---

## Overview

The `transform` function is a utility for creating a simple, stateless step within a YAAF [workflow](../concepts/workflow.md) [Source 1]. It wraps a provided function to create a `WorkflowStep` that can modify text as it passes between other agents or steps.

This is particularly useful for data formatting, adding prefixes or suffixes, or performing any synchronous or asynchronous text manipulation without the overhead of a full agent or an [[]] Call]]. It serves as a lightweight "glue" to connect more complex steps in a workflow, such as those created by `sequential` or `loop` [Source 1].

## Signature

The function takes a single argument: a function that performs the text transformation.

```typescript
export function transform(
  fn: (input: string) => string | Promise<string>
): WorkflowStep;
```

**Parameters:**

*   `fn`: `(input: string) => string | Promise<string>`
    *   A function that accepts the input string from the previous step and returns the transformed output string, either directly or as a `Promise`.

**Returns:**

*   `WorkflowStep`
    *   An object that conforms to the `WorkflowStep` interface, making it compatible with other workflow composition functions like `sequential`, `parallel`, and `loop` [Source 1].

## Examples

The most common use case is to format the output of one agent before it becomes the input for the next agent in a `sequential` pipeline.

```typescript
import { sequential, transform } from 'yaaf';

// Assume researcher and reviewer are existing AgentRunners
const researcher = { run: async (input: string) => `Research on ${input}` };
const reviewer = { run: async (input: string) => `Reviewing: ${input}` };

const pipeline = sequential([
  researcher,
  transform(output => `Please review this research summary:\n\n${output}`),
  reviewer,
]);

const finalResult = await pipeline.run('Quantum Computing');

/*
Expected finalResult:
"Reviewing: Please review this research summary:

Research on Quantum Computing"
*/
```
In this example, `transform` inserts a preparatory sentence between the `researcher` and `reviewer` steps [Source 1].

## See Also

*   `sequential`: For running workflow steps in a sequence.
*   `parallel`: For running workflow steps concurrently.
*   `loop`: For running workflow steps in a loop until a condition is met.
*   `WorkflowStep`: The interface that `transform` and other workflow [Utilities](../subsystems/utilities.md) implement.

## Sources

*   [Source 1] `src/agents/workflow.ts`