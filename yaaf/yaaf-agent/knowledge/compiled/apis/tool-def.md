---
title: ToolDef
entity_type: api
summary: A type representing a partial tool definition used as input for the buildTool factory.
export_name: ToolDef
source_file: src/tools/tool.ts
category: type
stub: false
compiled_at: 2026-04-16T14:38:58.186Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/tools/tool.ts
confidence: 0.9
---

## Overview
`ToolDef` is a TypeScript type used to define the configuration and logic for a tool before it is processed by the `buildTool` factory. It represents a partial version of the `Tool` interface, where core execution logic and metadata are required, but operational behaviors (such as concurrency safety or permission checks) are optional.

When a developer provides a `ToolDef` to `buildTool`, the framework populates missing fields with "fail-closed" safe defaults. This ensures that all tools in the system conform to a consistent interface while minimizing boilerplate for tool authors.

## Signature
```typescript
export type ToolDef<Input = Record<string, unknown>, Output = unknown> =
  Omit<Tool<Input, Output>, DefaultableKeys> &
  Partial<Pick<Tool<Input, Output>, DefaultableKeys>>
```

### Generics
| Parameter | Description | Default |
| :--- | :--- | :--- |
| `Input` | The shape of the arguments passed to the tool. | `Record<string, unknown>` |
| `Output` | The shape of the data returned by the tool's execution. | `unknown` |

## Methods & Properties

### Required Properties
The following properties must be defined in a `ToolDef`:
*   **name**: A unique string identifier for the tool (e.g., 'FileRead').
*   **inputSchema**: A JSON Schema object defining the expected structure of the `Input` generic.
*   **maxResultChars**: A number specifying the maximum allowed length of the tool's output string before truncation occurs.
*   **describe(input)**: A function returning a human-readable string describing what a specific invocation will do.
*   **call(input, context)**: The primary execution logic of the tool. It receives the validated input and a `ToolContext`, returning a `Promise<ToolResult<Output>>`.

### Optional Properties
These properties are optional in `ToolDef`. If omitted, `buildTool` provides default values:
*   **isEnabled()**: Determines if the tool is available in the current environment. Defaults to `true`.
*   **isConcurrencySafe(input)**: Indicates if the tool can run simultaneously with others. Defaults to `false`.
*   **isReadOnly(input)**: Indicates if the tool is free of side effects. Defaults to `false`.
*   **isDestructive(input)**: Indicates if the tool performs irreversible operations. Defaults to `false`.
*   **checkPermissions(input, context)**: Logic to determine if the user must grant explicit permission. Defaults to allowing execution (deferring to the global permission system).
*   **userFacingName(input)**: A display name for the tool use in UI components. Defaults to the tool's `name`.
*   **aliases**: An optional array of strings for backward compatibility.
*   **validateInput(input, context)**: Optional pre-execution validation logic.
*   **getActivityDescription(input)**: Optional short string for progress indicators.
*   **prompt()**: Optional system prompt contribution injected into the agent's base prompt.

## Examples

### Defining a Basic Tool
This example demonstrates a `ToolDef` for a simple search tool. Note that operational flags like `isReadOnly` are explicitly set to override defaults.

```typescript
import { ToolDef, buildTool } from './src/tools/tool';

const searchToolDef: ToolDef<{ query: string }> = {
  name: 'web_search',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string' }
    },
    required: ['query']
  },
  maxResultChars: 10000,
  describe: (input) => `Searching the web for: ${input.query}`,
  async call(input, context) {
    // Implementation logic
    return { data: "Search results..." };
  },
  isReadOnly: () => true,
  isConcurrencySafe: () => true
};

const webSearchTool = buildTool(searchToolDef);
```

## See Also
* `Tool`
* `buildTool`