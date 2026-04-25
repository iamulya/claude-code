---
title: AgentRunner
summary: A core class for defining, configuring, and running an individual LLM-powered agent.
export_name: AgentRunner
source_file: src/agent.ts
category: class
relationships:
 - [object Object]
entity_type: api
search_terms:
 - create a new agent
 - run an agent
 - agent configuration
 - system prompt for agent
 - add tools to agent
 - LLM agent setup
 - single agent execution
 - agent constructor
 - basic agent implementation
 - how to define an agent
 - agent model selection
 - agent lifecycle
stub: false
compiled_at: 2026-04-24T16:47:35.076Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/agentTool.ts
compiled_from_quality: unknown
confidence: 0.85
---

## Overview

The `AgentRunner` class is a fundamental building block in YAAF for creating and configuring a single, self-contained, [LLM](../concepts/llm.md)-powered agent. It encapsulates the core components of an agent: the language model it uses, the set of [Tools](../subsystems/tools.md) it can invoke, and the [System Prompt](../concepts/system-prompt.md) that defines its purpose, personality, and constraints [Source 1].

Instances of `AgentRunner` are used for executing specific tasks. They can also be composed into more complex, [Multi-Agent Systems](../concepts/multi-agent-systems.md). For example, one `AgentRunner` can be wrapped as a `Tool` and provided to another, "parent" `AgentRunner`, allowing for hierarchical agent structures [Source 1].

## Signature / Constructor

`AgentRunner` is instantiated with a configuration object that defines its behavior.

```typescript
import type { LanguageModel } from '../models/types.js'; // Path is illustrative
import type { Tool } from '../tools/tool.js'; // Path is illustrative

interface AgentRunnerConfig {
  /** The language model instance the agent will use for inference. */
  model: LanguageModel;

  /** An array of tools the agent can decide to use. */
  tools: Tool<any>[];

  /** The system prompt that guides the agent's behavior. */
  systemPrompt: string;
}

class AgentRunner {
  constructor(config: AgentRunnerConfig);
}
```

### Constructor Parameters

*   `config` (`AgentRunnerConfig`): An object containing the agent's configuration.
    *   `model`: The language model that will power the agent's reasoning and decision-making.
    *   `tools`: An array of `Tool` instances available for the agent to call.
    *   `systemPrompt`: A string that provides high-level instructions to the model, setting its role, goals, and operational guidelines.

## Examples

### Basic Agent Definition

This example shows how to define a simple "researcher" agent with a specific model, a set of tools for interacting with the web, and a clear system prompt.

```typescript
// Assuming myModel, searchTool, and readUrlTool are already defined.

const researcher = new AgentRunner({
  model: myModel,
  tools: [searchTool, readUrlTool],
  systemPrompt: 'You are a research assistant. Find accurate information.',
});
```

### Coordinator Agent with an Agent-as-a-Tool

This example demonstrates [Agent Composition](../concepts/agent-composition.md). A `coordinator` agent is created, and one of its tools (`researchTool`) is actually the `researcher` agent from the previous example, wrapped using the `agentTool` utility. This allows the coordinator to delegate research tasks [Source 1].

```typescript
// The researcher agent from the previous example is wrapped as a tool.
const researchTool = agentTool(researcher, {
  name: 'research',
  description: 'Research a topic using web search and URL reading',
});

// Assuming myModel, writeTool, and reviewTool are also defined.
const coordinator = new AgentRunner({
  model: myModel,
  tools: [researchTool, writeTool, reviewTool],
  systemPrompt: 'You coordinate writing tasks. Use research for facts.',
});
```

## See Also

*   **agentTool**: A function for wrapping an `AgentRunner` instance so it can be used as a `Tool` by another agent. This is the primary mechanism for creating multi-agent systems.
*   **Tool**: The interface for tools that an `AgentRunner` can use to interact with external systems.

## Sources

[Source 1]: src/tools/agentTool.ts