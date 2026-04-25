---
summary: The complete Tool interface, defining the shape and capabilities of any tool in YAAF.
export_name: Tool
source_file: src/tools/tool.ts
category: type
title: Tool
entity_type: api
search_terms:
 - define a new tool
 - tool interface
 - how to create a tool
 - tool properties
 - tool methods
 - agent tool definition
 - buildTool function
 - tool schema
 - tool permissions
 - tool execution
 - tool lifecycle
 - concurrency safe tool
 - destructive tool
 - read-only tool
stub: false
compiled_at: 2026-04-24T17:44:38.069Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/tool.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/getting-started.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/server-runtime.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/coordinator.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/cli/add.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/authorization.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/types.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/sandbox.firecracker.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/sandbox.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/agentTool.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/openapi/naming.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/toolSummary.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `Tool` type is the complete interface that defines the shape and capabilities of any tool within the YAAF framework [Source 1]. Every tool provided to an agent must conform to this structure. It specifies not only the core execution logic (`call` method) but also metadata, input validation, permission checks, and behavioral flags that govern how the agent interacts with the tool [Source 1].

Tool authors typically do not implement this interface directly. Instead, they provide a partial definition (`ToolDef`) to the `buildTool` factory function. This factory fills in safe, "fail-closed" defaults for optional properties, ensuring that the resulting object is a valid and complete `Tool` [Source 1].

## Signature

The `Tool` type is a generic interface parameterized by its `Input` and `Output` types.

```typescript
export type Tool<Input = Record<string, unknown>, Output = unknown> = {
  /** Unique tool name (e.g., 'FileRead', 'BashTool') */
  readonly name: string;
  /** Optional aliases for backward compatibility */
  readonly aliases?: string[];
  /** JSON Schema for the tool's input */
  readonly inputSchema: ToolInput;
  /** Maximum result size in characters before truncation */
  maxResultChars: number;

  /** Human-readable description of what this tool invocation does */
  describe(input: Input): Promise<string> | string;

  /** Execute the tool */
  call(input: Input, context: ToolContext): Promise<ToolResult<Output>>;

  /** Validate input before execution. Called before checkPermissions. */
  validateInput?(input: Input, context: ToolContext): Promise<ValidationResult>;

  /** Check if this tool invocation requires user permission */
  checkPermissions(input: Input, context: ToolContext): Promise<PermissionResult>;

  /** Is this tool enabled in the current environment? */
  isEnabled(): boolean;
  /** Can this tool run concurrently with other [[[[[[[[Tools]]]]]]]]? */
  isConcurrencySafe(input: Input): boolean;
  /** Does this tool only read (no side effects)? */
  isReadOnly(input: Input): boolean;
  /** Does this tool perform irreversible operations? */
  isDestructive(input: Input): boolean;

  /** User-facing display name for this tool use */
  userFacingName(input: Partial<Input> | undefined): string;
  /** Short activity description for progress display (e.g., "Reading src/foo.ts") */
  getActivityDescription?(input: Partial<Input> | undefined): string | null;

  /** System prompt contribution — injected into the agent's base prompt */
  prompt?(): Promise<string> | string;
};
```
[Source 1]

### Properties

