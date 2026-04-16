---
title: findToolByName
entity_type: api
summary: Utility function to locate a tool within a collection by its name or alias.
export_name: findToolByName
source_file: src/tools/tool.ts
category: function
stub: false
compiled_at: 2026-04-16T14:39:00.981Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/tools/tool.ts
confidence: 0.9
---

## Overview
`findToolByName` is a utility function used to retrieve a specific tool instance from a collection of tools. It is designed to resolve tool references by checking both the primary name of the tool and its defined aliases. This is commonly used within agent runtimes to map an LLM's requested tool call to the corresponding implementation.

## Signature / Constructor
```typescript
export function findToolByName(
  tools: readonly Tool[],
  name: string,
): Tool | undefined
```

### Parameters
- `tools`: A read-only array of `Tool` objects to search.
- `name`: The string identifier to search for. This is compared against each tool's `name` property and its `aliases` array.

### Returns
Returns the first `Tool` object that matches the provided name or alias, or `undefined` if no match is found.

## Examples

### Basic Usage
This example demonstrates how to find a tool using its primary name or one of its aliases.

```typescript
import { findToolByName } from 'yaaf';

// Assuming a collection of tools exists
const tool = findToolByName(availableTools, 'FileRead');

if (tool) {
  console.log(`Found tool: ${tool.name}`);
} else {
  console.log('Tool not found');
}
```

### Finding by Alias
If a tool is defined with aliases, `findToolByName` will resolve those as well.

```typescript
// If a tool is defined as:
// { name: 'BashTool', aliases: ['shell', 'terminal'], ... }

const tool = findToolByName(availableTools, 'shell');
// Returns the BashTool instance
```

## See Also
- `Tool`
- `buildTool`