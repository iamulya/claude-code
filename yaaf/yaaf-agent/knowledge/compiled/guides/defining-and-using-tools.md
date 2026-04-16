---
title: Defining and Using Tools
entity_type: guide
summary: A comprehensive guide on creating tools, managing their execution context, and preventing runaway loops.
difficulty: intermediate
stub: false
compiled_at: 2026-04-16T14:12:15.651Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/tools.md
confidence: 1
---

## Overview
Tools are the discrete actions an agent can perform to interact with external systems or process data. In YAAF, a tool is defined by its name, a description that informs the Large Language Model (LLM) when to use it, a JSON schema for input validation, and an execution function. This guide covers the lifecycle of tool creation, from scaffolding to advanced execution management.

## Prerequisites
* YAAF installed in a TypeScript project.
* An understanding of JSON Schema for input validation.

## Step-by-Step

### 1. Scaffolding a New Tool
The YAAF CLI provides a command to generate a tool template. This ensures the file structure and basic imports are correctly configured.

```bash
yaaf add tool weather
```

This command creates a new file (e.g., `src/tools/weather.ts`) with a standard template.

### 2. Defining the Tool Structure
Use the `buildTool` function to define the tool's metadata and logic. The `description` is critical as it serves as the primary prompt for the LLM to determine tool selection.

```typescript
import { buildTool } from 'yaaf';

const weatherTool = buildTool({
  name: 'get_weather',
  description: 'Get current weather for a location. Use when asked about weather.',
  inputSchema: {
    type: 'object',
    properties: {
      location: { type: 'string', description: 'City name or coordinates' },
      units:    { type: 'string', enum: ['celsius', 'fahrenheit'] },
    },
    required: ['location'],
  },
  maxResultChars: 2000,
  describe: ({ location }) => `Weather for ${location}`,

  async call({ location, units = 'celsius' }, ctx) {
    try {
      const data = await fetchWeather(location, units);
      return { data: JSON.stringify(data) };
    } catch (err) {
      return { data: '', error: 'Failed to fetch weather data' };
    }
  },

  // Safety and execution flags
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  isDestructive: () => false,
});
```

### 3. Utilizing Execution Context
The `call` function receives a context object (`ctx`) that provides utilities for managing the execution lifecycle:

*   **ctx.signal**: An `AbortSignal` to handle request cancellation.
*   **ctx.agentName**: The identifier of the agent invoking the tool.
*   **ctx.exec**: A method to execute shell commands, subject to sandbox restrictions.

```typescript
async call(input, ctx) {
  // Respecting cancellation
  if (ctx.signal.aborted) return { data: 'Cancelled' };
  
  // Accessing agent metadata
  console.log(`Tool called by ${ctx.agentName}`);
  
  return { data: 'Success' };
}
```

### 4. Implementing Loop Detection
To prevent agents from entering infinite loops (e.g., calling the same tool with the same arguments repeatedly), use the `ToolLoopDetector` within agent hooks.

```typescript
import { ToolLoopDetector } from 'yaaf';

const detector = new ToolLoopDetector({
  threshold: 3,    // Trigger after 3 identical calls
  windowSize: 20,  // Look at last 20 calls
});

// Configuration within the Agent instance
const agentHooks = {
  afterToolCall: async (ctx) => {
    detector.record(ctx.toolName, ctx.arguments);
    if (detector.isLooping()) {
      return {
        action: 'inject',
        message: detector.getWarning(),
      };
    }
    return { action: 'continue' };
  },
};
```

### 5. Managing Tool Result Budgets
Large tool outputs can exhaust the LLM's context window. The `toolResultBudget` configuration allows for automatic truncation of results.

```typescript
const agent = new Agent({
  tools: [weatherTool],
  toolResultBudget: {
    maxCharsPerResult: 5000,
    maxTotalChars: 20000,
    strategy: 'truncate-oldest',
  },
});
```

## Configuration Reference

### buildTool Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Unique tool name used by the LLM for invocation. |
| `description` | `string` | No | Guidance for the LLM on when and why to use the tool. |
| `inputSchema` | `JSONSchema` | Yes | Schema used to validate LLM-generated arguments. |
| `call` | `Function` | Yes | The execution logic: `(input, ctx) => ToolResult`. |
| `describe` | `Function` | No | Returns a human-readable string of the specific call. |
| `maxResultChars` | `number` | No | Hard limit for truncating the tool's return data. |
| `isReadOnly` | `Function` | No | Indicates if the tool avoids state modification (Default: `false`). |
| `isConcurrencySafe` | `Function` | No | Indicates if the tool can run in parallel (Default: `false`). |
| `isDestructive` | `Function` | No | Indicates if the tool performs deletion or irreversible actions (Default: `false`). |

### ToolResult Object

| Property | Type | Description |
|----------|------|-------------|
| `data` | `string` | The primary output of the tool. |
| `error` | `string` | (Optional) Error message if execution failed. |
| `metadata` | `object` | (Optional) Additional non-content data (e.g., cache status). |

## Common Mistakes
*   **Vague Descriptions**: Providing a short or ambiguous `description` often leads to the LLM failing to invoke the tool or invoking it with incorrect context.
*   **Ignoring AbortSignals**: Failing to check `ctx.signal` in long-running tools can lead to resource leaks when an agent run is cancelled.
*   **Missing Input Validation**: Not defining `required` fields in the `inputSchema` may result in the LLM omitting necessary parameters, causing runtime errors in the `call` function.
*   **Unbounded Results**: Returning massive JSON objects without setting `maxResultChars` or a `toolResultBudget` can crash the agent's context window.

## Next Steps
*   Explore concurrent execution using the `StreamingToolExecutor`.
*   Implement custom hooks for advanced tool monitoring.
*   Configure sandbox environments for tools using `ctx.exec`.