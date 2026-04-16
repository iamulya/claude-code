---
title: runDev
entity_type: api
summary: Starts an interactive REPL for agent development, allowing real-time chat, prompt inspection, and token cost tracking.
export_name: runDev
source_file: src/cli/dev.ts
category: function
stub: false
compiled_at: 2026-04-16T14:16:17.234Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/cli/dev.ts
confidence: 0.95
---

## Overview
`runDev` is a utility function that initializes an interactive Read-Eval-Print Loop (REPL) environment for agent development. It is designed to facilitate the testing and debugging of agents within a terminal session. 

The function allows developers to interact with an agent in real-time, providing a suite of slash-commands to inspect the agent's internal state, such as its system prompt, available tools, and accumulated token costs.

## Signature / Constructor
```typescript
export async function runDev(args: string[]): Promise<void>
```

### Parameters
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `args` | `string[]` | An array of command-line arguments passed to the development environment. |

## REPL Commands
While the `runDev` session is active, the following commands can be used within the terminal:

| Command | Description |
| :--- | :--- |
| `/quit` | Exits the interactive session. |
| `/clear` | Resets the current conversation history. |
| `/context` | Displays the current system prompt and context. |
| `/tools` | Lists all tools currently available to the agent. |
| `/cost` | Displays the current token usage and estimated costs for the session. |

## Examples

### Basic CLI Implementation
The following example demonstrates how to use `runDev` as the entry point for a custom development CLI script.

```typescript
import { runDev } from 'yaaf';

/**
 * Entry point for the agent development environment.
 * Usage: node dev.js --agent my-agent.ts
 */
async function startDevEnvironment() {
  try {
    // Pass process arguments to the runDev function
    await runDev(process.argv.slice(2));
  } catch (error) {
    console.error('Failed to start dev session:', error);
    process.exit(1);
  }
}

startDevEnvironment();
```

## Sources
- `src/cli/dev.ts`