---
summary: Generates a static rules and safety guidelines section for the system prompt.
export_name: rulesSection
source_file: src/prompt/systemPrompt.ts
category: function
title: rulesSection
entity_type: api
stub: false
compiled_at: 2026-04-16T14:32:17.916Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/prompt/systemPrompt.ts
confidence: 0.9
---

## Overview
The `rulesSection` function is a utility used to define behavioral constraints, safety guidelines, or operational rules within a system prompt. It is designed to work in conjunction with the `SystemPromptBuilder` to provide a structured "Rules" section.

This section is classified as **static**, meaning it is computed once and cached for the lifetime of the session. This approach is intended to be "cheap" to render and compatible with prompt-caching mechanisms, as rules typically do not change between individual turns of a conversation.

## Signature
```typescript
export function rulesSection(rules: string[]): {
  name: string;
  fn: () => string;
  cache: 'session';
}
```

### Parameters
- `rules`: An array of strings, where each string represents an individual rule or constraint for the agent.

## Methods & Properties
The function returns a section definition object compatible with the `SystemPromptBuilder` registry. This object includes:
- A name identifier (typically "rules").
- A function (`fn`) that renders the rules into a formatted string (usually a Markdown list).
- A cache policy set to `session`.

## Examples
### Basic Usage
This example demonstrates how to define a set of rules and incorporate them into a system prompt using the builder.

```typescript
import { SystemPromptBuilder, rulesSection } from 'yaaf';

const myRules = [
  'Never make up code or libraries that do not exist.',
  'Always ask for confirmation before deleting any files.',
  'If you are unsure of a command, explain your uncertainty.'
];

const builder = new SystemPromptBuilder()
  .addStatic('identity', () => 'You are a filesystem assistant.')
  // Using the rulesSection helper
  .addSection(rulesSection(myRules));

const systemPrompt = await builder.build();
```

## See Also
- `SystemPromptBuilder`
- `identitySection`
- `envSection`
- `dateSection`