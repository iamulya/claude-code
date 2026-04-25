---
summary: The command-line interface for interacting with YAAF projects, including scaffolding, development, and management commands.
title: YAAF CLI
entity_type: concept
search_terms:
 - yaaf command line
 - how to start a yaaf project
 - scaffold new agent
 - yaaf dev mode
 - interactive agent REPL
 - yaaf init command
 - yaaf add tool
 - check agent context
 - yaaf slash commands
 - project generation
 - development server
 - manage yaaf components
stub: false
compiled_at: 2026-04-24T18:05:20.349Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/getting-started.md
compiled_from_quality: documentation
confidence: 0.9
---

## What It Is

The YAAF Command-Line Interface ([CLI](../subsystems/cli.md)) is a tool for creating, managing, and interacting with YAAF agent projects from a terminal [Source 1]. It provides commands for project scaffolding, adding components like [Tools](../subsystems/tools.md) and [Skills](./skills.md), running a development server, and inspecting an agent's state [Source 1]. The CLI is the primary entry point for developers to initialize a new project and manage its lifecycle [Source 1].

## How It Works in YAAF

The YAAF CLI becomes available after installing the `yaaf` npm package, either globally or as a project dependency [Source 1]. It offers several commands to streamline agent development.

### Project and Component Scaffolding

The CLI can generate a new project structure and add new components to an existing project.

*   `yaaf init <project-name>`: Creates a new YAAF project directory with a standard file structure, including `agent.ts`, `package.json`, and directories for tools and Skills [Source 1].
*   `yaaf init <project-name> --template <template-name>`: Initializes a project from a specific template, such as `personal-assistant` [Source 1].
*   `yaaf add tool <tool-name>`: Scaffolds a new tool file within the project's `src/tools/` directory [Source 1].
*   `yaaf add Skill <[[Skill]]-name>`: Scaffolds a new [Skill](../apis/skill.md) file (a Markdown file) in the `skills/` directory [Source 1].

### Development and Execution

The CLI provides different modes for running an agent.

*   `yaaf dev`: Starts an interactive REPL (Read-Eval-Print Loop) for development. This mode allows for real-time conversation with the agent and provides special "slash commands" for [Session Management](../subsystems/session-management.md) and inspection [Source 1].
*   `yaaf run`: Executes the agent in production mode [Source 1].

### Inspection and Status

Developers can use the CLI to inspect the agent's configuration and status.

*   `yaaf context list`: Shows the agent's context budget [Source 1].
*   `yaaf status`: Displays the current status of the project [Source 1].

### Interactive "Slash" Commands

[when](../apis/when.md) running in `yaaf dev` mode, a set of special commands, prefixed with a forward slash (`/`), are available to control the interactive session [Source 1].

| Command    | Description                                    |
| ---------- | ---------------------------------------------- |
| `/quit`    | Exits the REPL session.                        |
| `/clear`   | Clears the terminal screen and resets the conversation history. |
| `/tools`   | Lists all tools currently available to the agent. |
| `/context` | Displays the sections and token sizes of the [System Prompt](./system-prompt.md). |
| `/cost`    | Shows token usage and an estimated cost for the current session. |
| `/help`    | Displays a list of all available slash commands. |

[Source 1]

## Sources

[Source 1] `/Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/getting-started.md`