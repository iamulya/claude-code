---
title: agentTools
entity_type: api
summary: Creates multiple agent-tools from a registry of named agents for bulk tool registration.
export_name: agentTools
source_file: src/tools/agentTool.ts
category: function
stub: false
compiled_at: 2026-04-16T14:37:28.817Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/tools/agentTool.ts
confidence: 1
---

## Overview
The `agentTools` function is a utility for bulk-wrapping multiple agents into tools. It is a convenience wrapper around the fundamental composition primitive that allows a "parent" agent to invoke "child" agents as if they were standard tools. 

This function is primarily used in multi-agent orchestration patterns where a coordinator agent requires access to a suite of specialist agents. By using a registry-based approach, developers can define multiple agent-to-tool mappings in a single call, where the registry keys serve as the tool names.

## Signature
```typescript
function agentTools(
  registry: Record<string, {
    agent: WorkflowStep;
    description: string;
    maxResultChars?: number;
    concurrent?: boolean;
    inputSchema?: {
      type: 'object';
      properties: Record<string, unknown>;
      required?: string[];
    };
    transformResult?: (output: string) => string | Promise<string>;
  }>
): Tool[];
```

### Parameters
- `registry`: An object where each key is the desired tool name and the value is a configuration object containing:
    - `agent`: The `AgentRunner` or `WorkflowStep` to be wrapped.
    - `description`: A string describing when the parent LLM should invoke this agent.
    - `maxResultChars` (optional): Maximum length of the agent's output before truncation (default: 50,000).
    - `concurrent` (optional): Whether the agent-tool can run concurrently with others (default: true).
    - `inputSchema` (optional): Custom JSON schema for the tool's input. Defaults to `{ query: string }`.
    - `transformResult` (optional): A function to process the child agent's output before returning it to the parent.

### Returns
An array of `Tool` objects ready to be passed to an agent's `tools` configuration.

## Examples
The following example demonstrates creating a coordinator agent that can delegate tasks to research, coding, and review specialists.

```typescript
import { AgentRunner, agentTools } from 'yaaf';

const tools = agentTools({
  research: { 
    agent: researcher, 
    description: 'Research a topic using web search and URL reading' 
  },
  code: { 
    agent: coder, 
    description: 'Write or fix code based on requirements' 
  },
  review: { 
    agent: reviewer, 
    description: 'Review code quality and security' 
  },
});

const coordinator = new AgentRunner({
  model: myModel,
  tools: [...tools, ...directTools],
  systemPrompt: 'You coordinate tasks between specialists. Use research for facts and code/review for implementation.',
});
```

## See Also
- `agentTool`
- `AgentRunner`
- `Tool`