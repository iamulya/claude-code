---
primary_files:
  - src/cli/add.ts
  - src/cli/context.ts
  - src/cli/dev.ts
title: CLI Subsystem
entity_type: subsystem
summary: Provides a suite of command-line tools for scaffolding, inspecting, and interacting with YAAF agents during development.
exports:
  - addComponent
  - contextList
  - runDev
stub: false
compiled_at: 2026-04-16T14:16:10.459Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/cli/add.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/cli/context.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/cli/dev.ts
confidence: 0.95
---

## Purpose
The CLI Subsystem serves as the primary developer interface for the YAAF framework. It facilitates the lifecycle of agent development by providing tools for project scaffolding, runtime inspection of context, and an interactive environment for testing agent behavior. It is designed to streamline the transition from agent definition to production-ready deployment by offering local debugging and generation utilities.

## Architecture
The subsystem is structured as a collection of modular command handlers, each responsible for a specific developer workflow:

- **Scaffolding Module (`add.ts`)**: Manages the creation of new framework entities. It uses templates to generate boilerplate code for tools and skills, ensuring they follow the framework's expected directory structure and type signatures.
- **Context Inspection Module (`context.ts`)**: Provides a diagnostic view of the agent's state. It scans the project directory for context sources and simulates the assembly process to show the final system prompt that would be delivered to a Language Model (LLM).
- **Development Runtime (`dev.ts`)**: Implements an interactive Read-Eval-Print Loop (REPL). This module integrates with the agent's runtime to allow developers to chat with their agents in a terminal environment.

## Key APIs
The CLI Subsystem exposes several primary functions that correspond to terminal commands:

### `addComponent(args: string[])`
Scaffolds new components into the project. It supports two primary sub-commands:
- `yaaf add tool <name>`: Generates a new TypeScript file containing a `buildTool` definition.
- `yaaf add skill <name>`: Generates a new `SKILL.md` file for agent behavior definition.

### `contextList()`
Scans the project for all active context sources and displays the assembled system prompt. This is used to verify that dynamic context injection is functioning as expected before running the agent.

### `runDev(args: string[])`
Starts an interactive session. While in the REPL, developers can use specialized slash-commands to inspect the agent's state:
- `/quit`: Terminate the session.
- `/clear`: Reset the current conversation history.
- `/context`: Display the current system prompt.
- `/tools`: List all tools currently registered with the agent.
- `/cost`: Show the accumulated token usage for the session.

## Extension Points
The CLI Subsystem interacts with the framework's core utilities to generate code. For example, when adding a tool, it utilizes the framework's internal scaffolding logic to produce a standard template:

```typescript
export const ${camelName}Tool = buildTool({
  name: '${name}',
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
    return `${name} result for: ${input.query}`;
  },
});
```