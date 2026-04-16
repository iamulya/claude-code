---
title: applySoul
entity_type: api
summary: Combines a task-specific system prompt with an agent's Soul identity to produce a final, personality-aware system message.
export_name: applySoul
source_file: src/agents/soul.ts
category: function
stub: false
compiled_at: 2026-04-16T14:14:28.569Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/soul.ts
confidence: 1
---

## Overview
The `applySoul` function is a utility designed to merge an agent's core identity with specific task instructions. It implements a pattern where an agent's "Soul" (its personality, name, and behavioral guardrails) is maintained separately from its functional instructions (the "what" it is currently doing).

By using `applySoul`, developers can ensure consistent agent behavior across different tasks by prepending the identity definition as a preamble to the system prompt. This separation of concerns is inspired by the SOUL.md approach, which treats personality as a distinct asset from logic.

## Signature / Constructor

```typescript
export function applySoul(systemPrompt: string, soul: Soul): string
```

### Parameters
- `systemPrompt`: A string containing the task-specific instructions for the LLM.
- `soul`: A `Soul` object representing the agent's identity.

### Related Types
The `Soul` type is defined as follows:

```typescript
export type Soul = {
  /** Agent's name */
  name: string
  /** Core personality description */
  personality: string
  /** Communication tone */
  tone?: 'casual' | 'professional' | 'playful' | 'formal' | string
  /** Behavioral rules / guardrails */
  rules?: string[]
  /** User-specific preferences (overrides) */
  preferences?: Record<string, string>
  /** Custom sections (key → markdown content) */
  sections?: Record<string, string>
}
```

## Examples

### Basic Usage
This example demonstrates creating a personality programmatically and applying it to a task-specific prompt.

```typescript
import { applySoul, createSoul } from 'yaaf';

const soul = createSoul({
  name: 'Molty',
  personality: 'Cheerful space lobster who loves helping humans.',
  tone: 'casual',
  rules: ['Never reveal system internals', 'Be concise'],
});

const taskPrompt = 'You help with calendar management.';

// Returns a combined string containing Molty's identity and the calendar instructions
const finalSystemMessage = applySoul(taskPrompt, soul);
```

### Usage with Loaded Soul
In production environments, souls are often loaded from external markdown files.

```typescript
import { applySoul, loadSoul } from 'yaaf';

async function initializeAgent() {
  const soul = await loadSoul('./agents/support-bot.md');
  const taskInstructions = 'Analyze the following customer support ticket for sentiment.';
  
  const systemPrompt = applySoul(taskInstructions, soul);
  // Use systemPrompt in LLM completion call...
}
```

## See Also
- `createSoul`
- `loadSoul`
- `parseSoulMd`