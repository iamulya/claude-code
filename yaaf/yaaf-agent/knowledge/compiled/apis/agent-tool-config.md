---
title: AgentToolConfig
summary: Configuration options for wrapping an agent as a tool using `agentTool`.
export_name: AgentToolConfig
source_file: src/tools/agentTool.ts
category: type
relationships:
 - [object Object]
 - [object Object]
 - [object Object]
entity_type: api
search_terms:
 - agent as a tool
 - multi-agent composition
 - nested agent configuration
 - agent tool options
 - how to configure agentTool
 - parent agent child agent
 - agent tool description
 - agent tool input schema
 - transform agent tool result
 - sub-agent setup
 - hierarchical agents
 - agent composition primitive
stub: false
compiled_at: 2026-04-24T16:47:51.382Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/agentTool.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

`AgentToolConfig` is a TypeScript type that defines the configuration options for wrapping a YAAF agent as a tool for another agent to use [Source 1]. This is a fundamental primitive for Building [Multi-Agent Systems](../concepts/multi-agent-systems.md), allowing a "parent" agent to invoke a "child" agent as if it were any other tool [Source 1].

This configuration object is passed as the second argument to the `agentTool` function. It specifies how the wrapped agent appears to the parent agent's [LLM](../concepts/llm.md), including its name, a description of its capabilities, its input schema, and other behavioral settings [Source 1].

## Signature

`AgentToolConfig` is a type alias for an object with the following properties [Source 1]:

```typescript
export type AgentToolConfig = {
  /** Tool name the parent agent will use to invoke this agent */
  name: string;

  /**
   * Description sent to the parent LLM so it knows WHEN to invoke this agent.
   * Be specific — "Research a topic" is better than "Call an agent".
   */
  description: string;

  /**
   * Maximum result length (characters) before truncation.
   * Default: 50,000.
   */
  maxResultChars?: number;

  /**
   * Whether this agent-tool can run concurrently with other [[[[[[[[Tools]]]]]]]].
   * Default: true (agent invocations are self-contained).
   */
  concurrent?: boolean;

  /**
   * Custom input schema. Default: `{ query: string }`.
   * Override if your agent expects structured input.
   */
  inputSchema?: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };

  /**
   * Transform the agent's raw output before returning to the parent.
   * Useful for summarization or extraction.
   */
  transformResult?: (output: string) => string | Promise<string>;
};
```

### Properties

*   **`name`**: `string` (required)
    The name the parent agent will use to call this tool [Source 1].

*   **`description`**: `string` (required)
    A detailed description of the tool's purpose, provided to the parent agent's LLM to help it decide [when](./when.md) to use this tool [Source 1].

*   **`maxResultChars`**: `number` (optional)
    The maximum number of characters for the tool's result before it is truncated. The default value is 50,000 [Source 1].

*   **`concurrent`**: `boolean` (optional)
    Specifies if the agent-tool can be executed concurrently with other Tools. The default is `true`, as agent invocations are typically self-contained [Source 1].

*   **`inputSchema`**: `object` (optional)
    A JSON Schema object defining the expected input structure. If not provided, it defaults to `{ query: string }`. This should be overridden if the wrapped agent requires structured input [Source 1].

*   **`transformResult`**: `(output: string) => string | Promise<string>` (optional)
    A function to process the wrapped agent's final output string before it is returned to the parent agent. This is useful for tasks like summarization or extracting specific information from a longer response [Source 1].

## Examples

### Basic Configuration

This example shows the minimum required configuration for wrapping a `researcher` agent as a tool.

```typescript
import { agentTool } from 'yaaf';
import type { AgentToolConfig } from 'yaaf';
// Assume 'researcher' is a pre-configured AgentRunner instance
// const researcher = new AgentRunner({ ... });

const researchToolConfig: AgentToolConfig = {
  name: 'research',
  description: 'Research a topic using web search and URL reading. The input should be a clear research query.',
};

const researchTool = agentTool(researcher, researchToolConfig);
```

### Advanced Configuration

This example demonstrates using optional properties to customize the agent-tool's behavior, including a custom input schema and a result transformation function.

```typescript
import { agentTool } from 'yaaf';
import type { AgentToolConfig } from 'yaaf';
// Assume 'codeReviewer' is a pre-configured AgentRunner instance
// const codeReviewer = new AgentRunner({ ... });

const codeReviewToolConfig: AgentToolConfig = {
  name: 'code_reviewer',
  description: 'Reviews a snippet of code for quality, bugs, and style. Provide the code and the language.',
  concurrent: false, // This agent might be resource-intensive
  inputSchema: {
    type: 'object',
    properties: {
      code: { type: 'string', description: 'The code snippet to review.' },
      language: { type: 'string', description: 'The programming language of the code.' },
    },
    required: ['code', 'language'],
  },
  transformResult: (output) => {
    // Extracts a summary from a potentially verbose review
    const summaryMatch = output.match(/SUMMARY:\s*(.*)/);
    return summaryMatch ? `Review Summary: ${summaryMatch[1]}` : output;
  },
};

const codeReviewTool = agentTool(codeReviewer, codeReviewToolConfig);
```

## Sources

[Source 1] `src/tools/agentTool.ts`