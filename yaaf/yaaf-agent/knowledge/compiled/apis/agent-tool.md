---
title: agentTool
summary: Wrap any AgentRunner or WorkflowStep as a Tool for another agent, enabling multi-agent composition.
export_name: agentTool
source_file: src/tools/agentTool.ts
category: function
relationships:
 - [object Object]
 - [object Object]
 - [object Object]
 - [object Object]
 - [object Object]
 - [object Object]
 - [object Object]
entity_type: api
search_terms:
 - multi-agent systems
 - agent composition
 - hierarchical agents
 - parent agent child agent
 - wrap agent as tool
 - how to make agents talk to each other
 - coordinator agent
 - specialist agent
 - invoke agent from another agent
 - agent as a function
 - sub-agent
 - AgentTool equivalent
 - agentTools helper
stub: false
compiled_at: 2026-04-24T16:47:45.631Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/agentTool.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `agentTool` function is a factory that wraps an existing agent, such as an `AgentRunner` or any `WorkflowStep`, and exposes it as a `Tool` that can be used by another agent [Source 1]. This is the fundamental primitive for composing agents and Building [Multi-Agent Systems](../concepts/multi-agent-systems.md) in YAAF. It allows a "parent" or "coordinator" agent to delegate complex tasks to specialized "child" agents, treating them just like any other tool [Source 1].

[when](./when.md) the parent agent invokes the tool, the input `query` is passed to the wrapped child agent as a new user message. The child agent then runs its own logic, potentially using its own set of [Tools](../subsystems/tools.md), until it produces a final response. This final response is then returned to the parent agent as the result of the tool call [Source 1].

A related helper function, `agentTools`, is also provided to create multiple agent-based tools from a registry of named agents [Source 1].

## Signature

The `agentTool` function takes an agent instance and a configuration object and returns a `Tool` instance [Source 1].

```typescript
import type { Tool } from "./tool.js";
import type { WorkflowStep } from "../agents/workflow.js";

export function agentTool(
  agent: WorkflowStep,
  config: AgentToolConfig,
): Tool<{ /* ... */ }>
```

### `AgentToolConfig`

The configuration object has the following properties [Source 1]:

| Property          | Type                                       | Description                                                                                                                            |
| ----------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `name`            | `string`                                   | **Required.** The tool name the parent agent will use to invoke this agent.                                                            |
| `description`     | `string`                                   | **Required.** A specific description for the parent [LLM](../concepts/llm.md) to understand when to use this agent.                                          |
| `maxResultChars`  | `number`                                   | Optional. The maximum number of characters in the result before it is truncated. Defaults to `50,000`.                                  |
| `concurrent`      | `boolean`                                  | Optional. Whether this tool can run concurrently with other tools. Defaults to `true`.                                                 |
| `inputSchema`     | `object`                                   | Optional. A custom JSON schema for the tool's input. Defaults to `{ query: string }`. Override this for structured agent inputs.       |
| `transformResult` | `(output: string) => string \| Promise<string>` | Optional. A function to transform the agent's raw output before returning it to the parent, useful for summarization or extraction. |

### `agentTools` Helper

The `agentTools` function provides a convenient way to create multiple agent tools at once from a registry [Source 1].

```typescript
export function agentTools(
  registry: Record<string, {
    agent: WorkflowStep;
    description: string;
    // other AgentToolConfig properties...
  }>
): Tool<any>[];
```

## Examples

### Wrapping a Single Agent

This example demonstrates creating a `researcher` agent and wrapping it as a `researchTool` for a `coordinator` agent to use [Source 1].

```typescript
const researcher = new AgentRunner({
  model: myModel,
  tools: [searchTool, readUrlTool],
  systemPrompt: 'You are a research assistant. Find accurate information.',
});

// Wrap the researcher as a tool for the coordinator
const researchTool = agentTool(researcher, {
  name: 'research',
  description: 'Research a topic using web search and URL reading',
});

const coordinator = new AgentRunner({
  model: myModel,
  tools: [researchTool, writeTool, reviewTool],
  systemPrompt: 'You coordinate writing tasks. Use research for facts.',
});
```

### Using the `agentTools` Helper

This example shows how to use the `agentTools` helper to create tools from a registry of specialist agents [Source 1].

```typescript
const tools = agentTools({
  research: { agent: researcher, description: 'Research a topic' },
  code: { agent: coder, description: 'Write or fix code' },
  review: { agent: reviewer, description: 'Review code quality' },
});

const coordinator = new AgentRunner({
  model: myModel,
  tools: [...tools, ...directTools],
  systemPrompt: 'You coordinate tasks between specialists.',
});
```

## Sources

[Source 1] `src/tools/agentTool.ts`