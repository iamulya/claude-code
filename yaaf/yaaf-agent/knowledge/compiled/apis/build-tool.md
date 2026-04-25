---
title: buildTool
entity_type: api
summary: A factory function to build a complete Tool instance from a partial definition, applying safe defaults.
export_name: buildTool
source_file: src/tools/tool.ts
category: function
search_terms:
 - create a tool
 - define agent tool
 - tool factory
 - tool definition
 - how to make a tool
 - ToolDef type
 - tool safe defaults
 - tool builder function
 - agent tool constructor
 - yaaf tool creation
 - tool schema
 - tool call method
 - isReadOnly tool property
stub: false
compiled_at: 2026-04-24T16:54:08.582Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/doctor.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/getting-started.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/cli/add.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/doctor/tools.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/agentTool.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/tool.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `buildTool` function is a factory for creating complete, production-ready `Tool` instances from a partial definition. It is the standard and recommended way to define [Tools](../subsystems/tools.md) in YAAF [Source 2].

The primary purpose of `buildTool` is to simplify tool creation by applying safe, "fail-closed" defaults for properties that are not explicitly provided in the definition. This ensures that tools are secure by default and requires developers to opt-in to more permissive behaviors [Source 6]. For example, a tool is assumed to have side effects (`isReadOnly: false`) and not be safe for concurrent execution (`isConcurrencySafe: false`) unless specified otherwise [Source 6].

This function is used throughout the YAAF framework, including for creating the internal tools for the YAAF Doctor agent and for wrapping agents as tools [Source 1, Source 4, Source 5].

Key defaults applied by `buildTool` include [Source 6]:
*   `isEnabled`: `true`
*   `isConcurrencySafe`: `false` (assumes the tool is not safe to run in parallel with others)
*   `isReadOnly`: `false` (assumes the tool has side effects)
*   `isDestructive`: `false`
*   `checkPermissions`: Returns a result that requires user approval
*   `userFacingName`: Defaults to the tool's `name`

## Signature

```typescript
export function buildTool<Input = Record<string, unknown>, Output = unknown>(
  def: ToolDef<Input, Output>,
): Tool<Input, Output>
```

### Parameters

*   **`def`** (`ToolDef<Input, Output>`): A partial tool definition object. While many properties of the full `Tool` interface are optional, a valid definition must include:
    *   `name`: A unique string identifier for the tool.
    *   `description`: A human-readable string explaining [when](./when.md) the [LLM](../concepts/llm.md) should use this tool.
    *   `inputSchema`: A JSON Schema object defining the tool's expected input.
    -   `call`: An asynchronous function that contains the tool's core logic. It receives the validated input and a `ToolContext` object.

The `ToolDef` type is a partial representation of the full `Tool` interface, allowing developers to omit properties for which `buildTool` provides a default [Source 6].

## Examples

### Basic Tool

This example creates a simple, read-only tool that greets a user by name. It provides the minimum required fields.

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
  // Explicitly mark as safe
  isReadOnly: () => true,
});
```
[Source 2]

### Advanced Tool with Safety Flags

This example defines a more complex `grep` tool. It explicitly sets safety-related properties like `isReadOnly` and `isConcurrencySafe` to `true`, overriding the safer defaults. It also includes a `describe` method to provide a human-readable description of a specific tool invocation.

```typescript
import { buildTool } from 'yaaf';

const grepTool = buildTool({
  name: 'grep',
  inputSchema: {
    type: 'object',
    properties: {
      pattern: { type: 'string' }
    },
    required: ['pattern'],
  },
  maxResultChars: 50_000,
  describe: (input) => `Search for "${input.pattern}"`,
  async call(input, ctx) {
    // ctx.exec would be provided by a runtime environment
    const result = await ctx.exec?.(`grep -rn "${input.pattern}" .`);
    return { data: result?.stdout ?? '' };
  },
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
});
```
[Source 6]

## See Also

*   The `Tool` interface, which represents the complete object returned by `buildTool`.
*   The `ToolDef` type, which defines the partial object passed to `buildTool`.

## Sources
[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/doctor.md
[Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/getting-started.md
[Source 3]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/[CLI](../subsystems/cli.md)/add.ts
[Source 4]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/doctor/tools.ts
[Source 5]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/agentTool.ts
[Source 6]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/tool.ts