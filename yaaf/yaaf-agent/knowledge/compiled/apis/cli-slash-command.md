---
title: CLISlashCommand
entity_type: api
summary: Defines the structure for custom slash commands configurable in the `createCLI` function.
export_name: CLISlashCommand
source_file: src/cli-runtime.ts
category: type
search_terms:
 - custom cli commands
 - adding commands to cli
 - createCLI slash commands
 - yaaf cli customization
 - how to add a command
 - slash command handler
 - cli command context
 - extending cli functionality
 - command description
 - command arguments
 - cli runtime commands
 - user-defined cli actions
stub: false
compiled_at: 2026-04-24T16:55:31.313Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/cli-runtime.md
compiled_from_quality: documentation
confidence: 0.9
---

## Overview

The `[[[[[[[[CLI]]]]]]]]SlashCommand` type defines the structure for creating custom slash commands within the zero-dependency CLI provided by the `createCLI` function [Source 1]. These commands allow developers to extend the CLI's functionality beyond simple chat interactions, enabling users to perform specific actions like changing settings, exporting data, or triggering other application-specific logic directly from the chat prompt [Source 1].

Each command consists of a description, which is displayed in the output of the built-in `/help` command, and a handler function that contains the logic to be executed [when](./when.md) the command is invoked [Source 1].

## Signature

`CLISlashCommand` is an object type with two properties: `description` and `handler`. The `handler` function receives the command arguments and a context object.

```typescript
export type CLISlashCommand = {
  /**
   * A brief description of what the command does.
   * This text is shown when the user runs the /help command.
   */
  description: string;

  /**
   * The function to execute when the command is invoked.
   * @param args - A string containing all text that followed the command name.
   * @param context - A context object with helpers and session state.
   */
  handler: (args: string, context: CLICommandContext) => Promise<void> | void;
};
```

The `handler`'s `context` parameter is of type `CLICommandContext`, which provides [Utilities](../subsystems/utilities.md) for interacting with the CLI session:

```typescript
export type CLICommandContext = {
  /**
   * Prints a message to the console using the system color theme.
   */
  print: (message: string) => void;

  /**
   * The number of messages in the current conversation history.
   */
  readonly messageCount: number;
};
```

## Examples

The following example demonstrates how to define two custom commands, `/model` and `/export`, and pass them to the `createCLI` function.

```typescript
import { Agent, toStreamableAgent } from 'yaaf';
import { createCLI } from 'yaaf/cli-runtime';

const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
});

createCLI(toStreamableAgent(agent), {
  name: 'my-assistant',
  greeting: '👋 Hello! How can I help?',
  
  // Define custom slash commands
  commands: {
    // Command is invoked via "/model <model_name>"
    model: {
      description: 'Switch the active LLM model.',
      handler: async (args, ctx) => {
        // 'args' would be "<model_name>"
        // In a real implementation, this would update the agent's configuration.
        ctx.print(`Switching to model: ${args}...`);
      },
    },
    // Command is invoked via "/export"
    export: {
      description: 'Export the current conversation history.',
      handler: async (_, ctx) => {
        // In a real implementation, this would write history to a file.
        ctx.print(`Exported ${ctx.messageCount} messages from the session.`);
      },
    },
  },
});
```
[Source 1]

When running this CLI, a user could type `/help` to see the descriptions for `model` and `export`, or type `/export` to execute its handler.

## See Also

- `createCLI`: The function that consumes `CLISlashCommand` objects to build a zero-dependency command-line interface.

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/cli-runtime.md