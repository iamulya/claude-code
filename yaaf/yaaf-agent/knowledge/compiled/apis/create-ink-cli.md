---
title: createInkCLI
entity_type: api
summary: A factory function to create a premium, Ink-based command-line interface (CLI) runtime for YAAF agents.
export_name: createInkCLI
source_file: src/cli-ink.ts
category: function
search_terms:
 - Ink CLI for agents
 - React terminal UI
 - premium CLI experience
 - interactive agent command line
 - how to build a CLI like claude
 - YAAF terminal interface
 - live re-rendering CLI
 - tool call spinners
 - persistent status bar
 - rich terminal UI for LLM
 - yaaf/cli-ink
 - createCLI vs createInkCLI
stub: false
compiled_at: 2026-04-24T16:59:30.963Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/cli-runtime.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/cli-ink.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`createInk[[[[[[[[CLI]]]]]]]]` is a factory function that builds and launches a premium, interactive command-line interface (CLI) for a YAAF agent [Source 1]. It uses the Ink library, which is built on React, to provide a rich terminal user experience with features like live re-rendering of [Streaming](../concepts/streaming.md) output, in-place spinners for [Tool Calls](../concepts/tool-calls.md), and a persistent footer displaying live statistics [Source 1].

This runtime is designed for creating polished CLI products, similar in style to [Tools](../subsystems/tools.md) like `claude` or `aider`. It is an alternative to the zero-dependency `createCLI` function, offering a more advanced user interface at the cost of additional dependencies [Source 1].

To use `createInkCLI`, the following peer dependencies must be installed [Source 1]:
- `ink`
- `react`
- `ink-text-input`
- `ink-spinner`

The function requires a `StreamableAgent`, which can be created by adapting a standard YAAF `Agent` using the `toStreamableAgent` utility function [Source 1].

## Signature / Constructor

The function is imported from the `yaaf/cli-ink` module [Source 1, Source 2].

```typescript
import { StreamableAgent } from 'yaaf';

type InkCLITheme = {
  primary?: string;
  secondary?: string;
  accent?: string;
  error?: string;
  dim?: string;
};

interface InkCLIOptions {
  name?: string;
  greeting?: string;
  theme?: InkCLITheme;
  beforeRun?: (input: string) => Promise<string> | string;
  afterRun?: (input: string, response: any) => Promise<void> | void;
}

function createInkCLI(
  agent: StreamableAgent,
  options?: InkCLIOptions
): void;
```

**Configuration Options** [Source 1]

| Option      | Type                                                  | Default   | Description                                                              |
|-------------|-------------------------------------------------------|-----------|--------------------------------------------------------------------------|
| `name`      | `string`                                              | `'agent'` | The display name for the agent, used in the UI.                          |
| `greeting`  | `string`                                              | —         | An optional welcome message displayed [when](./when.md) the CLI starts.               |
| `theme`     | `InkCLITheme`                                         | default   | A color theme object using Ink-compatible color names.                   |
| `beforeRun` | `(input: string) => Promise<string> \| string`        | —         | An optional hook to pre-process user input before sending it to the agent. |
| `afterRun`  | `(input: string, response: any) => Promise<void> \| void` | —         | An optional hook that runs after the agent has finished its response.    |

## Examples

### Basic Usage

This example demonstrates creating a simple agent and launching it with the Ink-based CLI [Source 1].

First, install the required dependencies:
```bash
npm install ink react ink-text-input ink-spinner
```

Then, create the agent and [CLI Runtime](../subsystems/cli-runtime.md):
```typescript
import { Agent, toStreamableAgent } from 'yaaf';
import { createInkCLI } from 'yaaf/cli-ink';

// Assume searchTool and weatherTool are defined elsewhere
const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
  tools: [/* searchTool, weatherTool */],
});

// Adapt the agent to be streamable
const streamableAgent = toStreamableAgent(agent);

// Launch the Ink-based CLI
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

### Rendered UI

The code above produces an interactive terminal interface that looks like this [Source 1]:

```
  ╦ ╦╔═╗╔═╗╔═╗
  ╚╦╝╠═╣╠═╣╠╣  my-bot
   ╩ ╩ ╩╩ ╩╚

  👋 Hello! How can I help?

  you ▸ What's the weather in Tokyo?

  ✓ search("Tokyo weather") (2.3s)
  ✓ get_weather("Tokyo") (1.1s)

  ▸
    It's currently 22°C and sunny in Tokyo
    with a light breeze from the east.█

  ┌──────────────────────────────────────────────┐
  │ 1 msgs · 4s · ↑350 ↓120 tokens · /quit      │
  └──────────────────────────────────────────────┘
```

## Sources
[Source 1] /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/cli-runtime.md
[Source 2] /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/cli-ink.ts