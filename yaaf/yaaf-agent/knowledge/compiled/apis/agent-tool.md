---
title: agentTool
entity_type: api
summary: Wraps an AgentRunner or WorkflowStep as a Tool for another agent, enabling multi-agent composition.
export_name: agentTool
source_file: src/tools/agentTool.ts
category: function
stub: false
compiled_at: 2026-04-16T14:37:20.931Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/tools/agentTool.ts
confidence: 1
---

## Overview
`agentTool` is the fundamental composition primitive for building multi-agent systems in YAAF. It allows an agent (the "parent") to invoke another agent or workflow (the "child") as if it were a standard tool. 

When the parent agent invokes the tool, the child agent is executed with the provided input. The child's final response is then returned to the parent as the tool's result. This pattern allows the parent agent to maintain control of the high-level logic while delegating specialized tasks to subordinate agents.

## Signature / Constructor

```typescript
export function agentTool(
  agent: WorkflowStep,
  config: AgentToolConfig,
): Tool;

export type AgentToolConfig = {
  /** Tool name the parent agent will use to invoke this agent */
  name: string;
  /** Description sent to the parent LLM so it knows WHEN to invoke this agent */
  description: string;
  /** Maximum result length (characters) before truncation. Default: 50,000 */
  maxResultChars?: number;
  /** Whether this agent-tool can run concurrently. Default: true */
  concurrent?: boolean;
  /** Custom input schema. Default: { query: string } */
  inputSchema?: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  /** Transform the agent's raw output before returning to the parent */
  transformResult?: (output: string) => string | Promise<string>;
};
```

## Methods & Properties

### agentTools()
A helper function used to create multiple agent-tools simultaneously from a registry of named agents.

```typescript
export function agentTools(
  registry: Record<string, { agent: WorkflowStep; description: string; [key: string]: any }>
): Tool[];
```

### Configuration Options
*   **name**: The identifier used by the parent LLM to call the tool.
*   **description**: A detailed string explaining the child agent's capabilities. Specificity is recommended to help the parent LLM determine when to delegate.
*   **inputSchema**: By default, the tool expects a `query` string which is passed to the child agent as a user message. This can be overridden to support structured data.
*   **transformResult**: An optional callback to post-process the child agent's output (e.g., for summarization or data extraction) before the parent receives it.

## Examples

### Basic Multi-Agent Composition
In this example, a researcher agent is wrapped as a tool and provided to a coordinator agent.

```typescript
import { AgentRunner, agentTool } from 'yaaf';

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
  tools: [researchTool, writeTool],
  systemPrompt: 'You coordinate writing tasks. Use research for facts.',
});
```

### Bulk Tool Creation
Using `agentTools` to register multiple specialists at once.

```typescript
import { agentTools, AgentRunner } from 'yaaf';

const tools = agentTools({
  research: { agent: researcher, description: 'Research a topic' },
  code: { agent: coder, description: 'Write or fix code' },
  review: { agent: reviewer, description: 'Review code quality' },
});

const coordinator = new AgentRunner({
  model: myModel,
  tools: [...tools],
  systemPrompt: 'You coordinate tasks between specialists.',
});
```

## See Also
*   `AgentRunner`
*   `WorkflowStep`
*   `buildTool`