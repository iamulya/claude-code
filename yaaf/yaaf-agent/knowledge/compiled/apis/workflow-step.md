---
export_name: WorkflowStep
source_file: src/agents/workflow.ts
category: type
title: WorkflowStep
entity_type: api
summary: A type that defines the common interface for any runnable unit that can be part of a workflow.
search_terms:
 - workflow agent composition
 - what can be a step in a workflow
 - agent runner as workflow step
 - composable agent interface
 - sequential agent steps
 - parallel agent steps
 - loop agent steps
 - agent orchestration unit
 - runnable agent type
 - how to build a pipeline of agents
 - multi-agent system building block
stub: false
compiled_at: 2026-04-24T17:49:49.041Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/workflow.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/agentTool.ts
compiled_from_quality: unknown
confidence: 0.99
---

## Overview

`WorkflowStep` is a TypeScript type that defines the common contract for any component that can participate in a declarative, multi-agent [workflow](../concepts/workflow.md) [Source 1]. It serves as a universal interface for runnable agents, enabling them to be composed together using workflow orchestrators like `sequential`, `parallel`, and `loop` [Source 1].

The core requirement of the `WorkflowStep` interface is a single `run` method that takes a string input and returns a promise of a string output. This simple contract allows for powerful composition [Source 1].

Both `AgentRunner` and `WorkflowAgent` (the return type of the workflow functions) satisfy the `WorkflowStep` interface. This allows for nesting workflows within other workflows, creating complex agent systems from simple, composable parts [Source 1]. The `agentTool` function also accepts any `WorkflowStep` to wrap it as a tool for another agent [Source 2].

## Signature

The `WorkflowStep` type is defined as an object with a `run` method [Source 1].

```typescript
export type WorkflowStep = {
  run(input: string, signal?: AbortSignal): Promise<string>;
};
```

### Properties

*   **`run(input: string, signal?: AbortSignal): Promise<string>`**
    *   Executes the agent or workflow step.
    *   **`input`**: The string input for the step, often the output from a previous step or the initial user message.
    *   **`signal`** (optional): An `AbortSignal` to cancel the execution of the step.
    *   **Returns**: A `Promise` that resolves to the string output of the step.

## Examples

### Using AgentRunners as WorkflowSteps

Any `AgentRunner` instance can be used directly as a `WorkflowStep` in a workflow function like `sequential` [Source 1].

```typescript
import { AgentRunner } from 'yaaf/agent';
import { sequential } from 'yaaf/workflow';
import { myModel } from './my-model';

// These AgentRunner instances implicitly satisfy the WorkflowStep interface
const researcher = new AgentRunner({ model: myModel, systemPrompt: 'You are a researcher.' });
const writer = new AgentRunner({ model: myModel, systemPrompt: 'You are a writer.' });
const reviewer = new AgentRunner({ model: myModel, systemPrompt: 'You are a reviewer.' });

// The `sequential` function accepts an array of WorkflowSteps
const pipeline = sequential([researcher, writer, reviewer]);

const result = await pipeline.run('Write an article about AI agents');
```

### Using a Workflow as a Step in Another Workflow

The `WorkflowAgent` returned by functions like `sequential`, `parallel`, or `loop` is also a `WorkflowStep`, allowing workflows to be nested [Source 1].

```typescript
import { AgentRunner } from 'yaaf/agent';
import { sequential, parallel } from 'yaaf/workflow';
import { myModel } from './my-model';

const fetchA = new AgentRunner({ model: myModel, systemPrompt: 'Fetch data from source A.' });
const fetchB = new AgentRunner({ model: myModel, systemPrompt: 'Fetch data from source B.' });
const writer = new AgentRunner({ model: myModel, systemPrompt: 'Synthesize data into a report.' });

// This parallel workflow is a WorkflowStep
const researchFanOut = parallel([fetchA, fetchB], {
  merge: (results) => results.join('\n---\n'),
});

// The `researchFanOut` workflow is used as the first step in a sequential pipeline
const fullPipeline = sequential([researchFanOut, writer]);

const report = await fullPipeline.run('Gather market data and write a report.');
```

### Using a WorkflowStep with agentTool

The `agentTool` function accepts any `WorkflowStep` to expose it as a tool to another agent [Source 2].

```typescript
import { AgentRunner } from 'yaaf/agent';
import { agentTool } from 'yaaf/tools';
import { myModel } from './my-model';

const researcher = new AgentRunner({
  model: myModel,
  systemPrompt: 'You are a research assistant.',
});

// The `researcher` (a WorkflowStep) is wrapped as a tool
const researchTool = agentTool(researcher, {
  name: 'research',
  description: 'Research a topic using web search and URL reading',
});

const coordinator = new AgentRunner({
  model: myModel,
  tools: [researchTool],
  systemPrompt: 'You coordinate tasks. Use research for facts.',
});
```

## See Also

*   `AgentRunner`: The primary class for creating individual agents, which conforms to the `WorkflowStep` interface.
*   `WorkflowAgent`: The type returned by workflow functions, which also conforms to the `WorkflowStep` interface.
*   `sequential`: A workflow function that runs `WorkflowStep`s in sequence.
*   `parallel`: A workflow function that runs `WorkflowStep`s concurrently.
*   `loop`: A workflow function that repeatedly executes `WorkflowStep`s.
*   `agentTool`: A function that wraps any `WorkflowStep` to be used as a `Tool`.

## Sources

*   [Source 1]: `src/agents/workflow.ts`
*   [Source 2]: `src/tools/agentTool.ts`