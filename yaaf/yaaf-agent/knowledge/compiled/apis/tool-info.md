---
title: ToolInfo
summary: Defines the structure for information about a single tool execution, including its name, input, and output.
export_name: ToolInfo
source_file: src/utils/toolSummary.ts
category: type
entity_type: api
search_terms:
 - tool execution data
 - tool call information
 - tool input and output
 - structure for tool results
 - how to represent a tool call
 - tool summary data structure
 - generateToolUseSummary input type
 - tool name, input, output
 - agent tool usage
 - logging tool calls
 - tool execution record
stub: false
compiled_at: 2026-04-24T17:44:59.748Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/toolSummary.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`ToolInfo` is a TypeScript type that defines the data structure for a single, completed [Tool Execution](../concepts/tool-execution.md) [Source 1]. It encapsulates the essential details of a tool call: the tool's name, the input it received, and the output it produced.

This type is primarily used to pass a collection of tool execution details to other [Utilities](../subsystems/utilities.md), such as the `generateToolUseSummary` function, which creates a human-readable summary of a batch of [Tool Calls](../concepts/tool-calls.md) [Source 1].

## Signature

`ToolInfo` is an object type with the following properties [Source 1]:

```typescript
export type ToolInfo = {
  name: string;
  input: unknown;
  output: unknown;
};
```

| Property | Type      | Description                               |
| :------- | :-------- | :---------------------------------------- |
| `name`   | `string`  | The name of the tool that was executed.   |
| `input`  | `unknown` | The arguments passed to the tool.         |
| `output` | `unknown` | The result returned by the tool execution.|

## Examples

### Basic `ToolInfo` Object

Here is an example of a single `ToolInfo` object representing a call to a `read_file` tool.

```typescript
import type { ToolInfo } from 'yaaf';

const readFileExecution: ToolInfo = {
  name: 'read_file',
  input: { path: 'src/config.json' },
  output: '{ "setting": "value" }'
};
```

### Usage with `generateToolUseSummary`

An array of `ToolInfo` objects is passed to the `tools` property of the `ToolSummaryConfig` [when](./when.md) generating a summary of tool usage [Source 1].

```typescript
import type { ToolInfo, ToolSummaryConfig } from 'yaaf';
import { generateToolUseSummary } from 'yaaf';
import { smallModel } from './my-models'; // Hypothetical model import

const toolExecutions: ToolInfo[] = [
  { 
    name: 'read_file', 
    input: { path: 'src/auth.ts' }, 
    output: '...' // file content
  },
  { 
    name: 'edit_file', 
    input: { path: 'src/auth.ts', changes: '...' }, 
    output: 'OK' 
  },
];

const summaryConfig: ToolSummaryConfig = {
  tools: toolExecutions,
  model: smallModel,
};

// const summary = await generateToolUseSummary(summaryConfig);
// Example summary: "Fixed auth validation in auth.ts"
```

## See Also

- `generateToolUseSummary`: A function that uses an array of `ToolInfo` objects to create a concise summary.
- `ToolSummaryConfig`: The configuration type for `generateToolUseSummary`, which includes a `tools` property of type `ToolInfo[]`.

## Sources

[Source 1]: src/utils/toolSummary.ts