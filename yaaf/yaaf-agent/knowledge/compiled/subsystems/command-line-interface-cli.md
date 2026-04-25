---
title: Command Line Interface (CLI)
entity_type: subsystem
summary: Provides command-line utilities for interacting with and developing YAAF agents.
primary_files:
 - src/cli/dev.ts
exports:
 - runDev
search_terms:
 - interactive agent development
 - REPL for agents
 - yaaf dev command
 - test agent in terminal
 - debug agent locally
 - inspect agent context
 - list agent tools
 - check token usage
 - command line tools
 - developer utilities
 - how to run agent locally
 - chat with agent in console
stub: false
compiled_at: 2026-04-24T18:10:34.003Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/cli/dev.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The Command Line Interface ([CLI](./cli.md)) subsystem provides command-line [Utilities](./utilities.md) to facilitate the development and testing of YAAF agents. Its primary function is to offer an interactive environment where developers can communicate with an agent directly from their terminal, inspect its state, and manage the conversation flow without needing a separate user interface [Source 1].

## Architecture

The core of the CLI subsystem is the `yaaf dev` command, implemented in `src/cli/dev.ts`. This utility leverages standard Node.js modules, including `node:readline` for creating the interactive terminal session, `node:path` for resolving file paths, and `node:fs` for file system operations like checking for and reading files. The main logic is encapsulated in the `runDev` function, which orchestrates the interactive Read-Eval-Print Loop (REPL) for the agent [Source 1].

## Key APIs

The primary user-facing component of this subsystem is the interactive REPL started by the `yaaf dev` command. It exposes several "slash commands" for developers to interact with the agent and the development environment [Source 1].

### REPL Commands

-   **User Input**: Typing any message and pressing Enter sends it to the agent for processing.
-   **/quit**: Exits the interactive session.
-   **/clear**: Resets the current conversation history.
-   **/context**: Displays the agent's [System Prompt](../concepts/system-prompt.md) for inspection.
-   **/[Tools](./tools.md)**: Lists the tools available to the agent.
-   **/cost**: Shows token usage statistics for the current session.

### Programmatic API

-   `runDev(args: string[]): Promise<void>`: The exported function that initializes and runs the development REPL [Source 1].

## Sources

[Source 1]: src/cli/dev.ts