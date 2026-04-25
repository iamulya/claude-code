---
title: Tool (Type)
summary: The TypeScript type definition for a YAAF tool, specifying its structure and expected behavior.
export_name: Tool
source_file: src/tools/tool.js
category: type
relationships:
 - [object Object]
 - [object Object]
 - [object Object]
entity_type: api
search_terms:
 - define a new tool
 - custom tool for agent
 - tool schema
 - what is a tool in yaaf
 - agent function calling
 - tool interface
 - tool definition
 - how to create a tool
 - tool properties
 - input schema for tools
 - tool description for llm
 - concurrent tools
stub: false
compiled_at: 2026-04-24T17:45:46.597Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/agentTool.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

The `Tool` type is the fundamental interface in YAAF for defining an action that an agent can execute. It encapsulates all the information an [LLM](../concepts/llm.md) needs to understand what the tool does, [when](./when.md) to use it, and what arguments it requires. Agents are configured with a list of `Tool` objects, which they present to the underlying model to enable function calling capabilities.

A `Tool` object typically includes a name, a detailed description for the LLM, and a JSON schema defining its input parameters. While one can implement this type directly, it is more common to create [Tools](../subsystems/tools.md) using factory functions like `buildTool` or `agentTool`.

## Signature

The `Tool` type is an interface that defines the contract for a tool. While the exact type definition is located in `src/tools/tool.js`, its key properties can be inferred from helper functions that create `Tool` objects [Source 1].

A `Tool` object has the following conceptual structure:

*   **`name`**: `string`
    *   The name the parent agent and LLM will use to invoke the tool.
*   **`description`**: `string`
    *   A detailed description of what the tool does, its purpose, and when it should be used. This is critical for the LLM's decision-making process.
*   **`inputSchema`**: `object`
    *   A JSON schema object that defines the parameters the tool accepts. The default for many tools is a simple object expecting a `query` string, like `{ type: "object", properties: { query: { type: "string" } } }`.
*   **`execute`**: `(args: T) => Promise<any>`
    *   The function that contains the actual logic of the tool. It receives the arguments parsed according to the `inputSchema` and returns the result.
*   **`concurrent`**: `boolean` (optional)
    *   Specifies whether the agent can run this tool concurrently with other tools that also support concurrency. Defaults to `true` for many tool types, such as those created by `agentTool` [Source 1].

## Examples

The most common way to use the `Tool` type is by passing instances of it into an `AgentRunner`'s configuration. The following example shows a "coordinator" agent being configured with a `researchTool`, which is itself a wrapped agent [Source 1].

```typescript
import { AgentRunner } from 'yaaf/agent';
import { agentTool, type Tool } from 'yaaf/tool';
import { myModel } from './my-model';

// Assume 'researcher' is another AgentRunner instance
const researcher = new AgentRunner({
  model: myModel,
  tools: [/* ... web search tools ... */],
  systemPrompt: 'You are a research assistant. Find accurate information.',
});

// Create a Tool by wrapping the researcher agent
const researchTool: Tool = agentTool(researcher, {
  name: 'research',
  description: 'Research a topic using web search and URL reading',
});

// Assume writeTool and reviewTool are other Tool instances
declare const writeTool: Tool;
declare const reviewTool: Tool;

// Use the created tool in a new agent's configuration
const coordinator = new AgentRunner({
  model: myModel,
  tools: [researchTool, writeTool, reviewTool],
  systemPrompt: 'You coordinate writing tasks. Use research for facts.',
});
```

## See Also

*   `agentTool` (function): A factory for wrapping an entire agent as a `Tool` for another agent to use.
*   `buildTool` (function): A general-purpose factory for creating custom tools from a function.

## Sources

[Source 1]: src/tools/agentTool.ts