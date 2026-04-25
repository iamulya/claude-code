---
title: Building a CLI for Your YAAF Agent
entity_type: guide
summary: A step-by-step guide to creating command-line interfaces (CLIs) for YAAF agents using `createCLI` or `createInkCLI`.
difficulty: beginner
search_terms:
 - create command line interface
 - how to make a CLI for my agent
 - YAAF CLI runtime
 - yaaf/cli-runtime
 - yaaf/cli-ink
 - createCLI vs createInkCLI
 - terminal UI for agent
 - interactive agent shell
 - custom slash commands
 - agent history persistence
 - React terminal interface
 - Ink framework for CLI
 - toStreamableAgent function
 - stream agent output to console
stub: false
compiled_at: 2026-04-24T18:05:39.913Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/cli-runtime.md
compiled_from_quality: documentation
confidence: 0.98
---

## Overview

This guide provides instructions for packaging a YAAF agent into a polished, interactive command-line interface ([CLI](../subsystems/cli.md)). Developers can create a user-facing application similar to [Tools](../subsystems/tools.md) like `claude` or `aider` [Source 1].

YAAF offers two primary methods for building a CLI [Source 1]:
1.  **`createCLI`**: A lightweight, zero-dependency function for creating a simple, text-based chat interface.
2.  **`createInkCLI`**: A function that uses the Ink and React frameworks to build a premium terminal user interface with features like live re-rendering, in-place spinners for [Tool Calls](../concepts/tool-calls.md), and a persistent status footer.

By the end of this guide, you will be able to launch an interactive CLI for any YAAF agent.

## Prerequisites

- An instantiated YAAF `Agent` object.
- For the `createInkCLI` option, the following peer dependencies must be installed [Source 1]:
  ```bash
  npm install ink react ink-text-input ink-spinner
  ```

## Step-by-Step

### Step 1: Adapt the Agent for [Streaming](../concepts/streaming.md)

Both CLI runtimes are designed to work with streaming responses to provide a real-time, interactive experience. They expect a `StreamableAgent` that yields `RuntimeStreamEvent` objects [Source 1].

To adapt a standard `Agent`, use the `toStreamableAgent` utility function. This wrapper adds a `.runStream()` method to the agent, which the CLI runtimes use, while leaving the original `.run()` method intact [Source 1].

```typescript
import { Agent, toStreamableAgent } from 'yaaf';

// Assume 'agent' is a pre-configured YAAF Agent instance
const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
  // ... other configurations like tools
});

const streamableAgent = toStreamableAgent(agent);
```

The `streamableAgent` is now ready to be passed to either of the CLI creation functions.

### Step 2: Choose a [CLI Runtime](../subsystems/cli-runtime.md)

Select the runtime that best fits the project's needs.

| Feature | `createCLI` (`yaaf/cli-runtime`) | `createInkCLI` (`yaaf/cli-ink`) |
| :--- | :--- | :--- |
| **Dependencies** | Zero | `ink`, `react`, and others |
| **Streaming UI** | Appends text to stdout | Live re-rendering with cursor |
| **Tool Calls** | Simple text output | In-place spinners with status |
| **Stats** | Manual via `/cost` command | Persistent footer with live counters |
| **Best For** | Minimal, lightweight CLIs | Premium, rich user experiences |

[Source 1]

### Step 3: Implement the CLI

#### Option A: Building a Minimal CLI with `createCLI`

This option is ideal for projects where minimal dependencies are a priority.

1.  Import `createCLI` from `yaaf/cli-runtime`.
2.  Call the function, passing the `streamableAgent` and a configuration object.

The following example demonstrates a fully configured CLI with custom commands, hooks, and theming [Source 1].

