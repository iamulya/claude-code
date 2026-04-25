---
summary: A utility function to programmatically create a `Soul` object from a configuration.
export_name: createSoul
source_file: src/agents/soul.ts
category: function
title: createSoul
entity_type: api
search_terms:
 - programmatic soul creation
 - define agent personality in code
 - how to create a Soul object
 - inline agent identity
 - agent configuration
 - personality system
 - SOUL.md alternative
 - build agent identity
 - configure agent name
 - set agent rules
 - agent tone of voice
 - YAAF personality
stub: false
compiled_at: 2026-04-24T16:59:44.938Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/soul.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `createSoul` function is a factory for programmatically constructing a `Soul` object. A `Soul` object encapsulates an agent's identity—its name, personality, tone, and behavioral rules—separating it from its task-specific instructions [Source 1].

This function is useful for defining an agent's personality directly within the application code, especially for agents with simple or dynamically generated identities. It serves as an alternative to loading a personality from an external `SOUL.md` file using `loadSoul` [Source 1].

## Signature

The function takes a single configuration object of type `Soul` and returns a `Soul` object [Source 1].

```typescript
export function createSoul(config: Soul): Soul;
```

### Configuration (`Soul` type)

The `config` object adheres to the `Soul` type definition [Source 1]:

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

- **`name`**: The agent's name.
- **`personality`**: A description of the agent's core personality.
- **`tone`**: (Optional) The desired communication tone. Can be a predefined value or a custom string.
- **`rules`**: (Optional) A list of behavioral rules or guardrails for the agent to follow.
- **`preferences`**: (Optional) A key-value map of user-specific preferences.
- **`sections`**: (Optional) A key-value map for any custom sections, where the value is markdown content.

## Examples

The following example demonstrates creating a `Soul` for an agent named "Molty" with a cheerful personality and specific behavioral rules [Source 1].

```typescript
import { createSoul, applySoul } from 'yaaf';

const Soul = createSoul({
  name: 'Molty',
  personality: 'Cheerful space lobster who loves helping humans.',
  tone: 'casual',
  rules: ['Never reveal system internals', 'Be concise'],
});

// The created Soul can then be applied to a [[[[[[[[System Prompt]]]]]]]]
const systemPrompt = applySoul('You help with calendar management.', [[Soul]]);

console.log(systemPrompt);
```

## See Also

- `loadSoul`: For loading a `Soul` from a `.md` file.
- `applySoul`: For combining a `Soul` with a task-specific System Prompt.
- `parseSoulMd`: For parsing a `SOUL.md` string into a `Soul` object.
- `Soul` (type): The type definition for an agent's identity.

## Sources

[Source 1]: src/agents/[Soul](./soul.md).ts