---
title: Soul
entity_type: api
summary: A class for defining and managing an agent's personality, role, and rules, which can be converted into a SoulTransform.
export_name: Soul
source_file: src/gateway/soul.ts
category: class
search_terms:
 - agent personality
 - define agent identity
 - SOUL.md file
 - system prompt persona
 - agent role and rules
 - ContextEngine soul
 - SoulTransform
 - how to set agent persona
 - markdown for agent config
 - separating identity from instructions
 - yaaf/gateway
 - agent guardrails
 - behavioral rules
 - agent tone
stub: false
compiled_at: 2026-04-24T17:39:04.713Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/prompts.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/soul.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `Soul` class provides a structured way to define an agent's core identity, including its name, role, personality, and behavioral rules. It is designed to separate the stable, long-term aspects of an agent's persona ("who" the agent is) from the transient, task-specific instructions ("what" the agent does) [Source 2]. This class is available as an opt-in feature via the `yaaf/gateway` import path [Source 1].

A `Soul` can be instantiated directly with a configuration object or loaded from a dedicated Markdown file, conventionally named `SOUL.md`. The primary purpose of a `Soul` instance is to generate a `SoulTransform`, a function that prepends the agent's personality information to a [System Prompt](../concepts/system-prompt.md). This transform is typically used with a `ContextEngine` to ensure the agent's persona is consistently applied [Source 1].

## Signature / Constructor

A `Soul` instance is created using its constructor with a `SoulConfig` object.

```typescript
import { Soul, type SoulConfig } from 'yaaf/gateway';

const soul = new Soul({
  name: 'Atlas',
  role: 'Senior DevOps Engineer',
  personality: 'Precise, thorough, slightly dry humor.',
  rules: [
    'Always explain the why, not just the how',
    'Suggest monitoring for any infrastructure change',
  ],
});
```

### `SoulConfig` Type

The configuration object passed to the constructor has the following properties:

*   `name: string`: The agent's name.
*   `role: string`: A description of the agent's role or specialization.
*   `personality: string`: A description of the agent's personality traits.
*   `rules: string[]`: A list of behavioral rules or guardrails the agent must follow.

## Methods & Properties

### Static Methods

#### `fromFile()`

Loads an agent's personality from a `SOUL.md` file.

**Signature**
```typescript
public static fromFile(path: string): Soul;
```

**Parameters**
*   `path`: The file system path to the `SOUL.md` file.

**Returns**
*   A new `Soul` instance populated with the data parsed from the file.

### Instance Methods

#### `toTransform()`

Creates a `SoulTransform` function that can be used to apply the soul's personality to a system prompt.

**Signature**
```typescript
public toTransform(): SoulTransform;
```

**Returns**
*   A `SoulTransform` function. This function takes a prompt string as input and returns a new string with the soul's personality information prepended. It is designed to be used with `ContextEngine.setSoul()` [Source 1].

## Examples

### Creating a Soul Inline

A `Soul` can be defined directly in code and used to create a transform for a `ContextEngine`.

```typescript
import { Soul, SoulConfig } from 'yaaf/gateway';
// Assume 'engine' is an instance of ContextEngine
// import { ContextEngine } from 'yaaf';
// const engine = new ContextEngine(...);

const soul = new Soul({
  name: 'Atlas',
  role: 'Senior DevOps Engineer',
  personality: 'Precise, thorough, slightly dry humor.',
  rules: [
    'Always explain the why, not just the how',
    'Suggest monitoring for any infrastructure change',
  ],
});

const transform = soul.toTransform();

// The transform can then be passed to a ContextEngine instance
// engine.setSoul(transform);
```
[Source 1]

### Loading a Soul from a File

For better separation of concerns, the agent's personality can be defined in a `SOUL.md` file and loaded at runtime.

```typescript
import { Soul } from 'yaaf/gateway';

// Loads the personality from './SOUL.md'
const soul = Soul.fromFile('./SOUL.md');

const transform = soul.toTransform();
// engine.setSoul(transform);
```
[Source 1]

### `SOUL.md` File Format

The `SOUL.md` file uses Markdown headers to structure the agent's personality traits.

```markdown
# Atlas

## Role
Senior DevOps Engineer specializing in Kubernetes and CI/CD.

## Personality
- Precise and thorough
- Slightly dry humor
- Proactive about security

## Rules
- Always explain the "why" behind recommendations
- Suggest monitoring for any infrastructure change
- Default to least-privilege access patterns

## Tone
Professional but approachable. Uses analogies for complex concepts.
```
[Source 1]

## See Also

*   **ContextEngine**: The higher-level prompt manager that consumes the `SoulTransform` generated by a `Soul` instance.
*   **SystemPromptBuilder**: A lower-level utility for assembling system prompts, which can be used independently of the `Soul` and `ContextEngine` system.

## Sources

*   [Source 1]: `/Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/prompts.md`
*   [Source 2]: `/Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/soul.ts`