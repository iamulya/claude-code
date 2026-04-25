---
title: System Prompt
entity_type: concept
summary: The initial instructions and context provided to an LLM to define its role, rules, and behavior.
search_terms:
 - agent personality
 - LLM instructions
 - how to define agent behavior
 - prompt engineering
 - context management
 - dynamic prompt assembly
 - SystemPromptBuilder
 - ContextEngine
 - Soul transform
 - SOUL.md
 - agent rules
 - initial prompt
 - base prompt
stub: false
compiled_at: 2026-04-24T18:03:05.783Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/prompts.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/contextEngine.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/cli/context.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

A System Prompt is the foundational set of instructions given to a Large Language Model ([LLM](./llm.md)) at the beginning of an interaction. It establishes the agent's identity, personality, capabilities, and operational constraints. In YAAF, the System Prompt is not a static string but a dynamically assembled artifact composed of multiple sections, including core identity, rules, available [Tools](../subsystems/tools.md), and conversational [Memory](./memory.md). This structured approach allows for flexible and context-aware agent behavior.

## How It Works in YAAF

YAAF manages system prompts through a two-tiered system: the low-level `SystemPromptBuilder` for section-based assembly and the high-level `ContextEngine` for orchestration [Source 1].

### SystemPromptBuilder

The `SystemPromptBuilder` is a utility for assembling a prompt from multiple, independent sections. It features a cache-aware mechanism to avoid recomputing static content on every turn [Source 1].

-   **Sections**: Prompts are built from sections, which can be static, dynamic, or conditional. Each section has a priority number that determines its order in the final prompt, with higher numbers appearing later [Source 1, Source 2].
-   **Cache Modes**: The builder supports different caching strategies for sections [Source 1]:
    -   `session`: Computed once per session and cached. Ideal for static content like agent identity or core rules. This is the default.
    -   `turn`: Recomputed on every call to `build()`. Used for dynamic information like the current time or recent memory.
    -   `never`: Recomputed on every access. Used for highly volatile data.

### ContextEngine

The `ContextEngine` is a higher-level manager that orchestrates the entire system prompt creation process. It combines a base prompt with various sections, memory, and an optional personality layer called a "[Soul](../apis/soul.md)" [Source 1].

The engine manages a character budget (`maxChars`) for the final prompt. If the assembled content exceeds this budget, it will strategically remove sections marked as `droppable`, starting with the ones that have the lowest priority [Source 2].

### Soul Transform

A "Soul" is an opt-in feature from the `yaaf/gateway` module that defines an agent's personality, role, and tone. It can be defined in a Markdown file (e.g., `SOUL.md`) or programmatically [Source 1]. The Soul is applied to the prompt via a `SoulTransform`, which is a function that prepends the personality definition to the base prompt. This design keeps the core agent logic decoupled from the optional personality module [Source 1, Source 2].

### Introspection

YAAF provides a command-line tool to help developers inspect the final assembled system prompt. The `yaaf context list` command scans the project and shows what content would be injected at runtime, which is useful for debugging prompt composition [Source 3].

## Configuration

Developers can configure the system prompt at multiple levels, from fine-grained section assembly to high-level personality definitions.

### SystemPromptBuilder Example

The `SystemPromptBuilder` allows for granular control over prompt sections and their caching behavior [Source 1].

```typescript
import { SystemPromptBuilder } from 'yaaf';

const builder = new SystemPromptBuilder()
  // Static section, cached for the session
  .addStatic('identity', () => 'You are a DevOps assistant.', 0)
  // Dynamic section, recomputed every turn
  .addDynamic('timestamp', () => `Current time: ${new Date().toISOString()}`, 'time', 210)
  // Conditional section
  .addWhen(
    () => process.env.DEBUG === '1',
    'debug-mode',
    () => '## Debug Mode\nEnable verbose reasoning and show internal state.',
  );

const prompt = await builder.build();
```

YAAF also provides convenience factories for common sections [Source 1].

```typescript
import { fromSections, identitySection, dateSection, rulesSection } from 'yaaf';

const custom = fromSections([
  identitySection('You are a security auditor.'),
  dateSection(),
  rulesSection([
    'Always check for SQL injection',
    'Flag hardcoded credentials',
  ]),
]);
```

### ContextEngine Example

The `ContextEngine` provides a higher-level API for managing the prompt's content, including a character budget and the Soul transform [Source 1, Source 2].

```typescript
import { ContextEngine, type SoulTransform } from 'yaaf';

const engine = new ContextEngine({
  basePrompt: 'You are a helpful assistant.',
  maxChars: 4096,
});

// Add a section
engine.addSection('rules', '## Rules\n- Be concise\n- Be helpful');

// Add a Soul transform for personality
const soulTransform: SoulTransform = (prompt) => {
  return `## Personality\nYou are warm and friendly.\n\n${prompt}`;
};
engine.setSoul(soulTransform);

// Build the final prompt
const prompt = engine.build();
```

### Soul Configuration

A Soul can be defined programmatically or loaded from a Markdown file [Source 1].

**Programmatic Definition:**

```typescript
import { Soul } from 'yaaf/gateway';

const soul = new Soul({
  name: 'Atlas',
  role: 'Senior DevOps Engineer',
  personality: 'Precise, thorough, slightly dry humor.',
  rules: [
    'Always explain the why, not just the how',
  ],
});

const transform = soul.toTransform();
// engine.setSoul(transform);
```

**SOUL.md File Format:**

```markdown
# Atlas

## Role
Senior DevOps Engineer specializing in Kubernetes and CI/CD.

## Personality
- Precise and thorough
- Slightly dry humor

## Rules
- Always explain the "why" behind recommendations
- Suggest monitoring for any infrastructure change

## Tone
Professional but approachable.
```

## Sources
[Source 1] /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/prompts.md
[Source 2] /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/contextEngine.ts
[Source 3] /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/[CLI](../subsystems/cli.md)/context.ts