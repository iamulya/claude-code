---
title: SoulTransform
entity_type: api
summary: A function type used to apply personality or other high-level transformations to a system prompt.
export_name: SoulTransform
source_file: src/agents/contextEngine.ts
category: type
search_terms:
 - agent personality
 - system prompt transformation
 - how to set agent persona
 - ContextEngine soul
 - yaaf/gateway Soul module
 - prepend identity to prompt
 - dynamic prompt modification
 - customizing system prompt
 - agent character definition
 - applySoul function
 - SOUL.md transform
 - high-level prompt management
stub: false
compiled_at: 2026-04-24T17:38:57.890Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/prompts.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/contextEngine.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`[[[[[[[[Soul]]]]]]]]Transform` is a function type that defines a standard interface for applying high-level transformations, such as personality or identity, to a [System Prompt](../concepts/system-prompt.md) string [Source 2]. It is primarily used with the `ContextEngine` class to modify its `basePrompt` before other sections are added [Source 1].

This type serves as a decoupling mechanism, allowing the core `ContextEngine` to remain independent of optional modules like the `Soul` module from the `yaaf/gateway` package. Any function that matches the `SoulTransform` signature can be used to inject personality, regardless of its origin [Source 2].

A `SoulTransform` function takes the original base prompt as a string and returns a new, modified string. A common implementation is to prepend a personality block to the base prompt [Source 1].

## Signature

The `SoulTransform` is defined as a function type that accepts a single string argument and returns a string [Source 2].

```typescript
export type SoulTransform = (basePrompt: string) => string;
```

- **`basePrompt`**: `string` - The original system prompt to be transformed.
- **Returns**: `string` - The new system prompt with the transformation applied.

## Examples

### Basic Inline Transform

A `SoulTransform` can be a simple, inline function passed to a `ContextEngine` instance.

```typescript
import { ContextEngine, type SoulTransform } from 'yaaf';

const engine = new ContextEngine({
  basePrompt: 'You are a helpful assistant.',
  maxTokens: 4096,
});

// Define and set the soul transform
const soulTransform: SoulTransform = (prompt) => {
  return `## Personality\nYou are warm and friendly.\n\n${prompt}`;
};
engine.setSoul(soulTransform);

// Build the final prompt
const prompt = await engine.build();
/*
prompt will be:
"## Personality
You are warm and friendly.

You are a helpful assistant."
*/
```
[Source 1]

### Using with the Soul Module

The primary use case for `SoulTransform` is to integrate with the `Soul` class from the optional `yaaf/gateway` package. The `Soul` class provides a `toTransform()` method that returns a function matching the `SoulTransform` signature.

```typescript
import { ContextEngine } from 'yaaf';
import { Soul } from 'yaaf/gateway'; // Optional module

// Assume engine is an initialized ContextEngine instance
const engine = new ContextEngine({
  basePrompt: 'Your task is to provision cloud infrastructure.',
});

// Create a Soul from a configuration object
const soul = new Soul({
  name: 'Atlas',
  role: 'Senior DevOps Engineer',
  personality: 'Precise, thorough, slightly dry humor.',
  rules: [
    'Always explain the why, not just the how',
    'Suggest monitoring for any infrastructure change',
  ],
});

// Get the transform function from the Soul instance
const transform = soul.toTransform();

// Pass the transform to the ContextEngine
engine.setSoul(transform);

const prompt = await engine.build();
// The prompt will now be prepended with the structured personality from the Soul object.
```
[Source 1]

## See Also

- `ContextEngine`: The class that consumes `SoulTransform` functions to manage system prompts.
- `Soul`: A class in the `yaaf/gateway` package for defining agent personalities, which can generate a `SoulTransform`.

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/prompts.md
[Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/contextEngine.ts