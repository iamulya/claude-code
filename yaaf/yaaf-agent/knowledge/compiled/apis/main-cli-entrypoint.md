---
summary: The main entry point for the YAAF Command Line Interface (CLI).
primary_files:
 - src/cli/index.ts
 - src/cli/init.ts
 - src/cli/dev.ts
 - src/cli/add.ts
 - src/cli/context.ts
export_name: main
source_file: src/cli/index.ts
category: function
title: main (CLI Entrypoint)
entity_type: api
search_terms:
 - YAAF CLI
 - command line interface
 - yaaf init
 - yaaf dev
 - yaaf add
 - yaaf context
 - how to run yaaf commands
 - cli entrypoint
 - scaffolding a project
 - running dev server
 - adding components from cli
 - listing contexts
 - process.argv
stub: false
compiled_at: 2026-04-24T17:20:26.943Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/cli/index.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `main` function is the primary entry point for the YAAF Command Line Interface ([CLI](../subsystems/cli.md)). [when](./when.md) a user executes a `yaaf` command in their terminal, this function is responsible for parsing the command-line arguments and dispatching the request to the appropriate subcommand handler [Source 1].

Based on its dependencies, the `main` function routes to handlers for initializing a new project (`init`), running the development server (`dev`), adding new components (`add`), and managing contexts (`context`) [Source 1].

## Signature

```typescript
export async function main(argv: string[] = process.argv.slice(2)): Promise<void>
```

### Parameters

- **`argv`** `string[]` (optional)
  - An array of command-line arguments passed to the script.
  - It defaults to `process.argv.slice(2)`, which captures all arguments provided after the node executable and script name, the standard practice for CLI [Tools](../subsystems/tools.md) in Node.js [Source 1].

### Returns

- `Promise<void>`
  - The function returns a promise that resolves with no value upon completion of the CLI command [Source 1].

## Examples

The `main` function is not typically called directly in user code. Instead, it is invoked by running the `yaaf` executable from the command line.

### Initialize a new project

This command scaffolds a new YAAF agent project in a directory named `my-new-agent`.

```bash
yaaf init my-new-agent
```

### Run the development server

This command starts the YAAF development server in the current project directory.

```bash
yaaf dev
```

### Add a new component

This command adds a new component, such as a tool, to the current project.

```bash
yaaf add tool my-custom-tool
```

### List available contexts

This command lists the available contexts for the agent.

```bash
yaaf context list
```

## Sources

[Source 1]: src/cli/index.ts