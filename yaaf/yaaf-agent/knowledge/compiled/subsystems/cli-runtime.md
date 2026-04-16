---
title: CLI Runtime
entity_type: subsystem
summary: A subsystem for packaging YAAF agents as interactive command-line applications, offering both lightweight and rich UI options.
primary_files:
  - src/cli-runtime.ts
  - src/cli-ink.ts
  - src/runtime/cli.ts
exports:
  - createCLI
  - createInkCLI
  - toStreamableAgent
stub: false
compiled_at: 2026-04-16T14:05:21.199Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/cli-runtime.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/getting-started.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/cli-ink.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/cli-runtime.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/runtime/cli.ts
confidence: 1
---

## Purpose
The CLI Runtime subsystem provides the infrastructure to package YAAF agents as standalone command-line products. It solves the problem of transforming a programmatic agent logic into a user-facing interactive REPL (Read-Eval-Print Loop). The subsystem handles terminal input/output, streaming responses, tool execution visibility, history persistence, and custom command processing.

## Architecture
The subsystem is structured around two primary runtime implementations and a stream adaptation layer.

### Runtime Implementations
*   **Standard CLI (`createCLI`)**: A zero-dependency implementation using Node.js native `readline` modules. It is designed for lightweight applications and appends streaming text directly to `stdout`.
*   **Ink CLI (`createInkCLI`)**: A premium terminal interface built on `ink` and `react`. It supports live re-rendering, in-place spinners for tool calls, and a persistent footer for live token and cost counters.

### Stream Adaptation
Because standard YAAF agents typically return a single response string, the CLI Runtime utilizes a **Stream Adapter** pattern. The `toStreamableAgent()` function wraps a standard `Agent` to produce an `AsyncIterable` of `RuntimeStreamEvent` objects. This allows the CLI to render token chunks and tool execution statuses in real-time.

### Event Protocol
The runtime communicates via `RuntimeStreamEvent` types:
*   `text_delta`: Individual token chunks from the LLM.
*   `tool_call_start` / `tool_call_end`: Indicators for tool execution and duration.
*   `tool_blocked`: Notification when a tool execution is denied (e.g., via permission prompts).
*   `usage`: Token consumption statistics.
*   `done`: The final aggregated response.

## Integration Points
The CLI Runtime interacts with other parts of the framework as follows:
*   **Agent Core**: Consumes `Agent` instances and wraps them for execution.
*   **Filesystem**: Uses the local data directory (defaulting to `~/.<agent-name>`) to persist conversation history and session data.
*   **Environment**: Detects provider configurations (e.g., `GOOGLE_API_KEY`, `OPENAI_API_KEY`) to initialize the underlying models used by the agent.

## Key APIs

### createCLI
The primary entry point for standard terminal applications. It configures the REPL environment, including theming and history management.

### createInkCLI
The entry point for React-based terminal UIs. It requires optional dependencies: `ink`, `react`, `ink-text-input`, and `ink-spinner`.

### toStreamableAgent
An adapter function that converts a standard `Agent` into a `StreamableAgent`, enabling the `runStream()` method required for real-time terminal updates.

## Configuration
Runtimes are configured via a configuration object passed to the creation functions.

### Common Configuration Options
| Option | Description |
|--------|-------------|
| `name` | The display name of the agent. |
| `greeting` | A welcome message displayed upon startup. |
| `dataDir` | Directory for history and data persistence. |
| `theme` | A collection of colors for prompts, agent responses, and errors. |
| `streaming` | Boolean to enable or disable real-time token rendering. |

### Built-in Slash Commands
The runtimes include several pre-configured commands:
*   `/quit`, `/q`, `/exit`: Terminate the application.
*   `/clear`: Clear the terminal screen and reset conversation context.
*   `/help`: List available commands.
*   `/history`: Display recent conversation history.
*   `/context`: (Dev mode) Show system prompt sections and sizes.
*   `/cost`: (Dev mode) Show token usage and estimated costs.

## Extension Points

### Custom Slash Commands
Developers can extend the CLI by providing a `commands` record in the configuration. Each command defines a description and a handler function that receives the user arguments and a runtime context.

```typescript
commands: {
  export: {
    description: 'Export conversation',
    handler: async (args, ctx) => {
      ctx.print(`Exported ${ctx.messageCount} messages`);
    },
  },
}
```

### Lifecycle Hooks
The runtime provides hooks for intercepting agent execution:
*   `beforeRun`: Allows transformation of user input or injection of additional context before the agent processes the request.
*   `afterRun`: Used for post-processing, such as analytics or external logging.
*   `onExit`: A cleanup hook triggered during graceful shutdown to close database connections or save state.

### Theming
The `theme` object allows developers to customize the visual identity of the CLI using ANSI color codes (for `createCLI`) or Ink color names (for `createInkCLI`).

## Sources
* `docs/cli-runtime.md`
* `docs/getting-started.md`
* `src/runtime/cli.ts`