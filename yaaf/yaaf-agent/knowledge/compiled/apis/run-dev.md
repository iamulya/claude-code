---
title: runDev
entity_type: api
summary: Runs the YAAF agent in an interactive terminal session for development.
export_name: runDev
source_file: src/cli/dev.ts
category: function
search_terms:
 - interactive agent development
 - REPL for YAAF agent
 - test agent in terminal
 - debug agent conversation
 - yaaf dev command
 - how to chat with my agent
 - inspect agent context
 - list agent tools
 - check token usage
 - reset agent conversation
 - local development mode
 - CLI dev tool
stub: false
compiled_at: 2026-04-24T17:34:24.027Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/cli/dev.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `runDev` function provides an interactive Read-Eval-Print Loop (REPL) for agent development directly in the terminal [Source 1]. It is the underlying implementation for the `yaaf dev` command-line interface ([CLI](../subsystems/cli.md)) tool.

This function is primarily used to chat with and inspect an agent during the development process. It allows developers to send messages, observe responses, and use special slash commands to manage the session and inspect the agent's state [Source 1].

The interactive session supports several commands:
*   `/quit`: Exits the development session.
*   `/clear`: Resets the conversation history.
*   `/context`: Displays the current [System Prompt](../concepts/system-prompt.md).
*   `/[[[[[[[[Tools]]]]]]]]`: Lists the Tools available to the agent.
*   `/cost`: Shows token usage and cost information for the session.

## Signature

```typescript
export async function runDev(args: string[]): Promise<void>;
```

**Parameters:**

*   `args` (`string[]`): An array of command-line arguments passed to the function.

**Returns:**

*   `Promise<void>`: A promise that resolves [when](./when.md) the interactive session is terminated.

## Examples

While `runDev` can be called programmatically, its main use is via the `yaaf dev` command in the terminal. The following is a sample interactive session.

```bash
$ yaaf dev
Agent is ready. Type a message to begin, or /quit to exit.

> Hello, who are you?
I am a helpful AI assistant.

> /tools
Available tools:
- searchWeb(query: string)
- getFileContents(path: string)

> /context
System: You are a helpful AI assistant. You have access to the following tools...

> /clear
Conversation cleared.

> /quit
Goodbye!
```

## Sources

[Source 1]: src/cli/dev.ts