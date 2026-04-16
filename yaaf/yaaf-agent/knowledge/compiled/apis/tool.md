---
title: Tool
entity_type: api
summary: The TypeScript interface defining the structure and behavior of a YAAF tool.
export_name: Tool
source_file: src/tools/tool.ts
category: type
stub: false
compiled_at: 2026-04-16T14:38:54.202Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/tools/tool.ts
confidence: 1
---

## Overview
The `Tool` interface is the core contract for extending agent capabilities within the YAAF framework. Every tool in the system conforms to this shape, allowing agents to interact with external systems, execute code, or perform data retrieval in a standardized way. 

The framework provides a `buildTool` factory function to instantiate tools with sensible, "fail-closed" defaults, ensuring that tool authors only need to implement the logic unique to their specific tool.

## Signature / Constructor

### Tool Interface
```typescript
export type Tool<Input = Record<string, unknown>, Output = unknown> = {
  readonly name: string
  readonly aliases?: string[]
  readonly inputSchema: ToolInput
  maxResultChars: number
  describe(input: Input): Promise<string> | string
  call(input: Input, context: ToolContext): Promise<ToolResult<Output>>
  validateInput?(input: Input, context: ToolContext): Promise<ValidationResult>
  checkPermissions(input: Input, context: ToolContext): Promise<PermissionResult>
  isEnabled(): boolean
  isConcurrencySafe(input: Input): boolean
  isReadOnly(input: Input): boolean
  isDestructive(input: Input): boolean
  userFacingName(input: Partial<Input> | undefined): string
  getActivityDescription?(input: Partial<Input> | undefined): string | null
  prompt?(): Promise<string> | string
}
```

### buildTool Factory
The `buildTool` function takes a `ToolDef` (a partial version of the `Tool` interface) and returns a complete `Tool` object with default values applied.

```typescript
export function buildTool<
  Input = Record<string, unknown>,
  Output = unknown,
>(def: ToolDef<Input, Output>): Tool<Input, Output>
```

## Methods & Properties

### Properties
| Property | Type | Description |
| :--- | :--- | :--- |
| `name` | `string` | Unique identifier for the tool (e.g., 'FileRead'). |
| `aliases` | `string[]` | Optional alternative names for backward compatibility. |
| `inputSchema` | `ToolInput` | JSON Schema defining the expected structure of the tool's input. |
| `maxResultChars` | `number` | The maximum character length of the result before it is truncated. |

### Methods
| Method | Signature | Description |
| :--- | :--- | :--- |
| `describe` | `(input: Input) => Promise<string> \| string` | Returns a human-readable description of what a specific invocation will do. |
| `call` | `(input: Input, context: ToolContext) => Promise<ToolResult<Output>>` | The primary execution logic for the tool. |
| `validateInput` | `(input: Input, context: ToolContext) => Promise<ValidationResult>` | Optional hook to validate input before permission checks or execution. |
| `checkPermissions` | `(input: Input, context: ToolContext) => Promise<PermissionResult>` | Determines if the current invocation requires explicit user permission. |
| `isEnabled` | `() => boolean` | Checks if the tool is available in the current environment. |
| `isConcurrencySafe` | `(input: Input) => boolean` | Indicates if the tool can run in parallel with other tools. |
| `isReadOnly` | `(input: Input) => boolean` | Indicates if the tool is free of side effects. |
| `isDestructive` | `(input: Input) => boolean` | Indicates if the tool performs irreversible operations. |
| `userFacingName` | `(input: Partial<Input> \| undefined) => string` | Returns a display name for the tool use in UI contexts. |
| `getActivityDescription` | `(input: Partial<Input> \| undefined) => string \| null` | Optional short description for progress indicators (e.g., "Reading file..."). |
| `prompt` | `() => Promise<string> \| string` | Optional contribution to the agent's base system prompt. |

## Examples

### Creating a Tool with buildTool
The following example demonstrates creating a search tool using the `buildTool` factory.

```typescript
import { buildTool } from './src/tools/tool';

const grepTool = buildTool({
  name: 'grep',
  inputSchema: { 
    type: 'object', 
    properties: { 
      pattern: { type: 'string' } 
    } 
  },
  maxResultChars: 50_000,
  describe: (input) => `Search for "${input.pattern}"`,
  async call(input, ctx) {
    const result = await ctx.exec?.(`grep -rn "${input.pattern}" .`);
    return { data: result?.stdout ?? '' };
  },
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
});
```

### Finding a Tool by Name
The `findToolByName` utility can be used to retrieve a tool from a collection by its name or one of its aliases.

```typescript
import { findToolByName } from './src/tools/tool';

const tools = [grepTool];
const tool = findToolByName(tools, 'grep');
```

## See Also
* `ToolDef`: The partial type used for defining tools before they are processed by the factory.
* `buildTool`: The standard factory function for tool creation.