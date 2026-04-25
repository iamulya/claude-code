---
title: fromSections
entity_type: api
summary: A factory function that creates a SystemPromptBuilder from an array of section definitions.
export_name: fromSections
source_file: src/prompt/systemPrompt.ts
category: function
search_terms:
 - compose system prompt
 - build prompt from parts
 - system prompt factory
 - create prompt builder
 - multiple prompt sections
 - static prompt sections
 - declarative system prompt
 - initialize SystemPromptBuilder
 - prompt assembly from array
 - quick prompt builder setup
 - yaaf prompt composition
 - prompt builder from array
stub: false
compiled_at: 2026-04-24T17:07:18.725Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/prompts.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/prompt/systemPrompt.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `fromSections` function is a convenience factory for creating a `SystemPromptBuilder` instance. It allows for a declarative, quick assembly of a prompt builder from a simple array of sections, as an alternative to the fluent, chained-method approach (e.g., `new SystemPromptBuilder().addStatic(...)`).

Each entry in the input array defines a named section of the [System Prompt](../concepts/system-prompt.md). According to the source code, all sections created via this factory are treated as static, meaning their content is computed once and cached for the duration of an agent's session [Source 2]. This makes it suitable for defining stable parts of a prompt like identity, rules, or tool definitions.

## Signature

The function takes a single argument: an array of tuples. Each tuple consists of a section name (string) and its content, which can be either a string literal or a function that returns a string (or a Promise of a string).

```typescript
type SectionFn = () => string | Promise<string>;

export function fromSections(
  entries: Array<[name: string, content: SectionFn | string]>,
): SystemPromptBuilder;
```

**Parameters:**

*   `entries`: `Array<[name: string, content: SectionFn | string]>`
    *   An array where each element is a two-item tuple:
        1.  `name`: A `string` identifier for the section.
        2.  `content`: The section's content, provided as a `string` or a `SectionFn` that resolves to a string.

**Returns:**

*   `SystemPromptBuilder`
    *   A new `SystemPromptBuilder` instance pre-configured with the provided static sections.

## Examples

### Basic Usage

This example demonstrates creating a `SystemPromptBuilder` with three static sections, matching the function's signature. The content for each section is provided as a string, a synchronous function, and an asynchronous function, respectively.

```typescript
import { fromSections } from 'yaaf';

const builder = fromSections([
  ['identity', 'You are a helpful code reviewer.'],
  ['rules', () => '## Rules\n- Always check for off-by-one errors.'],
  ['tools', async () => Promise.resolve('## Tools\n- Linter\n- Static Analyzer')]
]);

// The builder can now be used to generate the system prompt.
const prompt = await builder.build();

console.log(prompt);
// Output will be the concatenated content of the three sections.
```

### Composition with Section Factories

Some documentation sources show a different pattern, where the results of other section factory functions (like `identitySection`, `rulesSection`, etc.) are passed into an array [Source 1]. This pattern does not directly match the `[name, content]` tuple signature described in the source code [Source 2]. This may indicate an undocumented overload or a discrepancy in the source material.

The example below is from the documentation and illustrates this alternative composition pattern [Source 1].

```typescript
import {
  fromSections,
  identitySection,
  dateSection,
  envSection,
  rulesSection,
} from 'yaaf';

// Note: This usage pattern differs from the function's primary signature.
const customBuilder = fromSections([
  identitySection('You are a security auditor.'),
  dateSection(),
  envSection({ REGION: 'us-east-1', ENVIRONMENT: 'staging' }),
  rulesSection([
    'Always check for SQL injection',
    'Flag hardcoded credentials',
    'Review error handling',
  ]),
]);

const prompt = await customBuilder.build();
```

## See Also

*   `SystemPromptBuilder`: The class that `fromSections` instantiates and configures.
*   `defaultPromptBuilder`: Another factory function for creating a `SystemPromptBuilder` with a default set of sections.
*   `identitySection`, `rulesSection`, `dateSection`, `envSection`: Individual section factory functions that can be used to compose a system prompt.

## Sources

*   [Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/prompts.md
*   [Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/prompt/systemPrompt.ts