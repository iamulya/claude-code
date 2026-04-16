---
title: Soul Personality
entity_type: concept
summary: A framework-level pattern for defining agent identity, rules, and tone using structured Markdown files.
related_subsystems:
  - yaaf/gateway
  - ContextEngine
stub: false
compiled_at: 2026-04-16T14:11:01.100Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/prompts.md
confidence: 0.85
---

## What It Is
**Soul Personality** is a design pattern in YAAF used to define an agent's identity, behavioral constraints, and communication style. It provides a structured alternative to unstructured system strings, allowing developers to maintain agent personas in human-readable Markdown files or structured configuration objects.

The primary purpose of the Soul Personality concept is to decouple the "who" of an agent (its persona and rules) from the "how" (the technical prompt assembly and context management). By using this abstraction, developers can iterate on agent behavior without modifying the underlying logic of the prompt builder or context engine.

## How It Works in YAAF
The Soul Personality is implemented primarily through the `Soul` class, which is an opt-in feature available via the `yaaf/gateway` package. 

### The Soul Class
The `Soul` class acts as a container for identity data. It can be instantiated in two ways:
1.  **From a File**: Using `Soul.fromFile('./path/to/SOUL.md')`, which parses a structured Markdown file.
2.  **Inline Configuration**: Using the `SoulConfig` object to define properties like `name`, `role`, `personality`, and `rules`.

### Integration with ContextEngine
To apply a personality to an agent, the `Soul` instance is converted into a `SoulTransform` using the `toTransform()` method. This transform is then passed to the `ContextEngine`, which is responsible for assembling the final system prompt.

When the `ContextEngine` builds a prompt, the `SoulTransform` prepends the personality definition (identity, role, and rules) to the base prompt and other dynamic sections, ensuring the LLM consistently adheres to the defined persona.

## Configuration
Soul personalities are typically configured using a specific Markdown format or via TypeScript objects.

### Markdown Format (SOUL.md)
The framework expects a structured Markdown file with specific headers to define different aspects of the agent:

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

### Programmatic Implementation
Developers can load the Markdown file and attach it to a `ContextEngine` as follows:

```typescript
import { ContextEngine } from 'yaaf';
import { Soul } from 'yaaf/gateway';

// 1. Load the soul definition
const soul = Soul.fromFile('./SOUL.md');

// 2. Initialize the ContextEngine
const engine = new ContextEngine({
  basePrompt: 'You are a helpful assistant.',
  maxTokens: 4096,
});

// 3. Apply the soul transform
engine.setSoul(soul.toTransform());

// 4. Build the final prompt
const prompt = await engine.build();
```

Alternatively, a soul can be defined directly in code:

```typescript
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