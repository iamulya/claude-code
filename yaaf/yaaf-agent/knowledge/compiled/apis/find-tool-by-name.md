---
export_name: findToolByName
source_file: src/tools/tool.ts
category: function
summary: A utility function to find a Tool by its name or alias within an array of tools.
title: findToolByName
entity_type: api
search_terms:
 - look up tool
 - get tool by name
 - find tool by alias
 - search for a tool
 - tool lookup utility
 - how to select a tool
 - tool collection management
 - tool name resolution
 - tool alias lookup
 - programmatically find tool
 - resolve tool name
 - tool registry search
stub: false
compiled_at: 2026-04-24T17:06:53.594Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/tools/tool.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `findToolByName` function is a utility for searching an array of `Tool` objects to find a specific tool. It matches against both the tool's primary `name` property and any optional `aliases` it may have. This is useful for dynamically selecting a tool for execution based on a string identifier, such as one provided by an [LLM](../concepts/llm.md) or user input.

The function performs a case-sensitive search and returns the first tool that matches the provided name. If no tool in the array has a matching name or alias, it returns `undefined`.

## Signature

```typescript
export function findToolByName(
  Tools: readonly Tool[],
  name: string
): Tool | undefined;
```

### Parameters

-   **`Tools`**: `readonly Tool[]`
    An array of `Tool` objects to search within.

-   **`name`**: `string`
    The name or alias of the tool to find.

### Returns

-   `Tool | undefined`
    The first `Tool` object from the array that matches the given `name` or `alias`. Returns `undefined` if no match is found.

## Examples

The following example demonstrates how to use `findToolByName` to locate [Tools](../subsystems/tools.md) in a collection by their primary name and by an alias.

```typescript
import { buildTool, findToolByName, Tool } from 'yaaf';

// Define a couple of tools for demonstration purposes.
const fileReaderTool = buildTool({
  name: 'FileReader',
  aliases: ['read_file'],
  inputSchema: { type: 'object', properties: { path: { type: 'string' } } },
  maxResultChars: 10000,
  describe: (input) => `Read the file at ${input.path}`,
  async call(input) {
    // Implementation would go here
    return { data: `Contents of ${input.path}` };
  },
});

const commandExecutorTool = buildTool({
  name: 'CommandExecutor',
  inputSchema: { type: 'object', properties: { command: { type: 'string' } } },
  maxResultChars: 10000,
  describe: (input) => `Execute the command: ${input.command}`,
  async call(input) {
    // Implementation would go here
    return { data: `Output of ${input.command}` };
  },
});

const tools: readonly Tool[] = [fileReaderTool, commandExecutorTool];

// 1. Find a tool by its primary name
const foundByName = findToolByName(tools, 'CommandExecutor');
console.log(foundByName?.name);
// Expected output: 'CommandExecutor'

// 2. Find a tool by one of its aliases
const foundByAlias = findToolByName(tools, 'read_file');
console.log(foundByAlias?.name);
// Expected output: 'FileReader'

// 3. Attempt to find a tool that does not exist
const notFound = findToolByName(tools, 'NonExistentTool');
console.log(notFound);
// Expected output: undefined
```

## See Also

-   `Tool` type: The interface for all tools in the framework.
-   `buildTool` function: The factory for creating well-formed `Tool` objects.