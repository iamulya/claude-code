---
title: rulesSection
entity_type: api
summary: A factory function to create a prompt section containing a list of operational rules for the agent.
export_name: rulesSection
source_file: src/prompt/systemPrompt.ts
category: function
search_terms:
 - agent safety rules
 - system prompt rules
 - how to define agent behavior
 - add rules to prompt
 - prompt engineering constraints
 - operational guidelines for LLM
 - SystemPromptBuilder helper
 - static prompt section
 - agent instructions
 - defining agent constraints
 - safety section factory
 - prompt section for rules
stub: false
compiled_at: 2026-04-24T17:34:16.988Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/prompts.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/prompt/systemPrompt.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `rulesSection` function is a convenience factory for creating a [System Prompt](../concepts/system-prompt.md) section that outlines an agent's operational rules or constraints. It takes an array of strings, where each string is a rule, and formats them into a markdown list under a `## Rules` heading [Source 1].

This function is designed to be used with the `SystemPromptBuilder` or helper functions like `fromSections`. The section it generates is considered static, meaning its content is computed once and cached for the duration of an agent's session. This makes it efficient for defining core behaviors that do not change from one turn to the next [Source 2].

## Signature

The function takes a single argument, an array of strings representing the rules.

```typescript
export function rulesSection(rules: string[]): SystemPromptSection;
```

**Parameters:**

*   `rules` (`string[]`): An array of strings, where each string is a rule to be included in the prompt.

**Returns:**

*   `SystemPromptSection`: A section object compatible with `SystemPromptBuilder`. The exact type is internal, but it provides the necessary structure for the builder to consume.

## Examples

The most common use case is to combine `rulesSection` with other section factories inside a `fromSections` call to compose a `SystemPromptBuilder`.

```typescript
import {
  fromSections,
  identitySection,
  dateSection,
  envSection,
  rulesSection,
} from 'yaaf';

// Compose a SystemPromptBuilder from pre-defined section factories
const builder = fromSections([
  identitySection('You are a security auditor.'),
  dateSection(),
  envSection({ REGION: 'us-east-1', ENVIRONMENT: 'staging' }),
  rulesSection([
    'Always check for SQL injection',
    'Flag hardcoded credentials',
    'Review error handling',
  ]),
]);

// The builder can now be used to generate a system prompt
// const systemPrompt = await builder.build();
```
[Source 1]

## See Also

*   `SystemPromptBuilder`: The main class for assembling system prompts from sections.
*   `fromSections`: A factory function to create a `SystemPromptBuilder` from an array of sections.
*   `identitySection`: A factory for creating the agent's identity/persona section.
*   `dateSection`: A factory for creating a dynamic section with the current date and time.
*   `envSection`: A factory for creating a section with environment information.

## Sources

*   [Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/prompts.md
*   [Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/prompt/systemPrompt.ts