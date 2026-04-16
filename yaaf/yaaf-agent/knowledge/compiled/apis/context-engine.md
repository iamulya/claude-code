---
title: ContextEngine
entity_type: api
summary: A high-level prompt manager that orchestrates SystemPromptBuilder, memory stores, and personality transforms.
export_name: ContextEngine
source_file: src/context-engine.ts
category: class
stub: false
compiled_at: 2026-04-16T14:10:54.218Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/prompts.md
confidence: 0.95
---

## Overview
The `ContextEngine` is a high-level orchestrator for managing LLM system prompts. It serves as an abstraction layer over the `SystemPromptBuilder`, providing a simplified interface for integrating memory, static prompt sections, and personality transforms (referred to as "Souls"). 

It is typically used to maintain the agent's identity and operational constraints while dynamically injecting session-specific context or memory.

## Signature / Constructor

```typescript
class ContextEngine {
  constructor(config: ContextEngineOptions);
}

interface ContextEngineOptions {
  /** The primary identity or instruction for the agent */
  basePrompt: string;
  /** Optional token limit for the generated prompt */
  maxTokens?: number;
}
```

## Methods & Properties

### addSection
`addSection(name: string, content: string): void`  
Adds a named section to the prompt. This is useful for defining specific blocks of instructions such as rules, formatting requirements, or tool definitions.

### addMemory
`addMemory(content: string): void`  
Appends memory context to the engine. This content is typically used to provide the agent with information from previous turns or external data stores.

### setSoul
`setSoul(transform: SoulTransform): void`  
Applies a personality transform to the prompt. A `SoulTransform` is a function that takes the assembled prompt string and returns a modified version, often wrapping it in specific persona-driven formatting or tone instructions.

### build
`build(): string`  
Assembles all registered sections, memories, and the base prompt into a single string. If a Soul transform is set, it is applied as the final step of the assembly process.

## Examples

### Basic Usage
This example demonstrates initializing the engine with a base prompt and adding a rules section.

```typescript
import { ContextEngine } from 'yaaf';

const engine = new ContextEngine({
  basePrompt: 'You are a helpful assistant.',
  maxTokens: 4096,
});

// Add sections
engine.addSection('rules', '## Rules\n- Be concise\n- Be helpful');

// Add memory
engine.addMemory('Last session: discussed quantum computing.');

// Build the final prompt
const prompt = engine.build();
```

### Integrating with a Soul Transform
The `ContextEngine` can accept a transform function to modify the final output, often used to inject personality.

```typescript
import { ContextEngine, type SoulTransform } from 'yaaf';

const engine = new ContextEngine({
  basePrompt: 'You are a helpful assistant.',
});

const soulTransform: SoulTransform = (prompt) => {
  return `## Personality\nYou are warm and friendly.\n\n${prompt}`;
};

engine.setSoul(soulTransform);

const prompt = engine.build();
```

## See Also
- `SystemPromptBuilder`: The underlying low-level builder used for section-based prompt assembly.
- `Soul`: A specialized class for defining agent personalities via Markdown.