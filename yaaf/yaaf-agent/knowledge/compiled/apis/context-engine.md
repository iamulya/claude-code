---
title: ContextEngine
entity_type: api
summary: A high-level manager for constructing the final LLM context, integrating a base prompt, sections, memory, and an optional SoulTransform.
export_name: ContextEngine
source_file: src/agents/contextEngine.ts
category: class
search_terms:
 - system prompt builder
 - manage LLM context
 - construct agent prompt
 - agent personality
 - SoulTransform
 - dynamic prompt sections
 - token budget management
 - droppable prompt sections
 - how to add memory to prompt
 - combine prompt parts
 - base prompt
 - context management
 - prompt engineering framework
stub: false
compiled_at: 2026-04-24T16:57:54.229Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/prompts.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/contextEngine.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `ContextEngine` is a high-level class responsible for assembling the final [System Prompt](../concepts/system-prompt.md) sent to a Large Language Model ([LLM](../concepts/llm.md)). It integrates a static base prompt with multiple dynamic sections, [Memory](../concepts/memory.md), and an optional personality transformation (`[[[[[[[[Soul]]]]]]]]Transform`) to create a complete context [Source 1].

It serves as a more comprehensive alternative to the lower-level `SystemPromptBuilder`, providing a structured way to manage different components of an agent's instructions and background information. A key feature is its ability to manage a character budget (`maxChars`). [when](./when.md) the constructed prompt exceeds this budget, the engine will strategically remove "droppable" sections, starting with the lowest priority, to ensure the prompt fits within the model's [Context Window](../concepts/context-window.md) [Source 2].

This class is central to defining an agent's identity, rules, and immediate context before it processes a user request.

## Signature / Constructor

The `ContextEngine` is instantiated with a configuration object that defines its core behavior.

```typescript
// Source: src/agents/contextEngine.ts [Source 2]

export class ContextEngine {
  constructor(config: ContextEngineConfig);
  // ... methods
}
```

### Configuration

The constructor accepts a `ContextEngineConfig` object:

```typescript
// Source: src/agents/contextEngine.ts [Source 2]

export type ContextEngineConfig = {
  /** Base task instructions (always included) */
  basePrompt: string;
  /**
   * Maximum total character budget for the system prompt.
   * If set, droppable sections are removed lowest-priority-first to fit.
   */
  maxChars?: number;
};
```

### Related Types

The `ContextEngine` relies on the following associated types for its operation:

```typescript
// Source: src/agents/contextEngine.ts [Source 2]

/**
 * A function that prepends personality/identity to a system prompt.
 */
export type SoulTransform = (basePrompt: string) => string;

export type ContextSection = {
  /** Unique identifier for this section */
  id: string;
  /** Display name */
  name: string;
  /** Content to inject */
  content: string;
  /** Priority (higher = earlier in prompt). Default: 50 */
  priority?: number;
  /** Whether this section can be omitted under token pressure */
  droppable?: boolean;
};
```

## Methods & Properties

The public methods of `ContextEngine` are used to add content and build the final prompt. The following methods are demonstrated in the source material [Source 1].

### addSection()

Adds a content section to the prompt.

**Signature:** `addSection(name: string, content: string): void`

### addMemory()

Adds a memory section to the prompt.

**Signature:** `addMemory(content: string): void`

### setSoul()

Applies a `SoulTransform` function, which prepends personality and identity information to the final prompt. This is often used with the `Soul` module from the `yaaf/gateway` package [Source 1].

**Signature:** `setSoul(transform: SoulTransform): void`

### build()

Assembles all the components—base prompt, sections, memory, and Soul—into a single string. It also handles the logic for dropping sections if `maxChars` is exceeded.

**Signature:** `build(): string`

## Examples

The following example demonstrates creating a `ContextEngine`, adding rules and memory, applying a personality via `SoulTransform`, and building the final prompt string [Source 1].

```typescript
import { ContextEngine, type SoulTransform } from 'yaaf';

// 1. Initialize the engine with a base prompt and token limit
const engine = new ContextEngine({
  basePrompt: 'You are a helpful assistant.',
  maxChars: 4096,
});

// 2. Add static sections like rules
engine.addSection('rules', '## Rules\n- Be concise\n- Be helpful');

// 3. Add dynamic content like memory
engine.addMemory('Last session: discussed quantum computing.');

// 4. (Optional) Apply a SoulTransform for personality
const soulTransform: SoulTransform = (prompt) => {
  return `## Personality\nYou are warm and friendly.\n\n${prompt}`;
};
engine.setSoul(soulTransform);

// 5. Build the final prompt for the LLM
const prompt = engine.build();

console.log(prompt);
/*
Outputs something similar to:
## Personality
You are warm and friendly.

You are a helpful assistant.
## Rules
- Be concise
- Be helpful
Last session: discussed quantum computing.
*/
```

## See Also

*   **SystemPromptBuilder**: A lower-level, section-based utility for prompt assembly that `ContextEngine` builds upon [Source 1].
*   **Soul**: An opt-in module from `yaaf/gateway` for defining agent personalities in Markdown, which can be converted into a `SoulTransform` for use with `ContextEngine` [Source 1].

## Sources

*   [Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/prompts.md
*   [Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/contextEngine.ts