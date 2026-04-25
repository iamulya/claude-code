---
title: identitySection
entity_type: api
summary: A factory function to create a prompt section defining the agent's core identity or role.
export_name: identitySection
source_file: src/prompt/systemPrompt.ts
category: function
search_terms:
 - agent persona
 - define agent role
 - system prompt identity
 - set agent personality
 - prompt engineering persona
 - how to set agent identity
 - system prompt builder section
 - base prompt factory
 - core instructions for agent
 - who am I prompt
 - YAAF agent role
 - prompt section for identity
stub: false
compiled_at: 2026-04-24T17:13:00.018Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/prompts.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/prompt/systemPrompt.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `identitySection` function is a convenience factory used to create a [System Prompt](../concepts/system-prompt.md) section that defines an agent's core identity, role, or persona [Source 2]. This function is a building block for composing system prompts, typically used with [Utilities](../subsystems/utilities.md) like `fromSections` or the `SystemPromptBuilder` class.

The section created by this factory is static, meaning its content is computed once and cached for the duration of an [Agent Session](../concepts/agent-session.md). This is suitable for identity information, which rarely changes during a single interaction [Source 2].

## Signature

The function takes a single string argument that describes the agent's identity and returns a prompt section object.

```typescript
export function identitySection(prompt: string): { /* ... */ }
```

**Parameters:**

*   `prompt` [string]: A string defining the agent's identity, for example, "You are a helpful assistant." or "You are a senior DevOps engineer."

**Returns:**

*   An object representing a static prompt section, intended for use with a `SystemPromptBuilder`.

## Examples

The most common use case is to combine `identitySection` with other section factories using `fromSections` to quickly assemble a `SystemPromptBuilder`.

```typescript
import {
  fromSections,
  identitySection,
  dateSection,
  rulesSection,
} from 'yaaf';

// Create a SystemPromptBuilder from pre-defined section factories
const builder = fromSections([
  identitySection('You are a security auditor.'),
  dateSection(),
  rulesSection([
    'Always check for SQL injection',
    'Flag hardcoded credentials',
  ]),
]);

// Build the final prompt string
const systemPrompt = await builder.build();

console.log(systemPrompt);
/*
Output will be a string combining the content from all sections.
*/
```
[Source 1]

## See Also

*   `SystemPromptBuilder`: The core class for assembling system prompts.
*   `fromSections`: A factory to create a `SystemPromptBuilder` from an array of sections.
*   `rulesSection`: A factory for creating a rules section.
*   `dateSection`: A factory for creating a dynamic date/time section.
*   `envSection`: A factory for creating a section with environment information.

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/prompts.md
[Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/prompt/systemPrompt.ts