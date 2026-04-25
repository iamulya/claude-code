---
title: Agent Composition
summary: The pattern of building complex agents by combining simpler, specialized agents, often by wrapping them as tools.
relationships:
 - [object Object]
 - [object Object]
entity_type: concept
related_subsystems:
 - agents
 - tools
search_terms:
 - multi-agent systems
 - hierarchical agents
 - parent agent child agent
 - agent as a tool
 - wrapping an agent as a tool
 - how to combine agents
 - specialist agents
 - coordinator agent
 - agent composition pattern
 - YAAF agent hierarchy
 - invoke one agent from another
 - agentTool function
 - agentTools function
stub: false
compiled_at: 2026-04-24T17:51:10.287Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/agentTool.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

Agent Composition is a design pattern in YAAF for building complex systems by combining multiple, simpler agents. It is described as the framework's "fundamental composition primitive for [Multi-Agent Systems](./multi-agent-systems.md)" [Source 1].

This pattern establishes a hierarchical relationship where a "parent" or "coordinator" agent delegates specific tasks to "child" or "specialist" agents. The parent agent treats each child agent as a standard tool. It invokes the child, provides input, and receives the child's final output as a tool result, remaining in control of the overall [workflow](./workflow.md) [Source 1]. This allows developers to create modular, specialized agents (e.g., for research, coding, or data analysis) and orchestrate them with a higher-level agent that understands how to use their capabilities to solve a larger problem.

## How It Works in YAAF

The primary mechanism for agent composition in YAAF is the `agentTool` function. This function wraps any agent that implements the `WorkflowStep` interface (such as an `AgentRunner`) and exposes it as a `Tool` that another agent can use [Source 1].

[when](../apis/when.md) the parent agent decides to use the agent-tool, it invokes it with a set of arguments, which by default includes a `query` string. This `query` is then passed to the wrapped child agent as a new user message, initiating its execution. The child agent runs its own independent loop, potentially using its own model and [Tools](../subsystems/tools.md), until it produces a final response. This final response is captured and returned to the parent agent as the result of the tool call [Source 1].

The following example demonstrates a `coordinator` agent using a `researcher` agent that has been wrapped as a tool:

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
[Source 1]

YAAF also provides a convenience function, `agentTools`, to create multiple agent-tools from a registry of named agents. This simplifies the setup for coordinator agents that manage several specialists [Source 1].

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
[Source 1]

## Configuration

The behavior of an agent-tool is configured via the `AgentToolConfig` object passed to the `agentTool` function. Key options include:

*   **`name`**: The name the parent agent will use to invoke the tool.
*   **`description`**: A detailed description provided to the parent agent's [LLM](./llm.md) to help it decide when to use this tool. Specificity is encouraged (e.g., "Research a topic using web search" is better than "Call an agent") [Source 1].
*   **`maxResultChars`**: The maximum length of the result string returned by the child agent before it is truncated. The default is 50,000 characters [Source 1].
*   **`concurrent`**: A boolean indicating if the agent-tool can run concurrently with other tools. This defaults to `true` as agent invocations are typically self-contained [Source 1].
*   **`inputSchema`**: Defines a custom input structure for the tool, overriding the default `{ query: string }`. This is useful for child agents that expect structured input [Source 1].
*   **`transformResult`**: An optional function to process the child agent's raw output before it is returned to the parent. This can be used for summarization, data extraction, or formatting [Source 1].

## Sources

[Source 1] `src/tools/agentTool.ts`