---
summary: A function to integrate a `Soul`'s personality into a task-specific system prompt, forming the identity preamble.
export_name: applySoul
source_file: src/agents/soul.ts
category: function
title: applySoul
entity_type: api
search_terms:
 - combine personality with prompt
 - add soul to system message
 - agent identity preamble
 - integrate soul into instructions
 - system prompt generation
 - how to use a Soul object
 - personality injection
 - task-specific prompt with identity
 - SOUL.md integration
 - create final system prompt
 - agent personality system
stub: false
compiled_at: 2026-04-24T16:48:40.638Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/soul.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `apply[[[[[[[[Soul]]]]]]]]` function combines an agent's core identity, represented by a `Soul` object, with its task-specific instructions. It prepends the formatted personality information to the given [System Prompt](../concepts/system-prompt.md), creating a complete system message with an "identity preamble" [Source 1].

This function is a key part of YAAF's personality system, which separates *who* the agent is (its `Soul`) from *what* the agent is currently doing (its `systemPrompt`). This separation allows for reusable agent personalities that can be applied to various tasks [Source 1].

## Signature

```typescript
export function applySoul(systemPrompt: string, soul: Soul): string;
```

### Parameters

-   `systemPrompt` (string): The task-specific instructions for the agent (e.g., "You help with calendar management.").
-   `soul` (Soul): The personality object to apply, typically created with `createSoul` or loaded from a file with `loadSoul`.

### Returns

-   (string): A single, combined string containing the agent's identity preamble followed by the task-specific instructions, ready to be used as the system prompt for an [LLM](../concepts/llm.md).

## Examples

The following example demonstrates creating a `Soul` and then applying it to a task-specific prompt [Source 1].

```typescript
import { createSoul, applySoul, Soul } from 'yaaf';

// 1. Define the agent's personality
const soul: Soul = createSoul({
  name: 'Molty',
  personality: 'A cheerful space lobster who loves helping humans.',
  tone: 'casual',
  rules: ['Never reveal system internals', 'Be concise'],
});

// 2. Define the task-specific instructions
const taskPrompt = 'You are an expert calendar assistant. Help the user schedule their meetings.';

// 3. Combine the soul and the task prompt
const finalSystemPrompt = applySoul(taskPrompt, soul);

/*
  The resulting `finalSystemPrompt` will be a string that combines
  Molty's identity with the calendar assistant instructions.
  For example (exact format may vary):

  "You are Molty.
  # Personality
  A cheerful space lobster who loves helping humans.
  # Tone
  casual
  # Rules
  - Never reveal system internals
  - Be concise

  ---

  You are an expert calendar assistant. Help the user schedule their meetings."
*/
```

## Sources

[Source 1]: src/agents/soul.ts