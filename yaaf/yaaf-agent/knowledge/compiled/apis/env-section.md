---
title: envSection
entity_type: api
summary: A factory function to create a prompt section that injects specified environment variables.
export_name: envSection
source_file: src/prompt/systemPrompt.ts
category: function
search_terms:
 - inject environment variables into prompt
 - system prompt environment info
 - add cwd to prompt
 - prompt context from environment
 - dynamic prompt sections
 - how to add date to system prompt
 - YAAF prompt builder
 - SystemPromptBuilder helpers
 - current working directory in prompt
 - os info in prompt
 - platform and shell for agent
 - session-specific context
stub: false
compiled_at: 2026-04-24T17:04:47.032Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/prompts.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/prompt/systemPrompt.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `envSection` function is a convenience factory for creating a [System Prompt](../concepts/system-prompt.md) section that contains environment-specific information [Source 1]. It is designed to be used with a `SystemPromptBuilder` or the `fromSections` factory to compose a complete system prompt [Source 1].

This function can be used to inject a custom set of key-value pairs, such as deployment region or environment name, into the prompt [Source 1].

Additionally, a standard, parameter-less usage injects common system details like the current working directory (CWD), OS platform, shell, and current date [Source 2]. Because this information, particularly the CWD, can change between agent runs, the section is typically configured with a `turn` cache mode, meaning it is re-evaluated for each `build()` call on the `SystemPromptBuilder` [Source 2].

## Signature

The function accepts an object containing key-value pairs to be injected into the prompt section.

```typescript
export function envSection(variables: Record<string, string>): PromptSection;
```

*   **`variables`**: An object where keys and values are strings. Each key-value pair will be formatted and included in the resulting prompt section.

The function returns a configuration object compatible with `SystemPromptBuilder` methods.

## Examples

The following example demonstrates how to use `envSection` within the `fromSections` factory to create a `SystemPromptBuilder` with a custom environment section.

```typescript
import {
  fromSections,
  identitySection,
  dateSection,
  envSection,
  rulesSection,
} from 'yaaf';

// Compose a SystemPromptBuilder from section factories
const customBuilder = fromSections([
  identitySection('You are a security auditor.'),
  dateSection(),
  // Inject specific environment variables into the prompt
  envSection({ REGION: 'us-east-1', ENVIRONMENT: 'staging' }),
  rulesSection([
    'Always check for SQL injection',
    'Flag hardcoded credentials',
  ]),
]);

const prompt = await customBuilder.build();
```
[Source 1]

## See Also

*   `SystemPromptBuilder`
*   `fromSections`
*   `identitySection`
*   `rulesSection`
*   `dateSection`
*   `defaultPromptBuilder`

## Sources

*   [Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/prompts.md
*   [Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/prompt/systemPrompt.ts