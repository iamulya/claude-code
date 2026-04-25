---
title: CLI Add Subsystem
summary: Provides command-line functionality for scaffolding new YAAF tools and skills within a project.
primary_files:
 - src/cli/add.ts
entity_type: subsystem
exports:
 - addComponent
search_terms:
 - scaffold new tool
 - generate skill file
 - yaaf add command
 - command line interface tool generation
 - create a new tool
 - how to add a skill
 - CLI scaffolding
 - project boilerplate
 - code generation
 - add tool to agent
 - add skill to agent
stub: false
compiled_at: 2026-04-24T18:10:24.718Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/cli/add.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The [CLI](./cli.md) Add Subsystem provides developers with a command-line interface for scaffolding new components within a YAAF project. Its primary function is to automate the creation of boilerplate files for [Tools](./tools.md) and [Skills](../concepts/skills.md), reducing manual setup and ensuring a consistent project structure [Source 1]. The subsystem is invoked via the `yaaf add` command [Source 1].

## Architecture

The subsystem's logic is primarily contained in the `src/cli/add.ts` file. It is designed to be executed from the command line and uses Node.js file system modules like `writeFile`, `mkdir`, and `existsSync` to create files and directories in the user's project structure [Source 1].

[when](../apis/when.md) a developer runs `yaaf add tool <name>`, the subsystem generates a new TypeScript file containing a tool definition. This generated code uses a template that leverages the `buildTool` function from the core YAAF framework. The template includes placeholders for the tool's name, description, input schema, and the `execute` function where the developer implements the tool's logic [Source 1].

The main exported function, `addComponent`, is responsible for parsing the command-line arguments (e.g., `tool`, `skill`, and the component name) and triggering the appropriate file generation process [Source 1].

## Key APIs

The primary public interface for this subsystem is the command line itself [Source 1]:

*   `yaaf add tool <name>`: Scaffolds a new tool file.
*   `yaaf add skill <name>`: Scaffolds a new `SKILL.md` file.

Internally, the key function that orchestrates this process is:

*   `addComponent(args: string[]): Promise<void>`: The entry point function that receives the command-line arguments and executes the scaffolding logic [Source 1].

The generated tool template makes use of the core `buildTool` API to define the new tool [Source 1].

## Sources

[Source 1]: src/cli/add.ts