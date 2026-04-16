---
title: Building a CLI Agent
entity_type: guide
summary: How to transform a YAAF agent into a standalone CLI tool using the built-in runtime options.
difficulty: intermediate
stub: false
compiled_at: 2026-04-16T14:05:53.525Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/cli-runtime.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/runtime/cli.ts
confidence: 1
---

## Overview
YAAF provides built-in runtimes to transform LLM-powered agents into standalone terminal applications. Developers can choose between a lightweight, zero-dependency interface (`createCLI`) or a premium, React-based terminal UI (`createInkCLI`) that supports live re-rendering and persistent status footers.

This guide covers how to wrap a YAAF agent in these runtimes, configure streaming, persist conversation history, and implement custom slash commands.

## Prerequisites
*   A YAAF project with `yaaf` installed.
*   An initialized `Agent` instance.
*   For the premium UI: `ink`, `react`, `ink-text-input`, and `ink-spinner` installed.

## Step-by-Step

### 1. Prepare the Streamable Agent
Both CLI runtimes require a `StreamableAgent` to handle real-time token output and tool execution events. Use the `toStreamableAgent` utility to adapt a standard agent.

```typescript
import { Agent, toStreamableAgent } from 'yaaf';

const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
  tools: [/* your tools */],
});

const streamable = toStreamableAgent(agent);
```

### 2. Implement a Standard CLI
The `createCLI` runtime is the lightweight option. It features an interactive REPL, history persistence, and support for slash commands without requiring external UI dependencies.

```typescript
import { createCLI } from 'yaaf/cli-runtime';

createCLI(streamable, {
  name: 'my-assistant',
  greeting: '👋 Hello! How can I help?',
  promptString: 'you ▸ ',
  agentPrefix: 'bot ▸ ',
  streaming: true,
  dataDir: '~/.my-assistant',
  theme: {
    promptColor: '\x1b[36m',   // cyan
    agentColor: '\x1b[35m',    // magenta
  }
});
```

### 3. Implement a Premium CLI (Ink)
For a more polished experience similar to modern AI coding tools, use `createInkCLI`. This runtime provides live re-rendering, in-place spinners for tool calls, and a persistent footer showing token usage and latency.

First, install the required dependencies:
```bash
npm install ink react ink-text-input ink-spinner
```

Then, initialize the runtime:
```typescript
import { createInkCLI } from 'yaaf/cli-ink';

createInkCLI(streamable, {
  name: 'my-bot',
  greeting: '👋 Hello! How can I help?',
  theme: {
    primary: 'cyan',
    secondary: 'magenta',
    accent: 'green',
  },
});
```

### 4. Adding Custom Slash Commands
The standard `createCLI` runtime allows developers to extend the interface with custom commands. These are triggered by typing `/` followed by the command name in the terminal.

```typescript
createCLI(streamable, {
  commands: {
    export: {
      description: 'Export conversation',
      handler: async (args, ctx) => {
        // ctx provides access to the current session state
        ctx.print(`Exported ${ctx.messageCount} messages`);
      },
    },
  },
});
```

## Configuration Reference

### createCLI Options
| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | `'agent'` | Agent display name |
| `greeting` | `string` | — | Welcome message shown on startup |
| `streaming` | `boolean` | `false` | Enable real-time token streaming |
| `promptString` | `string` | `'you ▸ '` | User input indicator |
| `agentPrefix` | `string` | `'<name> ▸ '` | Prefix for agent responses |
| `dataDir` | `string` | `~/.<name>` | Directory for history and session data |
| `maxHistory` | `number` | `1000` | Maximum number of persisted history entries |
| `commands` | `Record<string, CLISlashCommand>` | — | Custom slash command definitions |
| `beforeRun` | `(input) => string` | — | Hook to modify input before the agent runs |
| `afterRun` | `(input, response) => void` | — | Hook for analytics or post-processing |
| `onExit` | `() => void` | — | Cleanup hook for graceful shutdown |

### Built-in Slash Commands
The following commands are available by default in the standard CLI:
*   `/quit`, `/q`, `/exit`: Terminate the application.
*   `/clear`: Clear the terminal screen.
*   `/help`: List all available commands and descriptions.
*   `/history`: Display recent conversation history.

## Common Mistakes
*   **Missing Ink Dependencies**: Attempting to use `createInkCLI` without installing `ink` and `react` will result in runtime errors.
*   **Data Directory Permissions**: If `dataDir` is set to a path the process cannot write to, history persistence will fail.
*   **Streaming Mismatch**: Enabling `streaming: true` in the config without using `toStreamableAgent` may lead to unexpected output behavior, as the runtime expects `RuntimeStreamEvent` objects.

## Next Steps
*   Explore the `Agent` configuration to add tools that the CLI can execute.
*   Implement custom `beforeRun` hooks to inject system context or user metadata into every CLI prompt.
*   Learn about `RuntimeStreamEvent` types to build custom UI components for the Ink runtime.