---
title: dateSection
entity_type: api
summary: A factory function to create a prompt section that includes the current timestamp.
export_name: dateSection
source_file: src/prompt/systemPrompt.ts
category: function
search_terms:
 - add timestamp to prompt
 - current date in system prompt
 - dynamic prompt section
 - time-sensitive prompts
 - how to include current time
 - system prompt builder helper
 - prompt section factory
 - turn-specific information
 - session start date
 - volatile prompt data
 - dateSection factory
 - temporal context for LLM
stub: false
compiled_at: 2026-04-24T17:00:36.931Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/prompts.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/prompt/systemPrompt.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `dateSection` function is a convenience factory for creating a [System Prompt](../concepts/system-prompt.md) section that contains the current date and time [Source 1]. This section is configured as a dynamic, `turn`-cached section, meaning its content is re-evaluated every time the system prompt is built. This ensures the [LLM](../concepts/llm.md) always has the most up-to-date timestamp, which is useful for tasks requiring temporal awareness [Source 2].

This factory provides a standardized way to include time-sensitive information without manually writing the date logic. According to the source code, its behavior mirrors the session-start date feature from an internal `getSessionStartDate()` function [Source 2]. It is typically used with `SystemPromptBuilder` or the `fromSections` factory to compose a complete system prompt [Source 1].

## Signature

The function takes no arguments and returns a configuration object representing a prompt section that can be consumed by a `SystemPromptBuilder`.

```typescript
export function dateSection(): { /* Prompt Section Object */ };
```

The returned object contains the necessary properties (like name, content function, and cache mode) for the prompt builder to correctly integrate the dynamic timestamp.

## Examples

The most common use case is to combine `dateSection` with other section factories using the `fromSections` helper to quickly assemble a `SystemPromptBuilder`.

```typescript
import {
  fromSections,
  identitySection,
  rulesSection,
  dateSection,
  envSection,
} from 'yaaf';

// Assemble a SystemPromptBuilder from pre-configured sections
const customBuilder = fromSections([
  identitySection('You are a security auditor.'),
  dateSection(), // Adds the dynamic timestamp section
  envSection({ REGION: 'us-east-1', ENVIRONMENT: 'staging' }),
  rulesSection([
    'Always check for SQL injection',
    'Flag hardcoded credentials',
  ]),
]);

// When built, the prompt will include the current time
const prompt = await customBuilder.build();

/*
Example prompt output might include:

You are a security auditor.
Current time: 2023-10-27T10:00:00.000Z
... other sections ...
*/
```
[Source 1]

## See Also

- `SystemPromptBuilder`: The primary class for composing system prompts from sections.
- `fromSections`: A factory function to create a `SystemPromptBuilder` from an array of sections.
- `identitySection`: A factory for creating the agent's identity or persona section.
- `rulesSection`: A factory for creating a section detailing the agent's operational rules.
- `envSection`: A factory for creating a section with environment details like CWD and OS.

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/prompts.md
[Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/prompt/systemPrompt.ts