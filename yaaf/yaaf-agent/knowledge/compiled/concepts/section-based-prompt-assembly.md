---
title: Section-based Prompt Assembly
entity_type: concept
summary: A method of constructing system prompts by combining discrete, modular sections, each serving a specific purpose.
search_terms:
 - modular prompt construction
 - dynamic prompt building
 - how to manage system prompts
 - conditional prompt sections
 - prompt composition
 - YAAF prompt builder
 - adding rules to a prompt
 - caching prompt parts
 - SystemPromptBuilder
 - ContextEngine prompt management
 - dynamic prompt content
 - prompt engineering framework
stub: false
compiled_at: 2026-04-24T18:01:36.345Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/prompts.md
compiled_from_quality: documentation
confidence: 0.95
---

## What It Is

Section-based Prompt Assembly is a design pattern used in YAAF for constructing large or complex system prompts. Instead of using a single, monolithic block of text, this approach builds the final prompt by combining multiple smaller, independent, and often reusable blocks called "sections" [Source 1]. Each section serves a distinct purpose, such as defining the agent's identity, listing operational rules, injecting dynamic data like the current time, or including conditional information like debugging instructions [Source 1].

This pattern addresses the maintainability and scalability challenges of hardcoded prompts. It allows developers to manage different parts of the prompt independently, apply conditional logic, and efficiently update dynamic content without rebuilding the entire prompt from scratch [Source 1].

## How It Works in YAAF

The primary implementation of this concept in YAAF is the `SystemPromptBuilder` class. This builder provides methods to add different types of sections, which are then assembled into a final string prompt upon request [Source 1].

The builder supports several types of sections, categorized by how and [when](../apis/when.md) their content is computed:

*   **Static Sections**: Added using the `.addStatic()` method, these sections are computed once and their content is cached for the duration of a session (until `reset()` is called). They are ideal for stable content like the agent's core identity, fundamental rules, or available [Skills](./skills.md). Sections can be ordered using a numeric priority argument [Source 1].
*   **Dynamic Sections**: Added using `.addDynamic()`, these sections are re-evaluated every time the `build()` method is called. This is used for volatile information that changes between turns, such as the current timestamp or a summary of recent conversation [Memory](./memory.md) [Source 1].
*   **Conditional Sections**: Added using `.addWhen()`, these sections are only included in the final prompt if a provided predicate function returns `true`. This allows for context-aware modifications, such as adding verbose debugging information to the prompt only when a specific environment variable is set [Source 1].

This section-based approach is also utilized by higher-level abstractions like the `ContextEngine`. The `ContextEngine` combines a `SystemPromptBuilder` with memory management, skills, and other components, such as an optional "[Soul](../apis/soul.md)" transform for personality, to produce the final context for the [LLM](./llm.md) [Source 1].

## Configuration

Developers can use the `SystemPromptBuilder` directly to compose a prompt from various sections.

```typescript
import { SystemPromptBuilder } from 'yaaf';

const builder = new SystemPromptBuilder()
  // Static sections are cached for the session and ordered by the third argument.
  .addStatic('identity', () => 'You are a DevOps assistant.', 0)
  .addStatic('rules', () => `
## Rules
- Never delete production databases
- Always ask before modifying config files
- Use conventional commit format
`, 50)

  // Conditional sections are included only when the first argument returns true.
  .addWhen(
    () => process.env.DEBUG === '1',
    'debug-mode',
    () => '## Debug Mode\nEnable verbose reasoning and show internal state.',
  )

  // Dynamic sections are recomputed on every .build() call.
  .addDynamic('memory', () => memStore.buildPrompt(), 'memory updates per turn', 200)
  .addDynamic('timestamp', () => `Current time: ${new Date().toISOString()}`, 'time', 210);

const prompt = await builder.build();
```
[Source 1]

YAAF also provides convenience factories to streamline the creation of common prompt structures. The `defaultPromptBuilder` comes pre-configured with standard sections, and individual section factories like `identitySection` and `rulesSection` can be composed using `fromSections` [Source 1].

```typescript
import {
  defaultPromptBuilder,
  envSection,
  rulesSection,
  identitySection,
  dateSection,
  fromSections,
} from 'yaaf';

// Use a pre-configured builder
const builder = defaultPromptBuilder('You are a code reviewer.');

// Or compose a custom builder from section factories
const custom = fromSections([
  identitySection('You are a security auditor.'),
  dateSection(),
  envSection({ REGION: 'us-east-1', ENVIRONMENT: 'staging' }),
  rulesSection([
    'Always check for SQL injection',
    'Flag hardcoded credentials',
    'Review error handling',
  ]),
]);
```
[Source 1]

## Sources
[Source 1] /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/prompts.md