```typescript
import { Agent, toStreamableAgent } from 'yaaf';
import { createCLI } from 'yaaf/cli-runtime';

// Assume searchTool and weatherTool are defined elsewhere
const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
  tools: [searchTool, weatherTool],
});

const streamableAgent = toStreamableAgent(agent);

createCLI(streamableAgent, {
  // Display settings
  name: 'my-assistant',
  greeting: '👋 Hello! How can I help?',
  promptString: 'you ▸ ',
  agentPrefix: 'bot ▸ ',

  // Enable streaming output
  streaming: true,

  // History persistence
  dataDir: '~/.my-assistant',
  maxHistory: 500,

  // Custom theme using ANSI escape codes
  theme: {
    promptColor: '\x1b[36m',   // cyan
    agentColor: '\x1b[35m',    // magenta
    systemColor: '\x1b[2m',    // dim
    errorColor: '\x1b[31m',    // red
  },

  // Lifecycle hooks
  beforeRun: async (input) => {
    // Can be used to inject context or transform input
    return input;
  },
  afterRun: async (input, response) => {
    // Can be used for analytics or logging
    console.log(`Logged interaction for input of length ${input.length}.`);
  },

  // Custom slash commands
  commands: {
    model: {
      description: 'Switch model',
      handler: async (args, ctx) => {
        ctx.print(`Switching to ${args}...`);
      },
    },
    export: {
      description: 'Export conversation',
      handler: async (_, ctx) => {
        ctx.print(`Exported ${ctx.messageCount} messages`);
      },
    },
  },

  // Cleanup logic
  onExit: async () => {
    console.log('CLI is shutting down.');
  },
});
```

#### Option B: Building a Rich CLI with `createInkCLI`

This option provides a more modern and dynamic user experience using React for the terminal.

1.  Ensure `ink`, `react`, `ink-text-input`, and `ink-spinner` are installed.
2.  Import `createInkCLI` from `yaaf/cli-ink`.
3.  Call the function with the `streamableAgent` and a configuration object. The configuration is simpler as many UI elements are handled automatically [Source 1].

```typescript
import { Agent, toStreamableAgent } from 'yaaf';
import { createInkCLI } from 'yaaf/cli-ink';

// Assume searchTool and weatherTool are defined elsewhere
const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
  tools: [searchTool, weatherTool],
});

const streamableAgent = toStreamableAgent(agent);

createInkCLI(streamableAgent, {
  name: 'my-bot',
  greeting: '👋 Hello! How can I help?',
  theme: {
    primary: 'cyan',
    secondary: 'magenta',
    accent: 'green',
    error: 'red',
    dim: 'gray',
  },
});
```

This code produces a rich interface with a header, interactive prompts, spinners for tool calls, and a persistent status bar [Source 1].

## Configuration Reference

### `createCLI` Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | `'agent'` | Agent display name |
| `greeting` | `string` | — | Welcome message displayed on startup |
| `streaming` | `boolean` | `false` | Enable streaming mode for agent responses |
| `promptString` | `string` | `'you ▸ '` | The string to display for the user prompt |
| `agentPrefix` | `string` | `'<name> ▸ '` | The prefix for the agent's response |
| `dataDir` | `string` | `~/.<name>` | Directory for persisting chat history and other data |
| `maxHistory` | `number` | `1000` | Maximum number of history entries to persist |
| `theme` | `CLITheme` | default | An object for custom ANSI color codes |
| `commands` | `Record<string, CLISlashCommand>` | — | Custom slash commands |
| `beforeRun` | `(input) => string` | — | Hook to pre-process user input |
| `afterRun` | `(input, response) => void` | — | Hook to post-process after a run completes |
| `onExit` | `() => void` | — | Hook for cleanup logic on shutdown |

[Source 1]

### `createCLI` Built-in Commands

| Command | Description |
| :--- | :--- |
| `/quit`, `/q`, `/exit` | Exit the CLI |
| `/clear` | Clear the terminal screen |
| `/help` | Show available custom and built-in commands |
| `/history` | Show recent conversation history |

[Source 1]

### `createInkCLI` Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | `'agent'` | Agent display name |
| `greeting` | `string` | — | Welcome message displayed on startup |
| `theme` | `InkCLITheme` | default | Color theme using Ink color names (e.g., 'cyan') |
| `beforeRun` | `(input) => string` | — | Hook to pre-process user input |
| `afterRun` | `(input, response) => void` | — | Hook to post-process after a run completes |

[Source 1]

## Common Mistakes

1.  **Forgetting `toStreamableAgent`**: Passing a standard `Agent` instance directly to `createCLI` or `createInkCLI` will cause an error. These functions require a `StreamableAgent`. Always wrap the agent with `toStreamableAgent` first.
2.  **Missing Dependencies for `createInkCLI`**: Attempting to use `createInkCLI` without installing `ink`, `react`, `ink-text-input`, and `ink-spinner` will result in module resolution errors at runtime.
3.  **Incorrect Theme Color Format**: The `theme` object for `createCLI` expects raw ANSI escape code strings (e.g., `'\x1b[36m'`), while `createInkCLI` expects Ink's named colors as strings (e.g., `'cyan'`). Using the wrong format will result in incorrect or no coloring [Source 1].

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/cli-runtime.md