---
title: System Prompt Construction
entity_type: concept
summary: The pattern of assembling LLM system prompts using modular, cacheable sections to optimize performance and maintainability.
related_subsystems:
  - ContextEngine
  - SystemPromptBuilder
stub: false
compiled_at: 2026-04-16T14:10:59.385Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/prompts.md
confidence: 0.9
---

## What It Is
System Prompt Construction in YAAF is a modular architectural pattern for generating the instructions provided to a Large Language Model (LLM). Rather than treating the system prompt as a single, monolithic string, YAAF decomposes it into discrete, composable sections. This approach solves several challenges in production-grade agent development:

1.  **Maintainability**: Large prompts are broken into logical blocks (identity, rules, tools, memory) that can be managed independently.
2.  **Performance**: By identifying which parts of a prompt are static versus dynamic, the framework can optimize token usage and computation through caching.
3.  **Flexibility**: Agents can dynamically include or exclude prompt sections based on the current environment, debug state, or user context.

## How It Works in YAAF
The framework implements this concept through three primary layers: the `SystemPromptBuilder`, the `ContextEngine`, and the `Soul` abstraction.

### SystemPromptBuilder
The `SystemPromptBuilder` is the core utility for section-based assembly. It allows developers to register sections with specific priorities to control the final ordering of the prompt.

Sections are categorized by their **Cache Mode**:
*   **session**: Computed once and cached until the builder is explicitly reset. This is typically used for identity and core rules.
*   **turn**: Recomputed every time the `build()` method is called. This is used for data that changes within a conversation, such as short-term memory.
*   **never**: Recomputed on every call, reserved for highly volatile data.

### ContextEngine
The `ContextEngine` is a higher-level manager that orchestrates the `SystemPromptBuilder` alongside other agent components. It serves as the integration point for memory stores, skill definitions, and personality transforms. It provides a simplified API for adding sections and managing the overall token budget of the resulting prompt.

### Soul
The `Soul` is an opt-in abstraction (available via `yaaf/gateway`) that defines an agent's personality using a structured format, often authored in Markdown. A `Soul` can be converted into a `SoulTransform`, which the `ContextEngine` applies to the final prompt to inject consistent personality traits, roles, and behavioral constraints.

## Configuration

### Using SystemPromptBuilder
Developers can manually compose prompts by adding static, dynamic, or conditional sections.

```typescript
import { SystemPromptBuilder } from 'yaaf';

const builder = new SystemPromptBuilder()
  // Static section: priority 0
  .addStatic('identity', () => 'You are a DevOps assistant.', 0)
  
  // Conditional section: only added if DEBUG is enabled
  .addWhen(
    () => process.env.DEBUG === '1',
    'debug-mode',
    () => '## Debug Mode\nEnable verbose reasoning.',
  )

  // Dynamic section: priority 200, recomputed every turn
  .addDynamic('timestamp', () => `Current time: ${new Date().toISOString()}`, 'turn', 200);

const prompt = await builder.build();
```

### Using ContextEngine and Soul
The `ContextEngine` can consume a `Soul` definition to apply complex personality layers.

```typescript
import { ContextEngine } from 'yaaf';
import { Soul } from 'yaaf/gateway';

const soul = new Soul({
  name: 'Atlas',
  role: 'Senior DevOps Engineer',
  personality: 'Precise, thorough, slightly dry humor.',
  rules: ['Always explain the why, not just the how'],
});

const engine = new ContextEngine({
  basePrompt: 'Base instructions here.',
  maxTokens: 4096,
});

// Apply the Soul personality to the engine
engine.setSoul(soul.toTransform());

// Add standard sections
engine.addSection('rules', '## Rules\n- Be concise');

const finalPrompt = engine.build();
```

### Convenience Factories
YAAF provides factories to quickly generate standard prompt structures:

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