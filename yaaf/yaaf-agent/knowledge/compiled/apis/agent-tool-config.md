---
title: AgentToolConfig
entity_type: api
summary: Configuration interface for wrapping an agent as a tool, defining its name, description, and input schema.
export_name: AgentToolConfig
source_file: src/tools/agentTool.ts
category: type
stub: false
compiled_at: 2026-04-16T14:37:29.552Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/tools/agentTool.ts
confidence: 1
---

## Overview
`AgentToolConfig` is a configuration object used when wrapping an agent (such as an `AgentRunner` or `WorkflowAgent`) as a tool for another agent. This interface defines how the "child" agent appears to the "parent" agent's LLM, including its name, the instructions for when to use it, and the structure of the data it expects to receive.

This configuration is a fundamental part of building multi-agent systems in YAAF, enabling hierarchical composition where a coordinator agent can delegate tasks to specialist agents as if they were standard functions.

## Signature
```typescript
export type AgentToolConfig = {
  name: string;
  description: string;
  maxResultChars?: number;
  concurrent?: boolean;
  inputSchema?: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  transformResult?: (output: string) => string | Promise<string>;
};
```

## Methods & Properties
- **name**: `string` (Required)
  The identifier the parent agent uses to invoke the tool.
- **description**: `string` (Required)
  The description provided to the parent LLM. This should clearly explain the child agent's capabilities and when it should be called (e.g., "Research a topic using web search" is preferred over "Call an agent").
- **maxResultChars**: `number` (Optional)
  The maximum length of the agent's output string before it is truncated. Defaults to `50,000`.
- **concurrent**: `boolean` (Optional)
  Specifies whether the agent-tool can be executed concurrently with other tools. Defaults to `true`.
- **inputSchema**: `object` (Optional)
  Defines a custom JSON schema for the tool's input. If not provided, it defaults to a single `query` string property: `{ query: string }`.
- **transformResult**: `(output: string) => string | Promise<string>` (Optional)
  A hook to post-process the child agent's raw output before it is returned to the parent agent. This is useful for summarization, data extraction, or formatting.

## Examples

### Basic Agent Tool Configuration
This example demonstrates configuring a research agent to be used by a coordinator.

```typescript
import { AgentRunner, agentTool } from 'yaaf';

const researcher = new AgentRunner({
  model: myModel,
  tools: [searchTool],
  systemPrompt: 'You are a research assistant.',
});

const researchTool = agentTool(researcher, {
  name: 'research_specialist',
  description: 'Use this tool to perform deep research on a specific topic. Input should be a detailed search query.',
  maxResultChars: 10000,
  // Uses default inputSchema: { query: string }
});
```

### Custom Input Schema
Overriding the default schema to allow structured parameters.

```typescript
const coderTool = agentTool(coderAgent, {
  name: 'write_code',
  description: 'Generates code based on a language and a requirement.',
  inputSchema: {
    type: 'object',
    properties: {
      language: { type: 'string' },
      requirement: { type: 'string' }
    },
    required: ['language', 'requirement']
  }
});
```

## See Also
- `agentTool`: The factory function that consumes this configuration.
- `agentTools`: A utility for creating multiple agent-tools from a registry.