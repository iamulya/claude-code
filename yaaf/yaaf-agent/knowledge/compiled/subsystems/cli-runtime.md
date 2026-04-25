---
title: CLI Runtime
entity_type: subsystem
summary: Provides utilities and APIs for building and shipping YAAF agents as command-line interface (CLI) applications.
primary_files:
 - src/cli-runtime.ts
 - src/cli-ink.ts
 - src/stream.ts
exports:
 - createCLI
 - createInkCLI
 - toStreamableAgent
search_terms:
 - build command line agent
 - create CLI with YAAF
 - terminal UI for agent
 - REPL for LLM agent
 - interactive agent shell
 - yaaf dev vs createCLI
 - Ink terminal interface
 - streaming output to console
 - slash commands for agent
 - persistent chat history
 - how to ship a YAAF agent
 - toStreamableAgent function
 - console agent
 - RuntimeStreamEvent
stub: false
compiled_at: 2026-04-24T18:11:08.333Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/cli-runtime.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/getting-started.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/cli-runtime.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/runtime/cli.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Purpose

The [CLI](./cli.md) Runtime subsystem provides the necessary components to package and distribute a YAAF agent as a polished, interactive command-line interface (CLI) application [Source 1]. It is designed to create user experiences similar to commercial CLI [Tools](./tools.md) like `claude`, `aider`, or `codex` [Source 1]. The subsystem handles common CLI features such as interactive REPLs (Read-Eval-Print Loop), persistent command history, [Streaming](../concepts/streaming.md) token rendering, and status indicators for [Tool Calls](../concepts/tool-calls.md) [Source 4].

## Architecture

The CLI Runtime offers two distinct approaches for building a terminal interface, catering to different needs for dependencies and user experience richness [Source 1].

| Feature | `createCLI` | `createInkCLI` |
|---|---|---|
| **Import Path** | `yaaf/cli-runtime` | `yaaf/cli-ink` |
| **Dependencies** | Zero | `ink`, `react`, `ink-text-input`, `ink-spinner` |
| **Streaming** | Appends to stdout | Live re-rendering with cursor |
| **Tool Calls** | Text output | In-place spinners with success/fail indicators |
| **Stats** | Manual via `/cost` command | Persistent footer with live token counters |
| **Best For** | Minimal, lightweight CLIs | Premium, interactive user experiences |
[Source 1]

Both runtimes are built upon a common architectural pattern involving a [Stream Adapter](../concepts/stream-adapter.md). A standard YAAF `Agent` is converted into a `StreamableAgent` using the `toStreamableAgent` utility function. This adapted agent exposes a `runStream()` method that produces an `AsyncIterable<RuntimeStreamEvent>`, which the CLI renderers consume to update the interface [Source 1].

The `RuntimeStreamEvent` is the core data structure that decouples the agent's execution logic from the UI rendering. The different event types are:

| Event | Description |
|---|---|
| `text_delta` | A chunk of text (token) from the [LLM](../concepts/llm.md). |
| `tool_call_start` | Signals that a [Tool Execution](../concepts/tool-execution.md) has begun. |
| `tool_call_end` | Signals that a tool execution has completed, including duration and error status. |
| `tool_blocked` | Indicates a tool call was denied due to permissions. |
| `usage` | Provides token usage statistics for the run. |
| `done` | Signals the end of the agent's response, containing the final complete text. |
[Source 1]

## Key APIs

- **`createCLI(agent, options)`**: The entry point for creating a zero-dependency CLI application. It wraps a `StreamableAgent` in a production-quality terminal interface with features like history persistence, streaming, and slash commands [Source 4].
- **`createInkCLI(agent, options)`**: The entry point for creating a premium terminal UI using the Ink framework. This requires installing `ink`, `react`, and other related packages. It provides a more dynamic, app-like experience with live re-rendering components [Source 1].
- **`toStreamableAgent(agent)`**: A utility function that adapts a standard `Agent` instance into a `StreamableAgent`. The adapted agent maintains the original `run()` method signature while adding a `runStream()` method that the CLI runtimes require [Source 1].

## Configuration

Developers can configure the behavior and appearance of the CLI through an options object passed to the creation functions.

### `createCLI` Configuration

The zero-dependency CLI offers extensive configuration options [Source 1]:

| Option | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | `'agent'` | The agent's display name. |
| `greeting` | `string` | — | A welcome message displayed on startup. |
| `streaming` | `boolean` | `false` | Enables streaming token rendering. |
| `promptString` | `string` | `'you ▸ '` | The indicator for the user's input prompt. |
| `agentPrefix` | `string` | `'<name> ▸ '` | The prefix for the agent's responses. |
| `dataDir` | `string` | `~/.<name>` | The directory for persisting chat history. |
| `maxHistory` | `number` | `1000` | The maximum number of history entries to persist. |
| `theme` | `CLITheme` | default | An object to customize terminal colors. |
| `commands` | `Record<string, CLISlashCommand>` | — | A map of custom slash commands. |
| `beforeRun` | `(input) => string` | — | A hook to pre-process user input. |
| `afterRun` | `(input, response) => void` | — | A hook for post-processing after a run. |
| `onExit` | `() => void` | — | A hook for cleanup logic on shutdown. |

This runtime includes several built-in slash commands for users: `/quit` (or `/q`, `/exit`), `/clear`, `/help`, `/history`, `/context`, and `/cost` [Source 1, Source 4].

### `createInkCLI` Configuration

The Ink-based CLI has a more focused set of configuration options, primarily for display and [Lifecycle Hooks](../concepts/lifecycle-hooks.md) [Source 1]:

| Option | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | `'agent'` | The agent's display name. |
| `greeting` | `string` | — | A welcome message displayed on startup. |
| `theme` | `InkCLITheme` | default | An object to customize colors using Ink color names. |
| `beforeRun` | `(input) => string` | — | A hook to pre-process user input. |
| `afterRun` | `(input, response) => void` | — | A hook for post-processing after a run. |

## Extension Points

The CLI Runtime provides several ways for developers to extend its core functionality.

### Custom Slash Commands

For `createCLI`, developers can define their own slash commands via the `commands` configuration option. Each command is an object with a `description` and a `handler` function that receives arguments and a context object with methods like `print` [Source 1].

```typescript
createCLI(agent, {
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
});
```
[Source 1]

### Lifecycle Hooks

Both `createCLI` and `createInkCLI` support hooks to inject custom logic into the run cycle:
- **`beforeRun`**: An async function that can transform the user's input before it is sent to the agent [Source 1].
- **`afterRun`**: An async function that runs after the agent has produced a response, useful for logging or analytics [Source 1].
- **`onExit`**: A hook specific to `createCLI` for performing cleanup tasks, such as closing database connections, [when](../apis/when.md) the application shuts down [Source 1].

## Sources
[Source 1] /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/cli-runtime.md
[Source 2] /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/getting-started.md
[Source 3] /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/cli-runtime.ts
[Source 4] /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/runtime/cli.ts