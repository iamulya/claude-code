---
title: Away Summary
entity_type: concept
summary: A user experience pattern that provides a concise recap of agent progress and state when a user returns to a session after an absence.
related_subsystems:
  - Agents
  - Session Management
stub: false
compiled_at: 2026-04-16T14:39:05.118Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/utils/awaySummary.ts
confidence: 0.9
---

## What It Is
The **Away Summary** is a user experience pattern designed to facilitate session resumption in LLM-powered applications. It provides a "while you were away" recap that summarizes the agent's progress and current state. The primary goal of this concept is to reduce cognitive load for users returning to a long-running or complex session by providing a 1–3 sentence summary focusing on the high-level task completed and the concrete next step required.

## How It Works in YAAF
In YAAF, the Away Summary is implemented as a utility function that processes session history to generate a brief narrative. The framework utilizes a language model—typically a smaller, faster model to minimize latency—to analyze the most recent interactions and synthesize the current status.

The core logic is encapsulated in the `generateAwaySummary` function. This function accepts a configuration object containing the message history and returns a string containing the recap. If the session transcript is empty, the process is aborted, or an error occurs, the function returns `null`.

The mechanism typically considers a specific window of recent messages (defaulting to 30) to ensure the summary remains relevant to the most recent context rather than summarizing the entire historical log.

## Configuration
Developers configure the Away Summary through the `AwaySummaryConfig` interface. This allows for tuning the context window, providing additional session memory, and specifying the model used for the summarization task.

### AwaySummaryConfig Properties
| Property | Type | Description |
| :--- | :--- | :--- |
| `messages` | `ReadonlyArray` | The list of session messages (role and content) to be summarized. |
| `model` | `ChatModel` | The LLM provider used to generate the summary. |
| `signal` | `AbortSignal` | Optional signal to cancel the generation process. |
| `recentMessageWindow` | `number` | The maximum number of recent messages to include in the context (Default: 30). |
| `sessionMemory` | `string` | Optional broader context or long-term memory to inform the summary. |

### Implementation Example
```typescript
import { generateAwaySummary } from './utils/awaySummary.js';

// On session resume:
const recap = await generateAwaySummary({
  messages: session.messages,
  model: smallModel,
  recentMessageWindow: 20,
  sessionMemory: "User is working on a TypeScript migration project."
});

if (recap) {
  console.log(`Welcome back! ${recap}`);
}
```

## Sources
- `src/utils/awaySummary.ts`