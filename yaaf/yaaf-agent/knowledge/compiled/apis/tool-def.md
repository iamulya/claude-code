---
export_name: ToolDef
source_file: src/tools/tool.ts
category: type
summary: A partial tool definition type used to construct a complete Tool via `buildTool()`.
title: ToolDef
entity_type: api
search_terms:
 - define a new tool
 - create agent tool
 - buildTool function
 - tool definition object
 - custom tool implementation
 - agent capabilities
 - tool schema
 - partial tool type
 - tool configuration
 - how to make a tool
 - YAAF tool API
 - implementing a custom agent action
stub: false
compiled_at: 2026-04-24T17:44:59.490Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/tool.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`ToolDef` is a TypeScript type that represents a partial definition of a tool. It is the primary input for the `buildTool()` factory function, which simplifies the process of creating new [Tools](../subsystems/tools.md) for an agent [Source 1].

Instead of requiring developers to implement every property of the full `Tool` interface, `ToolDef` makes many properties optional. The `buildTool()` function then provides safe, "fail-closed" defaults for these optional properties. This allows developers to focus on the unique logic of their tool—its name, input schema, description, and execution logic—while relying on the framework for sensible defaults for behaviors like permissions, concurrency, and safety checks [Source 1].

## Signature

`ToolDef` is a utility type that makes a subset of the `Tool` interface's properties optional. The required properties are the essential components needed to define a tool's core functionality, while the optional properties allow for overriding default behaviors [Source 1].

```typescript
export type ToolDef<Input = Record<string, unknown>, Output = unknown> = Omit<
  Tool<Input, Output>,
  DefaultableKeys // An internal type representing keys with defaults
> &
  Partial<Pick<Tool<Input, Output>, DefaultableKeys>>;
```

### Required Properties

A valid `ToolDef` object must include the following properties:

*   `name: string`: A unique name for the tool (e.g., 'FileRead', 'BashTool').
*   `inputSchema: ToolInput`: A JSON Schema object describing the tool's input parameters.
*   `maxResultChars: number`: The maximum number of characters for the tool's output before it is truncated.
*   `describe(input: Input): Promise<string> | string`: A function that returns a human-readable description of what a specific tool invocation will do.
*   `call(input: Input, context: ToolContext): Promise<ToolResult<Output>>`: The asynchronous function that contains the core logic for executing the tool.

### Optional Properties

These properties can be provided to override the default behaviors set by `buildTool()`:

*   `aliases?: string[]`: An array of alternative names for the tool, useful for backward compatibility.
*   `validateInput?(input: Input, context: ToolContext): Promise<ValidationResult>`: Custom input validation logic.
*   `checkPermissions(input: Input, context: ToolContext): Promise<PermissionResult>`: Determines if the tool invocation requires user permission. The default is to always ask for permission.
*   `isEnabled(): boolean`: Checks if the tool is enabled in the current environment. Defaults to `true`.
*   `isConcurrencySafe(input: Input): boolean`: Indicates if the tool can run concurrently with others. Defaults to `false`.
*   `isReadOnly(input: Input): boolean`: Indicates if the tool only reads data and has no side effects. Defaults to `false`.
*   `isDestructive(input: Input): boolean`: Indicates if the tool performs irreversible operations. Defaults to `false`.
*   `userFacingName(input: Partial<Input> | undefined): string`: A user-friendly display name for the tool. Defaults to the tool's `name`.
*   `getActivityDescription?(input: Partial<Input> | undefined): string | null`: A short description for progress displays (e.g., "Reading src/foo.ts").
*   `prompt?(): Promise<string> | string`: A string to be injected into the agent's [System Prompt](../concepts/system-prompt.md), describing the tool's availability and usage.

## Examples

The most common use of `ToolDef` is to define a configuration object that is then passed to the `buildTool()` function to create a complete `Tool` instance.

```typescript
import { buildTool, ToolDef } from 'yaaf';

// Define the input type for our tool
interface GrepInput {
  pattern: string;
}

// Create a ToolDef object
const grepToolDef: ToolDef<GrepInput, string> = {
  name: 'grep',
  inputSchema: {
    type: 'object',
    properties: {
      pattern: { type: 'string', description: 'The pattern to search for.' }
    },
    required: ['pattern'],
  },
  maxResultChars: 50_000,
  describe: (input) => `Search for the pattern "${input.pattern}" in the current directory.`,
  async call(input, ctx) {
    // Assuming ctx.exec is a function to execute shell commands
    const result = await ctx.exec?.(`grep -rn "${input.pattern}" .`);
    return { data: result?.stdout ?? '' };
  },
  // Overriding defaults for safety and performance
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
};

// Create the final tool instance
const myGrepTool = buildTool(grepToolDef);
```

## See Also

*   `buildTool()`: The factory function that consumes a `ToolDef` to produce a complete `Tool` object.
*   `Tool`: The complete, fully-realized tool interface that all tools in the system conform to.

## Sources

[Source 1]: src/tools/tool.ts