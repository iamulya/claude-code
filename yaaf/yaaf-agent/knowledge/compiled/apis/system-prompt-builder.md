---
title: SystemPromptBuilder
entity_type: api
summary: A fluent, section-based builder for assembling system prompts with support for static and dynamic content.
export_name: SystemPromptBuilder
source_file: src/prompt/systemPrompt.ts
category: class
stub: false
compiled_at: 2026-04-16T14:10:51.681Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/prompts.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agent.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/prompt/systemPrompt.ts
confidence: 1
---

## Overview
`SystemPromptBuilder` is a first-class utility for composing complex system prompts through a section-based registry. It is designed to optimize LLM performance and cost by explicitly separating static content (which can be cached across a session) from dynamic content (which changes per turn).

This builder allows developers to register discrete prompt fragments with specific ordering and caching behaviors. It is the underlying mechanism used by the `Agent` class when a `systemPromptProvider` is configured.

## Signature / Constructor

```typescript
export class SystemPromptBuilder {
  constructor()
}
```

## Methods & Properties

### `addStatic(name, fn, order?)`
Adds a section that is computed once and cached for the lifetime of the session. This is ideal for identity, rules, and tool definitions.
- **name**: Unique identifier for the section.
- **fn**: A function returning the section string.
- **order**: (Optional) Numeric weight for placement (lower numbers appear earlier).

### `addDynamic(name, fn, reason, order?)`
Adds a section that is recomputed on every call to `build()`. These sections are placed after a "dynamic boundary" to minimize prompt cache misses.
- **name**: Unique identifier for the section.
- **fn**: A function returning the section string.
- **reason**: A mandatory string explaining why the section must be dynamic (e.g., "memory updates per turn").
- **order**: (Optional) Numeric weight for placement.

### `addWhen(condition, name, fn, order?)`
Adds a conditional section that is only included in the final prompt if the `condition` function returns `true`.
- **condition**: A function returning a boolean.

### `build()`
Assembles all registered sections into a single string, sorted by their `order` weights.
- **Returns**: `Promise<string>`

### `reset()`
Clears the internal cache for static sections, forcing them to be recomputed on the next `build()` call.

## Cache Modes
The builder manages content based on three conceptual cache levels:

| Mode | When Computed | Typical Use Case |
| :--- | :--- | :--- |
| `session` | Once, cached until `reset()` | Identity, core rules, capability descriptions. |
| `turn` | Every `build()` call | Current time, short-term memory, environment state. |
| `never` | Every call | Highly volatile data or real-time sensor feeds. |

## Convenience Factories

### `defaultPromptBuilder(basePrompt)`
Creates a builder pre-loaded with standard YAAF sections:
- **Identity**: Uses the provided `basePrompt`.
- **Environment**: Injects CWD, platform, shell, and OS version.
- **Date**: Injects the current timestamp.

### `fromSections(entries)`
Creates a builder from an array of `[name, content]` pairs. All sections created this way are treated as static.

### Section Helpers
- `identitySection(prompt)`: Returns a static identity fragment.
- `rulesSection(rules)`: Formats an array of strings into a markdown list.
- `envSection(options)`: Generates environment metadata (CWD, OS, etc.).
- `dateSection()`: Generates a dynamic date/time fragment.

## Examples

### Basic Composition
```typescript
import { SystemPromptBuilder } from 'yaaf';

const builder = new SystemPromptBuilder()
  .addStatic('identity', () => 'You are a DevOps assistant.', 0)
  .addStatic('rules', () => `
## Rules
- Never delete production databases
- Always ask before modifying config files
`, 50)
  .addDynamic('timestamp', () => `Current time: ${new Date().toISOString()}`, 'time', 210);

const prompt = await builder.build();
```

### Conditional Sections
```typescript
builder.addWhen(
  () => process.env.DEBUG === '1',
  'debug-mode',
  () => '## Debug Mode\nEnable verbose reasoning and show internal state.',
);
```

### Integration with Agent
```typescript
const builder = new SystemPromptBuilder()
  .addStatic('identity', () => 'You are a coding assistant.')
  .addDynamic('memory', () => memoryStore.buildPrompt(), 'memory updates');

const agent = new Agent({
  systemPromptProvider: builder,
  tools: [...]
});
```

## See Also
- `Agent`: The primary consumer of `SystemPromptBuilder` via the `systemPromptProvider` option.
- `ContextEngine`: A higher-level manager that combines prompt building with token-budget management.
- `Soul`: A markdown-based personality definition that can be converted into prompt sections.