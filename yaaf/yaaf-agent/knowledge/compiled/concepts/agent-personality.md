---
title: Agent Personality
entity_type: concept
summary: The defined characteristics, role, rules, and tone that shape an agent's responses and behavior.
related_subsystems:
 - yaaf-agent
 - yaaf/gateway
search_terms:
 - how to define agent behavior
 - system prompt configuration
 - YAAF Soul file
 - agent role and rules
 - setting agent tone
 - ContextEngine personality
 - SOUL.md format
 - customizing agent responses
 - base prompt vs soul
 - what is a SoulTransform
 - agent identity
 - prompt engineering for behavior
stub: false
compiled_at: 2026-04-24T17:51:44.412Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/prompts.md
compiled_from_quality: documentation
confidence: 0.95
---

## What It Is

Agent Personality refers to the collection of defined characteristics, roles, rules, and tones that govern an agent's behavior and shape its interactions [Source 1]. In YAAF, this is primarily achieved by constructing a detailed [System Prompt](./system-prompt.md) that instructs the underlying Large Language Model ([LLM](./llm.md)) on how to act. This includes defining its identity (e.g., "You are a DevOps assistant"), its operational constraints (e.g., "Never delete production databases"), and its conversational style (e.g., "Precise, thorough, slightly dry humor") [Source 1].

## How It Works in YAAF

YAAF provides a layered set of abstractions for defining and managing agent personality, from low-level prompt construction to high-level, structured definition files [Source 1].

### SystemPromptBuilder

At the lowest level, the `SystemPromptBuilder` assembles the system prompt from various sections. Personality traits are typically defined in static sections, which are computed once and cached for the duration of an agent's session. This is efficient for defining core identity, rules, and [Skills](./skills.md) that do not change from one turn to the next [Source 1].

### ContextEngine

The `ContextEngine` is a higher-level manager that orchestrates the final prompt. It combines a base prompt with [Memory](./memory.md), skills, and an optional `[[[[[[[[Soul]]]]]]]]Transform`. A `[[[[[[[[SoulTransform]]]]]]]]` is a function that programmatically modifies the system prompt to inject personality traits. This allows for a clean separation of the agent's core logic from its personality layer [Source 1].

### Soul

The `Soul` is a high-level, opt-in abstraction from the `yaaf/gateway` package, designed specifically for defining agent personality in a structured and reusable way. A `Soul` can be defined programmatically via a `SoulConfig` object or loaded from a dedicated Markdown file (e.g., `SOUL.md`). It formalizes personality into distinct categories such as `name`, `role`, `personality`, `rules`, and `tone` [Source 1].

A `Soul` object can be converted into a `SoulTransform` function, which is then provided to the `ContextEngine` to apply the defined personality to the agent's system prompt [Source 1].

## Configuration

Developers can configure an agent's personality at different levels of abstraction.

### Using SystemPromptBuilder

Personality can be built directly using static sections for identity and rules.

```typescript
import { SystemPromptBuilder } from 'yaaf';

const builder = new SystemPromptBuilder()
  .addStatic('identity', () => 'You are a DevOps assistant.', 0)
  .addStatic('rules', () => `
## Rules
- Never delete production databases
- Always ask before modifying config files
`, 50);

const prompt = await builder.build();
```
[Source 1]

### Using ContextEngine and SoulTransform

A `SoulTransform` can be used to inject personality into a `ContextEngine`.

```typescript
import { ContextEngine, type SoulTransform } from 'yaaf';

const engine = new ContextEngine({
  basePrompt: 'You are a helpful assistant.',
  maxTokens: 4096,
});

const soulTransform: SoulTransform = (prompt) => {
  return `## Personality\nYou are warm and friendly.\n\n${prompt}`;
};
engine.setSoul(soulTransform);

const prompt = engine.build();
```
[Source 1]

### Using the Soul Abstraction

The `Soul` component provides the most structured approach, either inline or from a file.

**Inline Configuration:**

```typescript
import { Soul } from 'yaaf/gateway';
import { ContextEngine } from 'yaaf';

const soul = new Soul({
  name: 'Atlas',
  role: 'Senior DevOps Engineer',
  personality: 'Precise, thorough, slightly dry humor.',
  rules: [
    'Always explain the why, not just the how',
    'Suggest monitoring for any infrastructure change',
  ],
});

const engine = new ContextEngine(/* ... */);
engine.setSoul(soul.toTransform());
```
[Source 1]

**File-based Configuration (`SOUL.md`):**

A `Soul` can be loaded from a Markdown file, which allows for non-technical stakeholders to edit the agent's personality.

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

This file would be loaded in code as follows:

```typescript
import { Soul } from 'yaaf/gateway';

const soul = Soul.fromFile('./SOUL.md');
const transform = soul.toTransform();
// Pass transform to ContextEngine
```
[Source 1]

## Sources
[Source 1] /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/prompts.md