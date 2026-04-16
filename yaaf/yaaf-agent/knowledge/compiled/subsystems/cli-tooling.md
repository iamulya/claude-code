---
summary: The command-line interface for YAAF, providing tools for project initialization, development, and component management.
primary_files:
  - src/cli/index.ts
  - src/cli/init.ts
  - src/cli/dev.ts
  - src/cli/add.ts
  - src/cli/context.ts
title: CLI Tooling
entity_type: subsystem
exports:
  - main
stub: false
compiled_at: 2026-04-16T14:16:22.852Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/cli/index.ts
confidence: 0.95
---

## Purpose
The CLI Tooling subsystem provides a command-line interface for developers to interact with the YAAF framework. It serves as the primary entry point for lifecycle tasks such as bootstrapping new projects, managing agent components, and running development environments. By automating these tasks, the subsystem ensures consistent project structures and simplifies the integration of LLM-powered agents into TypeScript applications.

## Architecture
The subsystem is designed as a modular command dispatcher. It utilizes a central entry point that parses user input and delegates execution to specialized command modules.

### Key Components
- **Command Dispatcher (`index.ts`)**: Uses `node:util.parseArgs` to process command-line arguments and route them to the appropriate handler.
- **Project Initializer (`init.ts`)**: Handles the `init` command to scaffold new YAAF projects.
- **Development Runner (`dev.ts`)**: Manages the `dev` command, likely responsible for starting local development runtimes for agents.
- **Component Manager (`add.ts`)**: Implements the `add` command to inject new components or templates into an existing project.
- **Context Manager (`context.ts`)**: Provides utilities for listing or managing agent contexts via the `context` command.

## Key APIs
The CLI subsystem exposes a primary programmatic entry point for execution.

### `main(argv: string[]): Promise<void>`
The main execution function for the CLI. It accepts an array of strings (defaulting to `process.argv.slice(2)`) and performs the following:
1. Parses arguments and flags.
2. Identifies the requested command (e.g., `init`, `dev`, `add`).
3. Invokes the corresponding internal module logic.

## Sources
- `src/cli/index.ts`