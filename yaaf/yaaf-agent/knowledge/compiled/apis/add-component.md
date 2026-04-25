---
title: addComponent
summary: Asynchronously handles the `yaaf add` CLI command to scaffold new tools or skills.
export_name: addComponent
source_file: src/cli/add.ts
category: function
entity_type: api
search_terms:
 - scaffold new component
 - yaaf add command
 - create new tool
 - generate skill file
 - CLI for adding tools
 - how to add a tool
 - how to add a skill
 - tool scaffolding
 - skill scaffolding
 - command line interface add
 - yaaf cli
 - code generation
stub: false
compiled_at: 2026-04-24T16:46:58.946Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/cli/add.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `addComponent` function is the underlying implementation for the `yaaf add` command-line interface ([CLI](../subsystems/cli.md)) command [Source 1]. Its purpose is to automate the creation of new YAAF components, such as [Tools](../subsystems/tools.md) and [Skill](./skill.md)s, by generating boilerplate files. This saves developers time and ensures a consistent structure for new components.

This function is not typically called directly in application code. Instead, it is invoked by the [YAAF CLI](../concepts/yaaf-cli.md) [when](./when.md) a developer runs a command like `yaaf add tool <name>` or `yaaf add skill <name>` [Source 1].

## Signature

The function takes an array of strings, which are the arguments passed from the command line, and returns a promise that resolves when the file operations are complete [Source 1].

```typescript
export async function addComponent(args: string[]): Promise<void>;
```

**Parameters:**

*   `args` (`string[]`): An array of command-line arguments that follow the `yaaf add` command. For example, `['tool', 'myNewTool']`.

**Returns:**

*   `Promise<void>`: A promise that resolves with no value upon successful creation of the component file(s).

## Examples

The following examples demonstrate how `addComponent` is used via the YAAF CLI.

### Scaffolding a New Tool

To generate a new tool, a developer would run the following command in their terminal:

```bash
yaaf add tool myApiTool
```

This command invokes `addComponent` with the arguments `['tool', 'myApiTool']`. The function then creates a new TypeScript file (e.g., in a `tools/` directory) with the following boilerplate content, ready for the developer to implement the tool's logic [Source 1].

```typescript
import { buildTool } from 'yaaf';

export const myApiToolTool = buildTool({
 name: 'myApiTool',
 description: '[Describe when the LLM should use this tool]',
 inputSchema: {
 type: 'object',
 properties: {
 query: {
 type: 'string',
 description: '[Describe the input]',
 },
 },
 required: ['query'],
 },
 execute: async (input) => {
 // Implement your tool logic here
 return `myApiTool result for: ${input.query}`;
 },
});
```

### Scaffolding a New Skill

To generate a new skill definition file, a developer would run:

```bash
yaaf add skill myAnalysisSkill
```

This command invokes `addComponent` with `['skill', 'myAnalysisSkill']`. The function then creates a new markdown file (e.g., `skills/myAnalysisSkill.md`) where the developer can define the skill's purpose, instructions, and examples for the agent [Source 1].

## Sources

[Source 1]: src/cli/add.ts