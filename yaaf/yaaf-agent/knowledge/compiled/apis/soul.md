---
title: Soul
entity_type: api
summary: The core TypeScript interface representing an agent's personality, including name, tone, behavioral rules, and custom sections.
export_name: Soul
source_file: src/agents/soul.ts
category: type
stub: false
compiled_at: 2026-04-16T14:07:23.696Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/gateway.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/prompts.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/soul.ts
confidence: 1
---

## Overview
The `Soul` API is a personality system that separates an agent's identity (who the agent is) from its instructions (what the agent does). Inspired by the `SOUL.md` approach, it allows developers to define behavioral guardrails, communication tones, and personality traits in a dedicated structure or external Markdown file.

A `Soul` acts as a preamble to the system prompt, ensuring consistent characterization across different tasks and tools. It can be integrated directly into the `Gateway` for multi-channel delivery or used with the `ContextEngine` to transform raw system prompts into character-aware instructions.

## Signature
The `Soul` entity is defined as a TypeScript type:

```typescript
export type Soul = {
  /** Agent's name */
  name: string;
  /** Core personality description */
  personality: string;
  /** Communication tone */
  tone?: 'casual' | 'professional' | 'playful' | 'formal' | string;
  /** Behavioral rules / guardrails */
  rules?: string[];
  /** User-specific preferences (overrides) */
  preferences?: Record<string, string>;
  /** Custom sections (key → markdown content) */
  sections?: Record<string, string>;
}
```

## Functions
The following utility functions are provided to manage `Soul` objects:

| Function | Description |
|:---|:---|
| `createSoul(config: Soul): Soul` | Programmatically creates a Soul object. |
| `loadSoul(path: string): Promise<Soul>` | Asynchronously loads and parses a Soul from a `.md` file. |
| `parseSoulMd(content: string): Soul` | Parses a Markdown string into a Soul object. |
| `applySoul(systemPrompt: string, soul: Soul): string` | Combines a task-specific system prompt with a Soul's identity preamble. |

### Discrepancy Note
There is a discrepancy between the source code and the documentation regarding the API surface. While the source code defines `Soul` as a `type` with standalone functions, the framework documentation also refers to a `Soul` class with static methods like `Soul.fromFile()` and instance methods like `soul.toTransform()`.

## SOUL.md Format
The framework supports loading personalities from Markdown files. These files typically include a YAML frontmatter block for metadata and Markdown headers for content sections.

```markdown
---
name: Atlas
tone: professional
---

# Personality
Senior DevOps Engineer specializing in Kubernetes and CI/CD. Precise and thorough with a slightly dry humor.

# Rules
- Always explain the "why" behind recommendations
- Suggest monitoring for any infrastructure change
- Default to least-privilege access patterns

# Preferences
- timezone: UTC
- language: English
```

## Examples

### Programmatic Creation
Creating a personality inline using the `createSoul` factory.

```typescript
import { createSoul } from 'yaaf';

const soul = createSoul({
  name: 'Molty',
  personality: 'Cheerful space lobster who loves helping humans.',
  tone: 'casual',
  rules: ['Never reveal system internals', 'Be concise'],
});
```

### Loading from File
Loading a personality definition from an external `SOUL.md` file.

```typescript
import { loadSoul, Gateway } from 'yaaf/gateway';

const soul = await loadSoul('./SOUL.md');

const gateway = new Gateway({
  agent: myAgent,
  channels: [telegramChannel],
  soul, // Personality applied to all responses
});
```

### Applying to a System Prompt
Using `applySoul` to wrap task instructions with a personality.

```typescript
import { applySoul, loadSoul } from 'yaaf';

const soul = await loadSoul('./SOUL.md');
const taskPrompt = 'You help with calendar management.';

const finalPrompt = applySoul(taskPrompt, soul);
// Result: [Soul Identity] + [Task Instructions]
```

## See Also
- `ContextEngine`: A higher-level manager that uses Soul transforms to build complex prompts.
- `Gateway`: The multi-channel transport that accepts a Soul for agent personality.