---
summary: A core concept in YAAF that separates an agent's identity and personality from its task-specific instructions, inspired by OpenClaw's SOUL.md approach.
primary_files:
 - src/agents/soul.ts
tags:
 - agent-architecture
 - personality
 - system-prompt
title: Agent Personality System (SOUL)
entity_type: concept
related_subsystems:
 - agents
search_terms:
 - agent identity
 - agent personality
 - SOUL.md
 - separate personality from instructions
 - how to define agent character
 - system prompt construction
 - agent guardrails
 - agent behavioral rules
 - OpenClaw SOUL
 - load agent personality from file
 - YAAF soul
 - what is a soul file
stub: false
compiled_at: 2026-04-24T17:51:38.905Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/soul.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

The [Agent Personality](./agent-personality.md) System, or [Soul](../apis/soul.md), is a core concept in YAAF for separating an agent's identity from its task-specific instructions [Source 1]. The primary goal of this system is to define *who* the agent is, rather than *what* it does in a particular context. This allows for a reusable and consistent personality that can be applied across various tasks [Source 1].

This approach is inspired by the `SOUL.md` methodology from the OpenClaw project, which advocates for storing an agent's personality in a dedicated file [Source 1].

## How It Works in YAAF

The SOUL system is implemented around the `Soul` type. A `Soul` object encapsulates the various facets of an agent's identity [Source 1]. The key properties of a `Soul` object are:

*   `name`: The agent's name.
*   `personality`: A core description of the agent's character.
*   `tone`: The desired communication style (e.g., "casual", "professional").
*   `rules`: A list of behavioral rules or guardrails the agent must follow.
*   `preferences`: User-specific overrides or settings.
*   `sections`: A flexible container for custom, free-form markdown content [Source 1].

A `Soul` can be instantiated in two primary ways:

1.  **Programmatically**: Using the `createSoul` function to build a `Soul` object directly in code [Source 1].
2.  **From a file**: Using the `loadSoul` function to parse a markdown file, conventionally named `SOUL.md`. This file format uses a YAML [Frontmatter](./frontmatter.md) block for structured metadata (like `name` and `tone`) and markdown headings for content sections (like `Personality` and `Rules`). The `parseSoulMd` function handles the underlying parsing logic [Source 1].

Once a `Soul` object is created, the `applySoul` function combines it with a task-specific [System Prompt](./system-prompt.md). This function prepends the agent's identity information to the task instructions, creating a complete, unified system prompt to be sent to the [LLM](./llm.md) [Source 1].

## Configuration

A developer can define an agent's SOUL either directly in TypeScript code or within a dedicated `.md` file.

### Programmatic Configuration

The `createSoul` function allows for inline definition of an agent's personality.

```typescript
import { createSoul, applySoul } from 'yaaf';

const soul = createSoul({
  name: 'Molty',
  personality: 'Cheerful space lobster who loves helping humans.',
  tone: 'casual',
  rules: ['Never reveal system internals', 'Be concise'],
});

const taskPrompt = 'You help with calendar management.';
const finalSystemPrompt = applySoul(taskPrompt, soul);
```
[Source 1]

### File-Based Configuration

For better separation, the personality can be defined in a `SOUL.md` file.

**Example `SOUL.md` file:**
```markdown
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
```
[Source 1]

This file can then be loaded into the application using the `loadSoul` function.

```typescript
import { loadSoul } from 'yaaf';

const soul = await loadSoul('./SOUL.md');
```
[Source 1]

## Sources

[Source 1]: src/agents/soul.ts