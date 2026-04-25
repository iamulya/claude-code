---
summary: Scaffolds a new YAAF agent project with essential files and configurations.
export_name: initProject
source_file: src/cli/init.ts
category: function
title: initProject
entity_type: api
search_terms:
 - scaffold new project
 - create yaaf agent
 - initialize agent project
 - project boilerplate
 - getting started with yaaf
 - new agent setup
 - yaaf init command
 - project generator
 - starter template
 - how to start a new project
 - cli new project
stub: false
compiled_at: 2026-04-25T00:08:20.233Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/cli/index.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/cli/init.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `initProject` function is a utility for scaffolding a new YAAF agent project. It serves as the underlying implementation for the `yaaf init` command, which is part of the YAAF [CLI](../subsystems/cli.md) [Source 1, 2].

When executed, `initProject` creates a new directory containing a complete, working agent project structure. This boilerplate includes [Source 2]:
- TypeScript configuration (`tsconfig.json`).
- An entry point file with a sample [Agent](./agent.md).
- An example tool definition.
- A `SKILL.md` template for defining the agent's capabilities.
- A `SOUL.md` template for defining the agent's persona and core instructions.
- A basic test scaffold.

This function provides the recommended starting point for developers creating a new agent with YAAF, as it automates the setup of essential files and demonstrates a standard project layout [Source 2].

## Signature

```typescript
export async function initProject(nameArg?: string): Promise<void>;
```

**Parameters:**

- `nameArg` (optional `string`): The name of the directory to create for the new project. If this argument is not provided when called from the [CLI](../subsystems/cli.md), the user will be prompted to enter a name.

**Returns:**

- `Promise<void>`: A promise that resolves when the project scaffolding process has completed successfully.

## Examples

The primary and intended use of this function is through the YAAF [CLI](../subsystems/cli.md).

```bash
# Scaffold a new project in a directory named "my-new-agent"
yaaf init my-new-agent
```

While designed for the [CLI](../subsystems/cli.md), the function is exported and can be invoked programmatically if needed.

```typescript
import { initProject } from 'yaaf/cli';

async function setupProject() {
  console.log('Scaffolding new project...');
  await initProject('programmatic-agent');
  console.log('Project "programmatic-agent" created successfully.');
}

setupProject();
```

## See Also

- [CLI](../subsystems/cli.md): The command-line interface subsystem that exposes this functionality to the user.
- [addComponent](./add-component.md): A related [CLI](../subsystems/cli.md) function for adding new components, such as tools or agents, to an existing YAAF project.

## Sources

[Source 1]: src/cli/index.ts
[Source 2]: src/cli/init.ts