---
title: createCLI
entity_type: api
summary: A zero-dependency function to create a lightweight, streaming-capable CLI for a YAAF agent.
export_name: createCLI
source_file: src/cli-runtime.ts
category: function
stub: false
compiled_at: 2026-04-16T14:05:31.998Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/cli-runtime.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/cli-runtime.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/runtime/cli.ts
confidence: 1
---

## Overview
`createCLI` is a utility function used to wrap a YAAF agent in a terminal-based interface. It provides a REPL (Read-Eval-Print Loop) environment with support for persistent chat history, streaming token rendering, and tool execution status indicators. 

The function is designed to be lightweight with zero external dependencies, relying on Node.js built-in modules such as `readline`. It includes built-in slash commands for session management and allows for custom command extensions, input/output hooks, and ANSI-based theming.

Key features include:
* **Interactive REPL**: History persistence and navigation.
* **Streaming Support**: Real-time rendering of LLM tokens.
* **Tool Visualization**: Indicators for tool call starts, completions, and errors.
* **Permission Handling**: Support for user prompts before executing operations.
* **Slash Commands**: Built-in commands like `/help`, `/clear`, and `/quit`.

## Signature / Constructor

```typescript
function createCLI(agent: StreamableAgent, config: CLIConfig): void
```

### Parameters

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `agent` | `StreamableAgent` | The agent instance to run. Standard agents can be adapted using `toStreamableAgent`. |
| `config` | `CLIConfig` | Configuration object for display, behavior, and hooks. |

### CLIConfig Interface

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | `'agent'` | The display name of the agent. |
| `greeting` | `string` | — | Optional welcome message displayed on startup. |
| `streaming` | `boolean` | `false` | Whether to enable real-time token streaming. |
| `promptString` | `string` | `'you ▸ '` | The string prefix for user input. |
| `agentPrefix` | `string` | `'<name> ▸ '` | The string prefix for agent responses. |
| `dataDir` | `string` | `~/.<name>` | Directory for persisting history and session data. |
| `maxHistory` | `number` | `1000` | Maximum number of history entries to persist. |
| `theme` | `CLITheme` | — | ANSI color configuration for the interface. |
| `commands` | `Record<string, CLISlashCommand>` | — | Custom slash commands. |
| `beforeRun` | `(input: string) => Promise<string> \| string` | — | Hook to transform input before sending to the agent. |
| `afterRun` | `(input: string, response: string) => Promise<void> \| void` | — | Hook for post-processing or analytics. |
| `onExit` | `() => Promise<void> \| void` | — | Cleanup hook called during shutdown. |

### CLITheme Interface

| Property | Type | Description |
| :--- | :--- | :--- |
| `promptColor` | `string` | ANSI escape code for the user prompt. |
| `agentColor` | `string` | ANSI escape code for the agent response. |
| `systemColor` | `string` | ANSI escape code for system messages (e.g., tool calls). |
| `errorColor` | `string` | ANSI escape code for error messages. |

## Built-in Slash Commands

The CLI runtime includes several reserved slash commands:

| Command | Description |
| :--- | :--- |
| `/quit`, `/q`, `/exit` | Terminates the CLI session. |
| `/clear` | Clears the terminal screen. |
| `/help` | Displays available built-in and custom commands. |
| `/history` | Displays recent conversation history. |

> **Note on Discrepancies**: Source material contains conflicting information regarding the `/cost` and `/context` commands. One source indicates `/cost` is a manual command in `createCLI`, while another lists it as a built-in slash command alongside `/context`.

## Examples

### Basic Usage
This example demonstrates wrapping a standard agent with streaming enabled and a custom greeting.

```typescript
import { Agent, toStreamableAgent } from 'yaaf';
import { createCLI } from 'yaaf/cli-runtime';

const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
});

createCLI(toStreamableAgent(agent), {
  name: 'assistant',
  greeting: '👋 Hello! How can I help?',
  streaming: true,
  dataDir: '~/.assistant-data',
});
```

### Custom Commands and Hooks
This example shows how to extend the CLI with custom slash commands and lifecycle hooks.

```typescript
createCLI(toStreamableAgent(agent), {
  theme: {
    promptColor: '\x1b[36m', // cyan
    agentColor: '\x1b[35m',  // magenta
  },
  beforeRun: async (input) => {
    console.log('Processing input...');
    return input;
  },
  commands: {
    export: {
      description: 'Export conversation',
      handler: async (args, ctx) => {
        ctx.print(`Exported ${ctx.messageCount} messages`);
      },
    },
  },
  onExit: async () => {
    console.log('Shutting down...');
  },
});
```

## Sources
1. `docs/cli-runtime.md`: Documentation on CLI options and comparison between `createCLI` and `createInkCLI`.
2. `src/cli-runtime.ts`: Module entry point and export definitions.
3. `src/runtime/cli.ts`: Implementation details regarding REPL features and built-in commands.