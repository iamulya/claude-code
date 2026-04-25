---
title: defaultPromptBuilder
entity_type: api
summary: A factory function that creates a SystemPromptBuilder pre-configured with a standard identity and environment section.
export_name: defaultPromptBuilder
source_file: src/system-prompt-builder.ts
category: function
search_terms:
 - create system prompt
 - default prompt configuration
 - pre-configured prompt builder
 - system prompt factory
 - initialize SystemPromptBuilder
 - standard prompt sections
 - how to start with system prompts
 - base prompt setup
 - agent identity prompt
 - environment info in prompt
 - quickstart prompt builder
 - sensible prompt defaults
stub: false
compiled_at: 2026-04-24T17:01:03.564Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/prompts.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/prompt/systemPrompt.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `defaultPromptBuilder` is a convenience factory function that simplifies the creation of a `SystemPromptBuilder` instance [Source 1]. It provides a starting point with sensible defaults, intended to cover common use cases for agent system prompts [Source 2].

[when](./when.md) called, it returns a new `SystemPromptBuilder` pre-loaded with two standard sections [Source 2]:
1.  An **identity section**, created from the `basePrompt` string provided as an argument.
2.  An **environment section**, which includes details such as the current working directory (CWD), OS platform, shell, and the current date.

This pre-configured builder can then be further customized by chaining additional methods like `.addStatic()` or `.addDynamic()` to add more sections, such as rules or [Tools](../subsystems/tools.md) [Source 2]. It is a recommended starting point for most agent configurations.

## Signature

```typescript
export function defaultPromptBuilder(basePrompt: string): SystemPromptBuilder;
```

**Parameters:**

*   `basePrompt` [string]: The core identity or role for the agent (e.g., "You are a helpful coding assistant."). This string is used to create the initial static identity section.

**Returns:**

*   `SystemPromptBuilder`: A new instance of `SystemPromptBuilder` pre-configured with default identity and environment sections.

## Examples

### Basic Usage

Create a builder with a specific agent identity. The resulting builder will automatically include the agent's role and current environment information in the final prompt.

```typescript
import { defaultPromptBuilder } from 'yaaf';

// Creates a builder with identity and environment sections.
const builder = defaultPromptBuilder('You are a code reviewer.');

const systemPrompt = await builder.build();
console.log(systemPrompt);
```

### Extending the Default Builder

The returned builder is a standard `SystemPromptBuilder` instance, so you can add more sections to it using the fluent API.

```typescript
import { defaultPromptBuilder } from 'yaaf';

const builder = defaultPromptBuilder('You are a helpful coding assistant.')
  .addStatic('rules', () => '## Rules\n- Always verify before deleting files.');

// This prompt will contain the identity, environment, and rules sections.
const systemPrompt = await builder.build();

/*
// Example usage with an Agent:
const agent = new Agent({
  systemPrompt: await builder.build()
});
*/
```
[Source 2]

## See Also

*   `SystemPromptBuilder`: The class that this factory function instantiates and configures.
*   `identitySection`: The underlying factory for creating an identity section.
*   `envSection`: The underlying factory for creating an environment section.
*   `fromSections`: An alternative factory for creating a `SystemPromptBuilder` from an array of sections.

## Sources

*   [Source 1]: `/Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/prompts.md`
*   [Source 2]: `/Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/prompt/systemPrompt.ts`