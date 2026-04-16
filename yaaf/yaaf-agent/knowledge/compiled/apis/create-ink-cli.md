---
title: createInkCLI
entity_type: api
summary: A premium CLI runtime for YAAF agents built with Ink and React, featuring live re-rendering and persistent footers.
export_name: createInkCLI
source_file: src/cli-ink.ts
category: function
stub: false
compiled_at: 2026-04-16T14:05:32.639Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/cli-runtime.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/cli-ink.ts
confidence: 1
---

## Overview
`createInkCLI` is a function used to deploy YAAF agents as polished terminal applications. Built on top of Ink and React, it provides a high-fidelity user interface compared to standard terminal outputs. It is designed for "premium" agent experiences, offering features such as live re-rendering of streaming text, in-place spinners for tool executions, and a persistent footer that displays real-time session statistics.

Unlike the zero-dependency `createCLI`, `createInkCLI` requires several peer dependencies to handle the React-based terminal rendering.

## Signature / Constructor

```typescript
function createInkCLI(
  agent: StreamableAgent, 
  config: InkCLIConfig
): void
```

### Parameters
*   **agent**: A `StreamableAgent` instance. Standard YAAF agents can be converted using the `toStreamableAgent()` utility.
*   **config**: An object defining the CLI's behavior, appearance, and lifecycle hooks.

### InkCLIConfig
| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | `'agent'` | The display name of the agent, used in the header and prefixes. |
| `greeting` | `string` | — | An optional welcome message displayed when the CLI starts. |
| `theme` | `InkCLITheme` | default | A configuration object for UI colors using Ink-compatible color names. |
| `beforeRun` | `(input: string) => string \| Promise<string>` | — | A hook to transform or inject context into user input before it reaches the agent. |
| `afterRun` | `(input: string, response: string) => void \| Promise<void>` | — | A hook for post-processing, such as logging or analytics. |

### InkCLITheme
The theme object supports the following properties:
*   `primary`: Main UI color (e.g., 'cyan').
*   `secondary`: Accent color for secondary elements (e.g., 'magenta').
*   `accent`: Color for success states and highlights (e.g., 'green').
*   `error`: Color for error messages (e.g., 'red').
*   `dim`: Color for subtle text or metadata (e.g., 'gray').

## Events
The `createInkCLI` runtime reacts to `RuntimeStreamEvent` objects emitted by the agent's stream. It handles the following event types:

| Event | UI Behavior |
| :--- | :--- |
| `text_delta` | Appends tokens to the active response area with live re-rendering. |
| `tool_call_start` | Renders an in-place spinner with the tool name and arguments. |
| `tool_call_end` | Replaces the spinner with a checkmark or cross and displays execution duration. |
| `tool_blocked` | Displays a notification that a tool execution was denied. |
| `usage` | Updates the persistent footer with prompt tokens, completion tokens, and call counts. |
| `done` | Finalizes the current interaction and returns to the user prompt. |

## Examples

### Basic Implementation
This example demonstrates setting up a premium CLI for a standard agent.

```typescript
import { Agent, toStreamableAgent } from 'yaaf';
import { createInkCLI } from 'yaaf/cli-ink';

const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
  tools: [searchTool, weatherTool],
});

// Convert standard agent to streamable and launch CLI
createInkCLI(toStreamableAgent(agent), {
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

### Installation Requirements
To use `createInkCLI`, the following peer dependencies must be installed in the project:

```bash
npm install ink react ink-text-input ink-spinner
```

## See Also
* `createCLI`: The lightweight, zero-dependency alternative for standard terminal output.
* `toStreamableAgent`: The utility used to adapt standard agents for use with CLI runtimes.