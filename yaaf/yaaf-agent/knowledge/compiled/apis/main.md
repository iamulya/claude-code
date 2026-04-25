---
summary: The main entry point for the YAAF CLI, responsible for parsing arguments and dispatching to sub-commands.
export_name: main
source_file: src/cli/index.ts
category: function
title: main
entity_type: api
search_terms:
 - CLI entry point
 - command line interface main function
 - start YAAF CLI
 - yaaf command
 - process.argv
 - argument parsing
 - dispatch commands
 - init command
 - dev command
 - add command
 - context command
 - how to run yaaf from code
 - programmatic CLI execution
stub: false
compiled_at: 2026-04-25T00:08:48.086Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/cli/index.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `main` function serves as the primary entry point for the YAAF [Command-Line Interface](../subsystems/cli.md). Its responsibility is to parse command-line arguments and delegate execution to the appropriate sub-command handler.

Based on the provided arguments, it can dispatch to commands such as `init`, `dev`, `add`, and `context` [Source 1]. This function is typically executed automatically when running YAAF from a terminal, but it can also be invoked programmatically to integrate the CLI into other scripts.

## Signature

The function is asynchronous and accepts an array of string arguments.

```typescript
export async function main(argv?: string[]): Promise<void>;
```

**Parameters:**

- `argv` (optional): `string[]` - An array of command-line arguments. If not provided, it defaults to `process.argv.slice(2)`, which captures all arguments passed to the Node.js process after the executable and script name [Source 1].

**Returns:**

- `Promise<void>`: A promise that resolves when the command has finished executing.

## Examples

While `main` is usually run implicitly from the command line, it can be called directly from TypeScript/JavaScript code.

### Programmatically Running the Dev Server

This example shows how to start the development server by passing the `dev` command to the `main` function.

```typescript
import { main } from 'yaaf';

async function startDevServer() {
  console.log('Starting YAAF dev server programmatically...');
  await main(['dev']);
  console.log('Dev server has shut down.');
}

startDevServer();
```

### Programmatically Adding a New Component

This example demonstrates how to invoke the `add component` sub-command to scaffold a new file.

```typescript
import { main } from 'yaaf';

async function addNewTool() {
  console.log('Adding a new tool named "my-api-tool"...');
  await main(['add', 'tool', 'my-api-tool']);
  console.log('Tool scaffolding complete.');
}

addNewTool();
```

## See Also

- [CLI](../subsystems/cli.md): The command-line interface subsystem.
- [runDev](./run-dev.md): The handler for the `dev` command.
- [addComponent](./add-component.md): The handler for the `add` command.
- [contextList](./context-list.md): The handler for the `context list` command.

## Sources

[Source 1]: src/cli/index.ts