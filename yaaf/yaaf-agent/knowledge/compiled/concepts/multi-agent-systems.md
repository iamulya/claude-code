---
summary: Explores architectures where multiple YAAF agents collaborate to achieve complex goals, often through delegation and tool-use, with `agentTool` being a key composition primitive.
title: Multi-Agent Systems
entity_type: concept
see_also:
 - Agent Composition
 - Agent Delegation
 - agentTool
 - agentTools
search_terms:
 - collaborative agents
 - agent composition
 - hierarchical agents
 - parent child agents
 - how to make agents work together
 - agent as a tool
 - coordinator agent pattern
 - specialist agents
 - agent delegation
 - agent teams
 - agent swarms
 - AgentTool primitive
 - composing agents
stub: false
compiled_at: 2026-04-25T00:21:40.164Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/agentTool.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

A Multi-Agent System is an architectural pattern in YAAF where multiple, often specialized, agents collaborate to solve a problem that would be too complex for a single agent. Instead of building one monolithic agent with a large number of tools and a complex system prompt, the task is decomposed and distributed among a team of agents.

Common patterns include:
*   **Hierarchical Delegation:** A "coordinator" or "manager" agent orchestrates the overall task, delegating sub-tasks to specialized "worker" agents. For example, a coordinator might ask a `researcher` agent to find information, a `coder` agent to write code, and a `reviewer` agent to check for quality [Source 1].
*   **Sequential Pipelines:** Agents are arranged in a sequence, where the output of one agent becomes the input for the next.
*   **Parallel Collaboration:** Multiple agents work on different parts of a problem simultaneously and their results are synthesized later.

This approach promotes modularity, reusability, and allows for the creation of more robust and capable systems by combining the focused expertise of individual agents.

## How It Works in YAAF

The primary mechanism for implementing multi-agent systems in YAAF is through [Agent Composition](./agent-composition.md), specifically by wrapping one agent as a tool for another. The framework provides the `agentTool` function, which is described as the "fundamental composition primitive for multi-agent systems" [Source 1].

The process follows these steps:
1.  A specialist agent (the "child") is defined with its own model, [System Prompt](./system-prompt.md), and set of tools.
2.  The `agentTool` function is used to wrap this child agent. This wrapper makes the entire agent conform to the `Tool` interface, allowing it to be used by another agent.
3.  A "parent" or "coordinator" agent is then equipped with this newly created tool.
4.  During its reasoning process, the parent agent can decide to invoke the child agent by calling the tool. The input provided to the tool (by default, a `query` string) is passed as the initial user message to the child agent.
5.  The child agent executes its own independent reasoning loop to fulfill the request.
6.  The final response from the child agent is returned to the parent as the tool's result, which the parent can then use to continue its own task [Source 1].

YAAF also provides a convenience function, `agentTools`, to create multiple agent-based tools from a registry of agents, simplifying the setup of a coordinator with several specialists [Source 1].

## Configuration

The configuration of an agent as a tool is managed through the `AgentToolConfig` object passed to the [agentTool](../apis/agent-tool.md) function. This allows fine-grained control over how the parent agent perceives and interacts with the child agent.

Key configuration options include:
*   `name`: The name the parent agent uses to invoke the child agent tool.
*   `description`: A critical field that explains the child agent's capabilities. The parent LLM uses this description to determine when to delegate a task.
*   `inputSchema`: Defines the expected input structure for the child agent. The default is a simple object with a `query` string, but this can be customized for more structured inter-agent communication.
*   `maxResultChars`: Sets a character limit on the child agent's output to prevent [Context Overflow](./context-overflow.md) in the parent agent.
*   `transformResult`: A function to process the child agent's raw output before it is returned to the parent, useful for summarization or data extraction [Source 1].

### Example

The following example demonstrates creating a `researcher` agent and wrapping it as a `researchTool` for a `coordinator` agent.

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

## See Also

*   [Agent Composition](./agent-composition.md)
*   [Agent Delegation](./agent-delegation.md)
*   [agentTool](../apis/agent-tool.md)
*   [agentTools](../apis/agent-tools.md)

## Sources

[Source 1]: src/tools/agentTool.ts