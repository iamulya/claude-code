---
title: CLITheme
entity_type: api
summary: Defines the color theme configuration options for the `createCLI` function.
export_name: CLITheme
source_file: src/cli-runtime.ts
category: type
search_terms:
 - CLI color customization
 - terminal theme for agent
 - change CLI colors
 - createCLI theme option
 - ANSI escape codes for colors
 - prompt color
 - agent response color
 - system message styling
 - error message color
 - customize terminal output
 - zero-dependency CLI theme
 - yaaf/cli-runtime styling
stub: false
compiled_at: 2026-04-24T16:55:37.581Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/cli-runtime.md
compiled_from_quality: documentation
confidence: 0.9
---

## Overview

`[[[[[[[[CLI]]]]]]]]Theme` is a TypeScript type that defines the color configuration for the terminal interface created by the `createCLI` function [Source 1]. It allows developers to customize the colors of different elements in the command-line interface, such as the user prompt, agent responses, system messages, and errors [Source 1].

This theme object uses raw ANSI escape codes as string values to specify colors, providing a lightweight, zero-dependency way to style the CLI output [Source 1]. It is used exclusively with the `createCLI` runtime and is distinct from the `InkCLITheme` used by `createInkCLI` [Source 1].

## Signature

`CLITheme` is a type alias for an object with the following optional properties:

```typescript
export type CLITheme = {
  /**
   * ANSI escape code for the user's prompt string.
   * @example '\x1b[36m' // cyan
   */
  promptColor?: string;

  /**
   * ANSI escape code for the agent's response prefix and text.
   * @example '\x1b[35m' // magenta
   */
  agentColor?: string;

  /**
   * ANSI escape code for system messages (e.g., from slash commands).
   * @example '\x1b[2m' // dim
   */
  systemColor?: string;

  /**
   * ANSI escape code for error messages.
   * @example '\x1b[31m' // red
   */
  errorColor?: string;
};
```
[Source 1]

## Examples

The following example demonstrates how to use the `theme` property within a `createCLI` configuration to set custom colors for the CLI components.

```typescript
import { Agent, toStreamableAgent } from 'yaaf';
import { createCLI } from 'yaaf/cli-runtime';

const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
});

createCLI(toStreamableAgent(agent), {
  name: 'my-assistant',
  promptString: 'you ▸ ',
  agentPrefix: 'bot ▸ ',

  // Custom theme using ANSI escape codes
  theme: {
    promptColor: '\x1b[36m',   // cyan
    agentColor: '\x1b[35m',    // magenta
    systemColor: '\x1b[2m',    // dim
    errorColor: '\x1b[31m',    // red
  },
});
```
[Source 1]

## See Also

*   `createCLI`: The function that consumes the `CLITheme` object to build a zero-dependency command-line interface.

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/cli-runtime.md