---
title: createCLI
entity_type: api
summary: Creates a minimal, zero-dependency command-line interface (CLI) for a YAAF agent.
export_name: createCLI
source_file: src/cli-runtime.ts
category: function
search_terms:
 - command line interface for agent
 - build agent CLI
 - terminal UI for YAAF
 - zero dependency CLI
 - REPL for agent
 - how to ship a YAAF agent
 - interactive agent terminal
 - slash commands
 - CLI history persistence
 - agent streaming output
 - createInkCLI vs createCLI
 - lightweight CLI runtime
stub: false
compiled_at: 2026-04-24T16:59:04.824Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/cli-runtime.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/cli-runtime.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/runtime/cli.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `create[[[[[[[[CLI]]]]]]]]` function is a factory for creating a minimal, zero-dependency command-line interface (CLI) for a YAAF agent [Source 1]. It allows developers to ship their agents as polished, interactive terminal applications, similar to products like `claude` or `aider` [Source 1, 3].

This function wraps an agent in a production-quality terminal REPL (Read-Eval-Print Loop) that includes features such as [Source 3]:
- Interactive chat with command history persistence.
- [Streaming](../concepts/streaming.md) rendering of token-based responses.
- Text-based status indicators for [Tool Calls](../concepts/tool-calls.md).
- A system of built-in and custom slash commands.
- Configurable theming, greetings, and prompts.
- Graceful shutdown and session preservation.

`createCLI` is the lightweight option for building a CLI. For a more advanced user experience with live re-rendering and in-place spinners, YAAF provides `createInkCLI`, which has additional dependencies like `ink` and `react` [Source 1].

The function requires a `StreamableAgent`, which can be created by adapting a standard YAAF `Agent` using the `toStreamableAgent` utility function [Source 1].

## Signature

The `createCLI` function is exported from `yaaf/cli-runtime` [Source 1].

```typescript
import { StreamableAgent } from 'yaaf'; // Note: Type for illustration

interface CLITheme {
  promptColor?: string;
  agentColor?: string;
  systemColor?: string;
  errorColor?: string;
}

interface CommandContext {
  print: (message: string) => void;
  messageCount: number;
}

interface CLISlashCommand {
  description: string;
  handler: (args: string, context: CommandContext) => Promise<void> | void;
}

interface CreateCLIOptions {
  name?: string;
  greeting?: string;
  streaming?: boolean;
  promptString?: string;
  agentPrefix?: string;
  dataDir?: string;
  maxHistory?: number;
  theme?: CLITheme;
  commands?: Record<string, CLISlashCommand>;
  beforeRun?: (input: string) => Promise<string> | string;
  afterRun?: (input: string, response: unknown) => Promise<void> | void;
  onExit?: () => Promise<void> | void;
}

function createCLI(
  agent: StreamableAgent,
  options?: CreateCLIOptions
): void;
```

### Parameters

- **`agent`**: An instance of a `StreamableAgent`. This is typically created by passing a standard `Agent` to the `toStreamableAgent` adapter [Source 1].
- **`options`** (optional): A configuration object to customize the CLI's appearance and behavior [Source 1].

### Configuration Options

The following options can be provided in the `options` object [Source 1]:

| Option | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | `'agent'` | The agent's display name, used in prompts and the history directory path. |
| `greeting` | `string` | — | A welcome message displayed [when](./when.md) the CLI starts. |
| `streaming` | `boolean` | `false` | If `true`, the agent's responses are streamed to the console token by token. |
| `promptString` | `string` | `'you ▸ '` | The string displayed to prompt for user input. |
| `agentPrefix` | `string` | `'<name> ▸ '` | The prefix displayed before each of the agent's responses. |
| `dataDir` | `string` | `~/.<name>` | The directory for persisting command history and other data. |
| `maxHistory` | `number` | `1000` | The maximum number of history entries to persist. |
| `theme` | `CLITheme` | default | An object to customize the colors used in the interface. |
| `commands` | `Record<string, CLISlashCommand>` | — | An object defining custom slash commands. |
| `beforeRun` | `(input) => string` | — | A hook that runs before processing user input, allowing for transformation. |
| `afterRun` | `(input, response) => void` | — | A hook that runs after the agent responds, useful for logging or analytics. |
| `onExit` | `() => void` | — | A cleanup hook that runs when the CLI is shutting down. |

### Built-in Commands

The [CLI Runtime](../subsystems/cli-runtime.md) includes several built-in slash commands for basic [Session Management](../subsystems/session-management.md) [Source 1]:

| Command | Description |
|---|---|
| `/quit`, `/q`, `/exit` | Exit the CLI application. |
| `/clear` | Clear the terminal screen. |
| `/help` | Show a list of available built-in and custom commands. |
| `/history` | Display recent conversation history. |

## Examples

The following is a comprehensive example demonstrating how to create a CLI for a YAAF agent with custom commands, theming, and [Lifecycle Hooks](../concepts/lifecycle-hooks.md) [Source 1].

```typescript
import { Agent, toStreamableAgent } from 'yaaf';
import { createCLI } from 'yaaf/cli-runtime';

// Assume searchTool and weatherTool are defined elsewhere
const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
  tools: [searchTool, weatherTool],
});

createCLI(toStreamableAgent(agent), {
  // Display customization
  name: 'my-assistant',
  greeting: '👋 Hello! How can I help?',
  promptString: 'you ▸ ',
  agentPrefix: 'bot ▸ ',

  // Enable streaming responses
  streaming: true,

  // History persistence configuration
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
    console.log(`Processing input: ${input}`);
    return input;
  },
  afterRun: async (input, response) => {
    // Useful for analytics or logging
    console.log(`Agent responded to input of length ${input.length}.`);
  },

  // Custom slash commands
  commands: {
    model: {
      description: 'Switch the current model',
      handler: async (args, ctx) => {
        ctx.print(`Switching to model: ${args}...`);
        // Logic to switch model would go here
      },
    },
    export: {
      description: 'Export the current conversation',
      handler: async (_, ctx) => {
        ctx.print(`Exported ${ctx.messageCount} messages to a file.`);
        // Logic to export history would go here
      },
    },
  },

  // Cleanup on exit
  onExit: async () => {
    console.log('CLI is shutting down. Cleaning up resources.');
    // await db.close();
  },
});
```

## Sources
[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/cli-runtime.md
[Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/cli-runtime.ts
[Source 3]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/runtime/cli.ts