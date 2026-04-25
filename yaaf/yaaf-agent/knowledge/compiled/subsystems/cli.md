---
title: CLI
summary: Provides command-line interface tools for interacting with YAAF projects and agents.
primary_files:
 - src/cli/context.ts
entity_type: subsystem
exports:
 - contextList
search_terms:
 - command line interface
 - yaaf cli
 - how to inspect system prompt
 - view agent context
 - debug system prompt
 - list context sources
 - yaaf context list command
 - developer tooling
 - project inspection
 - cli tools
stub: false
compiled_at: 2026-04-24T18:10:17.384Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/cli/context.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Purpose

The Command-Line Interface (CLI) subsystem provides developers with [Tools](./tools.md) to interact with and inspect YAAF projects from the command line [Source 1]. Its primary purpose is to offer [Utilities](./utilities.md) that aid in development and debugging. One of its key functions is to allow developers to see the fully assembled [System Prompt](../concepts/system-prompt.md) that would be used by an agent at runtime, by scanning the project for all configured [Context Sources](../concepts/context-sources.md) [Source 1].

## Architecture

The CLI is structured into modules, with specific commands implemented in their own files. For example, the logic for the `context list` command is contained within `src/cli/context.ts` [Source 1]. This module utilizes Node.js built-in modules such as `path` for resolving file paths and `fs` for reading the file system (e.g., `existsSync`, `readFileSync`, `readdirSync`) [Source 1]. This indicates that the CLI operates by directly interacting with the project's file structure to gather information.

## Key APIs

The primary functions in this subsystem correspond to the commands available to the user.

- **`contextList()`**: Implements the `yaaf context list` command. This function scans the project, identifies all context sources, and displays the aggregated content that would be injected into the agent's system prompt [Source 1].

## Sources

[Source 1]: src/cli/context.ts