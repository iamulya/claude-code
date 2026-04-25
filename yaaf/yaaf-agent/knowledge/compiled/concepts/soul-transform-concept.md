---
title: Soul Transform (Concept)
entity_type: concept
summary: A function that modifies a system prompt to inject an agent's personality, role, or other high-level directives.
related_subsystems:
 - ContextEngine
 - yaaf/gateway
search_terms:
 - agent personality
 - define agent character
 - how to set agent persona
 - system prompt modification
 - ContextEngine soul
 - yaaf/gateway Soul class
 - SOUL.md format
 - injecting rules into prompt
 - high-level agent directives
 - prompt transformation function
 - setSoul method
 - agent persona management
 - prompt templating
stub: false
compiled_at: 2026-04-24T18:02:14.770Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/prompts.md
compiled_from_quality: documentation
confidence: 0.9
---

## What It Is

A [Soul](../apis/soul.md) Transform is a function that programmatically modifies a [System Prompt](./system-prompt.md) to inject an agent's core identity. This identity can include its personality, role, primary objectives, behavioral rules, or tone of voice [Source 1].

The purpose of this concept is to separate the stable, high-level characteristics of an agent from the more dynamic, turn-by-turn components of the system prompt, such as [Memory](./memory.md) or contextual information. This separation makes prompt construction more modular and allows developers to define and manage an agent's persona in a structured, reusable way.

## How It Works in YAAF

In YAAF, a Soul Transform is a function with the signature `(prompt: string) => string`. It takes the assembled system prompt as input and returns a new version with the "soul" information prepended or otherwise integrated [Source 1].

The primary consumer of a Soul Transform is the `ContextEngine` subsystem. The `ContextEngine` is responsible for assembling the final system prompt from various components like static rules, dynamic memory, and [Skills](./skills.md). It exposes a `setSoul()` method to register a Soul Transform. [when](../apis/when.md) the `ContextEngine.build()` method is called, it first constructs the prompt from all its other sections and then applies the registered transform as the final step before returning the complete system prompt [Source 1].

While a developer can write a Soul Transform function manually, the framework provides a higher-level abstraction called the `Soul` class, available in the optional `yaaf/gateway` package. The `Soul` class can parse a structured Markdown file (conventionally named `SOUL.md`) or a configuration object to define the agent's persona. An instance of the `Soul` class can then generate the corresponding `SoulTransform` function via its `toTransform()` method [Source 1].

## Configuration

A Soul Transform can be configured and applied in two primary ways.

### Manual Transform Function

A developer can define a simple function and pass it directly to the `ContextEngine`. This is useful for simple or dynamically generated personas.

```typescript
import { ContextEngine, type SoulTransform } from 'yaaf';

// Assume 'engine' is an initialized ContextEngine instance
const engine = new ContextEngine({
  basePrompt: 'You are a helpful assistant.',
  maxTokens: 4096,
});

const soulTransform: SoulTransform = (prompt) => {
  // Prepend the personality section to the existing prompt
  return `## Personality\nYou are warm and friendly.\n\n${prompt}`;
};

engine.setSoul(soulTransform);

// When engine.build() is called, the transform will be applied.
const finalPrompt = engine.build();
```
[Source 1]

### Using the `Soul` Class

For more structured and reusable personas, the `yaaf/gateway` package's `Soul` class is recommended. It can be instantiated from a configuration object or by parsing a Markdown file.

**1. From a Configuration Object:**

```typescript
import { Soul } from 'yaaf/gateway';
import { ContextEngine } from 'yaaf';

// Assume 'engine' is an initialized ContextEngine instance
const engine = new ContextEngine(/* ... */);

const soul = new Soul({
  name: 'Atlas',
  role: 'Senior DevOps Engineer',
  personality: 'Precise, thorough, slightly dry humor.',
  rules: [
    'Always explain the why, not just the how',
    'Suggest monitoring for any infrastructure change',
  ],
});

// Generate the transform and set it on the engine
const transform = soul.toTransform();
engine.setSoul(transform);
```
[Source 1]

**2. From a `SOUL.md` File:**

The `Soul` class can also parse a specially formatted Markdown file.

**`SOUL.md` File Example:**
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
```
[Source 1]

**Code to use the file:**
```typescript
import { Soul } from 'yaaf/gateway';
import { ContextEngine } from 'yaaf';

// Assume 'engine' is an initialized ContextEngine instance
const engine = new ContextEngine(/* ... */);

// The Soul class parses the file and creates the persona
const soul = Soul.fromFile('./SOUL.md');

// Generate the transform and set it on the engine
const transform = soul.toTransform();
engine.setSoul(transform);
```
[Source 1]

## Sources
[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/prompts.md