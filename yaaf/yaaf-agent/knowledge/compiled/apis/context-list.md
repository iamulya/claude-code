---
title: contextList
summary: Scans the project for all context sources and shows what would be injected into the system prompt at runtime.
export_name: contextList
source_file: src/cli/context.ts
category: function
entity_type: api
search_terms:
 - inspect system prompt
 - view context sources
 - what is in my prompt
 - debug system prompt
 - list all context files
 - yaaf cli context
 - how to see final prompt
 - prompt injection debugging
 - context management
 - show assembled prompt
 - cli command for context
 - verify prompt content
stub: false
compiled_at: 2026-04-24T16:58:04.985Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/cli/context.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `contextList` function is a command-line interface ([CLI](../subsystems/cli.md)) utility that provides insight into an agent's runtime context [Source 1]. It scans the project directory for all recognized [Context Sources](../concepts/context-sources.md) and displays the aggregated content that will be injected into the [LLM](../concepts/llm.md)'s [System Prompt](../concepts/system-prompt.md) [Source 1].

This function is primarily used for debugging and verification. It allows developers to confirm exactly what information the agent will have available as its foundational context before any user interaction occurs. It is the underlying implementation for the `yaaf context list` CLI command [Source 1].

## Signature

The function is asynchronous and does not take any arguments. It prints its output directly to the console and resolves with no return value.

```typescript
export async function contextList(): Promise<void>;
```

## Examples

The `contextList` function is intended to be run via the [YAAF CLI](../concepts/yaaf-cli.md).

### Invoking from the command line

To inspect the assembled system prompt context for the current project, run the following command in your terminal:

```bash
yaaf context list
```

The command will scan for context files and print a summary of what it finds, similar to the hypothetical output below:

```
Assembled System Prompt Context:
---------------------------------

[Source: /path/to/project/context/instructions.md]
You are a helpful assistant.

[Source: /path/to/project/context/user_profile.txt]
The user's name is Alex. They are an expert in TypeScript.

---------------------------------
Total context length: 105 characters.
```

## Sources

[Source 1] src/cli/context.ts