*   **`name: string`**: A unique, machine-readable name for the tool, such as `FileRead` or `BashTool`. This is used by the [LLM](../concepts/llm.md) to identify which tool to call [Source 1].
*   **`aliases?: string[]`**: An optional array of alternative names for the tool, useful for maintaining backward compatibility if a tool is renamed [Source 1].
*   **`inputSchema: ToolInput`**: A JSON Schema object that defines the structure, types, and constraints of the tool's input object. This schema is provided to the LLM so it can generate valid arguments [Source 1].
*   **`maxResultChars: number`**: The maximum number of characters allowed in the tool's output. If the result exceeds this limit, it will be truncated before being returned to the agent [Source 1].
*   **`describe(input): string | Promise<string>`**: A function that returns a human-readable description of a specific tool invocation. For example, for a file reading tool, it might return `Reading file "src/index.ts"` [Source 1].
*   **`call(input, context): Promise<ToolResult<Output>>`**: The core method that executes the tool's logic. It receives the validated input and a `ToolContext` object and must return a `ToolResult` containing the output data [Source 1].
*   **`validateInput?(input, context): Promise<ValidationResult>`**: An optional method for performing custom input validation before the tool is executed. This is called before `checkPermissions` [Source 1].
*   **`checkPermissions(input, context): Promise<PermissionResult>`**: A method to determine if the current invocation requires user permission. It can return `allow`, `deny`, or `ask` [Source 1].
*   **`isEnabled(): boolean`**: A function that returns `true` if the tool is available in the current environment. For example, a tool that requires a specific binary to be on the `PATH` would check for its existence here [Source 1].
*   **`isConcurrencySafe(input): boolean`**: A flag indicating whether this tool can be safely run in parallel with other Tools. Defaults to `false` [Source 1].
*   **`isReadOnly(input): boolean`**: A flag indicating that the tool has no side effects (e.g., it only reads data). Defaults to `false` [Source 1].
*   **`isDestructive(input): boolean`**: A flag indicating that the tool performs an irreversible operation, such as deleting a file. This can be used to trigger additional user confirmation steps. Defaults to `false` [Source 1].
*   **`userFacingName(input): string`**: A function that returns a user-friendly display name for the tool, which may be more descriptive than the programmatic `name` [Source 1].
*   **`getActivityDescription?(input): string | null`**: An optional function that returns a short, active description for progress displays, like "Reading src/foo.ts" [Source 1].
*   **`prompt?(): string | Promise<string>`**: An optional function that can contribute text to be injected into the agent's [System Prompt](../concepts/system-prompt.md), allowing tools to provide their own contextual information or instructions to the LLM [Source 1].

## Examples

### Basic Tool Definition

This example shows a simple `greetTool` created using the `buildTool` factory. It defines the essential properties: `name`, a description (inferred by the `buildTool` factory from a `description` property on `ToolDef`), `inputSchema`, and the `call` method. The `isReadOnly` flag is set to `true` to indicate it has no side effects.

```typescript
import { buildTool } from 'yaaf';

const greetTool = buildTool({
  name: 'greet',
  description: 'Greet someone by name',
  inputSchema: {
    type: 'object',
    properties: { name: { type: 'string' } },
    required: ['name'],
  },
  async call({ name }) {
    return { data: `Hello, ${name}! 👋` };
  },
  isReadOnly: () => true,
});
```
[Source 2]

### Advanced Tool with Behavioral Flags

This example demonstrates a more complex tool that uses several behavioral flags. It defines `maxResultChars`, provides a dynamic `describe` function, and sets both `isReadOnly` and `isConcurrencySafe` to `true`.

```typescript
import { buildTool } from 'yaaf';

const myTool = buildTool({
  name: 'grep',
  inputSchema: { 
    type: 'object', 
    properties: { pattern: { type: 'string' } } 
  },
  maxResultChars: 50_000,
  describe: (input) => `Search for "${input.pattern}"`,
  async call(input, ctx) {
    // The 'exec' utility would be available on the ToolContext
    const result = await ctx.exec?.(`grep -rn "${input.pattern}" .`);
    return { data: result?.stdout ?? '' };
  },
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
});
```
[Source 1]

## See Also

*   `buildTool`: The factory function used to create a complete `Tool` instance from a partial `ToolDef`. This is the recommended way to define tools.
*   `ToolDef`: A partial `Tool` type where properties with safe defaults are optional. This is the type passed to `buildTool`.
*   `agentTool`: A utility to wrap an entire `Agent` instance so it can be used as a `Tool` by another agent, enabling multi-[Agent Composition](../concepts/agent-composition.md).
*   `Agent`: The primary class that consumes an array of `Tool` objects to perform tasks.