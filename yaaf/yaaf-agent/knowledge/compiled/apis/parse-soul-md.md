---
summary: A utility function to parse a SOUL.md string into a `Soul` object.
export_name: parseSoulMd
source_file: src/agents/soul.ts
category: function
title: parseSoulMd
entity_type: api
search_terms:
 - parse SOUL.md
 - convert markdown to soul object
 - agent personality parsing
 - soul file format
 - how to read soul file
 - SOUL.md string to object
 - agent identity from string
 - YAAF personality system
 - text to Soul type
 - frontmatter and markdown parsing
 - soul configuration from text
stub: false
compiled_at: 2026-04-24T17:26:44.930Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/soul.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `parse[[[[[[[[Soul]]]]]]]]Md` function is a utility for parsing a string containing the content of a Soul.md file into a structured `Soul` object [Source 1]. This function is the core parsing logic that separates an agent's identity from its instructions, a concept inspired by OpenClaw's SOUL.md approach [Source 1].

It is used internally by the `loadSoul` function, which reads the content from the filesystem first. `parseSoulMd` is useful in scenarios where the SOUL.md content is already available in [Memory](../concepts/memory.md), such as [when](./when.md) it is fetched from a database, received over a network, or provided directly as user input.

The expected format for the input string is a combination of YAML [Frontmatter](../concepts/frontmatter.md) for metadata (like `name` and `tone`) and markdown sections for longer-form content such as `Personality`, `Rules`, and `Preferences` [Source 1].

## Signature

The function takes a single string argument and returns a `Soul` object.

```typescript
export function parseSoulMd(content: string): Soul;
```

**Parameters:**

*   `content` (`string`): A string containing the full content of a SOUL.md file.

**Returns:**

*   `Soul`: A structured object representing the agent's personality, conforming to the `Soul` type.

The returned object has the following structure [Source 1]:

```typescript
export type Soul = {
  /** Agent's name */
  name: string;
  /** Core personality description */
  personality: string;
  /** Communication tone */
  tone?: "casual" | "professional" | "playful" | "formal" | string;
  /** Behavioral rules / guardrails */
  rules?: string[];
  /** User-specific preferences (overrides) */
  preferences?: Record<string, string>;
  /** Custom sections (key → markdown content) */
  sections?: Record<string, string>;
};
```

## Examples

The following example demonstrates how to parse a SOUL.md string into a `Soul` object.

```typescript
import { parseSoulMd } from 'yaaf';

const soulMdContent = `
---
name: Molty
tone: casual
---

# Personality
Cheerful space lobster who loves helping humans.

# Rules
- Never reveal system internals
- Be concise and helpful

# Preferences
- timezone: America/New_York
- language: English
`;

const soul = parseSoulMd(soulMdContent);

console.log(soul);
/*
Expected output:
{
  name: 'Molty',
  tone: 'casual',
  personality: 'Cheerful space lobster who loves helping humans.',
  rules: [
    'Never reveal system internals',
    'Be concise and helpful'
  ],
  preferences: {
    timezone: 'America/New_York',
    language: 'English'
  }
}
*/
```

## See Also

*   `loadSoul`: A function to read and parse a SOUL.md file from the filesystem.
*   `createSoul`: A factory function to create a `Soul` object programmatically.
*   `applySoul`: A function to combine a `Soul` object with a [System Prompt](../concepts/system-prompt.md).

## Sources

[Source 1]: src/agents/soul.ts