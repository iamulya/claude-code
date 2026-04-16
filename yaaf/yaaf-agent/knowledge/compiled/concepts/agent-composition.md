---
title: Agent Composition
entity_type: concept
summary: The fundamental pattern of nesting agents by treating one agent as a tool for another, enabling hierarchical multi-agent systems.
stub: false
compiled_at: 2026-04-16T14:37:36.997Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/tools/agentTool.ts
confidence: 0.95
---

---
title: "Agent Composition"
entity_type: "concept"
summary: "The fundamental pattern of nesting agents by treating one agent as a tool for another, enabling hierarchical multi-agent systems."
related_subsystems:
  - "tools"
  - "agents"

## What It Is
Agent Composition is the primary architectural pattern in YAAF for building multi-agent systems. It allows a developer to treat an entire agent (a "child" or "specialist") as a standard tool that can be invoked by another agent (a "parent" or "coordinator"). 

This pattern solves the complexity of monolithic agent design by enabling a hierarchical structure. Instead of a single agent attempting to handle every task and context, a coordinator agent can delegate specific sub-tasks to specialized agents. The parent agent remains in control of the high-level logic, receiving the child agent's final output as a tool result.

## How It Works in YAAF
In YAAF, composition is achieved through the `agentTool` primitive. This function wraps an `AgentRunner` or any `WorkflowStep` into a `Tool` object. 

When the parent agent decides to use the tool:
1. The parent LLM generates a tool call containing a query.
2. The `agentTool` wrapper passes this query to the child agent as a user message.
3. The child agent executes its own internal logic (which may include its own tools or even further nested agents).
4. The child agent's final response is captured and returned to the parent agent as the tool's output.

The framework also provides a bulk utility, `agentTools`, which allows developers to create multiple agent-based tools simultaneously from a registry of named agents.

## Configuration
Agent composition is configured via the `AgentToolConfig` object. This allows developers to define how the parent perceives and interacts with the child agent.

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
  maxResultChars: 50000,
  concurrent: true,
  // Optional: Override the default { query: string } input schema
  inputSchema: {
    type: 'object',
    properties: {
      topic: { type: 'string' },
      depth: { type: 'string', enum: ['shallow', 'deep'] }
    },
    required: ['topic']
  }
});

const coordinator = new AgentRunner({
  model: myModel,
  tools: [researchTool],
  systemPrompt: 'You coordinate writing tasks. Use research for facts.',
});
```

### Key Configuration Fields
*   **name**: The identifier the parent agent uses to call the tool.
*   **description**: Critical for the parent LLM to understand when the specialist agent should be utilized.
*   **maxResultChars**: Limits the length of the child agent's output to prevent context window overflow in the parent (default: 50,000).
*   **inputSchema**: Defines the structure of the data the parent must provide. By default, this is `{ query: string }`.
*   **transformResult**: An optional hook to post-process the child agent's output (e.g., summarization or JSON extraction) before it is handed back to the parent.

## See Also
*   [[AgentRunner]]
*   [[Tool]]
*   [[WorkflowStep]]