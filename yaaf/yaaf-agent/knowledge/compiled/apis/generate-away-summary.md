---
title: generateAwaySummary
entity_type: api
summary: Generates a short, 1-3 sentence recap of session activity to re-orient users when they resume an interaction.
export_name: generateAwaySummary
source_file: src/utils/awaySummary.ts
category: function
stub: false
compiled_at: 2026-04-16T14:39:01.323Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/utils/awaySummary.ts
confidence: 0.95
---

## Overview
`generateAwaySummary` is a utility function designed to facilitate the "while you were away" experience in LLM-powered applications. It analyzes a session's message history to produce a concise, 1-3 sentence recap. This summary focuses on the high-level task currently in progress and the concrete next step, helping users re-orient themselves when resuming a session after an absence.

The function is typically used with smaller, faster models to ensure the recap is generated quickly upon user return.

## Signature / Constructor

```typescript
export async function generateAwaySummary(
  config: AwaySummaryConfig,
): Promise<string | null>
```

### AwaySummaryConfig
The configuration object for the summary generation:

| Property | Type | Description |
| :--- | :--- | :--- |
| `messages` | `ReadonlyArray<{ role: string; content: string }>` | The session messages to be summarized. |
| `model` | `ChatModel` | The LLM provider/model used to generate the summary. |
| `signal` | `AbortSignal` | (Optional) An abort signal to cancel the request. |
| `recentMessageWindow` | `number` | (Optional) The maximum number of recent messages to include in the context. Defaults to 30. |
| `sessionMemory` | `string` | (Optional) Additional session memory to provide broader context for the summary. |

## Examples

### Basic Usage
This example demonstrates how to generate a recap when a user resumes a session.

```typescript
import { generateAwaySummary } from 'yaaf';

// On session resume:
const recap = await generateAwaySummary({
  messages: session.messages,
  model: smallModel,
});

if (recap) {
  console.log(`Welcome back! ${recap}`);
}
```

### Usage with Context Window and Memory
Providing a specific message window and session memory to refine the summary.

```typescript
const recap = await generateAwaySummary({
  messages: session.messages,
  model: fastModel,
  recentMessageWindow: 15,
  sessionMemory: "User is currently researching TypeScript frameworks."
});
```

## See Also
* `ChatModel` (The model interface used by this utility)