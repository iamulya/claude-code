---
summary: Sections of the system prompt that can be dynamically removed under token pressure to fit within the LLM's context window.
title: Droppable Context Sections
entity_type: concept
related_subsystems:
 - ContextEngine
search_terms:
 - dynamic prompt management
 - context window optimization
 - how to fit prompt in context
 - token budget
 - system prompt overflow
 - optional prompt sections
 - prompt truncation strategy
 - context length management
 - droppable prompt content
 - ContextEngine configuration
 - maxChars
 - priority-based context
 - graceful degradation of prompts
stub: false
compiled_at: 2026-04-24T17:54:33.267Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/contextEngine.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

Droppable Context Sections are a mechanism in YAAF for managing the size of an agent's [System Prompt](./system-prompt.md) to ensure it fits within the language model's [Context Window](./context-window.md). A context section is a distinct block of text, such as a tool definition, a personality trait, or a specific instruction, that is assembled into the final system prompt [Source 1]. By marking a section as "droppable," developers indicate that it is non-essential and can be omitted if the total prompt size exceeds a configured limit [Source 1].

This feature solves the problem of "prompt overflow," where a complex agent's system prompt, rich with many capabilities and instructions, becomes too large for the [LLM](./llm.md). Instead of arbitrary truncation or causing an error, the Droppable Context Sections pattern allows for a graceful, priority-based reduction of the prompt's size, preserving the most critical instructions while shedding less important ones.

## How It Works in YAAF

The mechanism is managed by the `ContextEngine` subsystem. The system prompt is composed of multiple `ContextSection` objects. Each section has several properties, but the key ones for this pattern are `droppable` and `priority` [Source 1].

- `droppable`: A boolean flag. If `true`, the section is a candidate for removal [when](../apis/when.md) the prompt is too long.
- `priority`: A number (default: 50) that determines the order of inclusion. Higher numbers mean higher priority, so they appear earlier in the prompt and are less likely to be dropped [Source 1].

A developer configures the `ContextEngine` with a `maxChars` value, which sets a maximum character budget for the entire system prompt. When assembling the final prompt, the `ContextEngine` calculates the total size. If this size exceeds `maxChars`, it begins to remove sections where `droppable` is `true`. The removal process starts with the section that has the lowest `priority` value and continues until the total character count is within the budget [Source 1].

The `basePrompt`, which contains the core task instructions, is never droppable and is always included [Source 1].

## Configuration

A developer enables this behavior by defining `ContextSection` objects with the `droppable` property set to `true` and by setting a `maxChars` limit in the `ContextEngineConfig`.

The following example demonstrates the configuration of two context sections, one of which is droppable.

```typescript
import { ContextSection, ContextEngineConfig } from 'yaaf';

// Define sections for the system prompt
const toolInstructions: ContextSection = {
  id: 'tools',
  name: 'Tool Instructions',
  content: 'You have access to the following tools...',
  priority: 100, // High priority, not droppable
  droppable: false,
};

const examples: ContextSection = {
  id: 'examples',
  name: 'Few-shot Examples',
  content: 'Here are some examples of good responses...',
  priority: 20, // Low priority
  droppable: true, // This section can be removed if needed
};

// Configure the ContextEngine
const config: ContextEngineConfig = {
  basePrompt: 'You are a helpful assistant.',
  /**
   * If the combined length of the base prompt, tool instructions,
   * and examples exceeds 4000 characters, the 'examples' section
   * will be dropped.
   */
  maxChars: 4000,
};

// The ContextEngine would then use this config and the sections
// to assemble the final system prompt.
```

In this configuration, if the total prompt size exceeds 4000 characters, the `Few-shot Examples` section will be omitted from the final prompt sent to the LLM because it is marked as `droppable` and has a lower priority than the `Tool Instructions` section [Source 1].

## Sources
[Source 1]: src/agents/contextEngine.ts