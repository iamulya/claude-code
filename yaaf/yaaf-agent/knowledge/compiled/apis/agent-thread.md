---
summary: A plain JSON object representing the complete state of an agent conversation, including message history and suspension status.
export_name: AgentThread
source_file: src/types.ts
category: type
title: AgentThread
entity_type: api
stub: false
compiled_at: 2026-04-16T14:08:02.070Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/human-in-the-loop.md
confidence: 0.98
---

## Overview
`AgentThread` is the core state container in YAAF, representing the complete history and execution status of an agent conversation. It implements the "stateless reducer" pattern, serving as the single source of truth for an agent's progress. Because it is a plain JSON object, it contains no internal execution state or active handles, allowing it to be serialized, stored in external databases (such as Redis or DynamoDB), and resumed across different processes or serverless function invocations.

## Signature / Constructor
`AgentThread` is defined as a TypeScript type. It is typically initialized using the `createThread` factory function.

```typescript
type AgentThread = {
  id: string;               // Unique thread ID
  createdAt: string;        // ISO timestamp
  updatedAt: string;        // ISO timestamp
  step: number;             // Increments with each agent.step() call
  messages: ChatMessage[];  // Full conversation history — the source of truth
  done: boolean;            // True when final response is ready
  finalResponse?: string;   // Set when done === true
  suspended?: SuspendReason; // Set when agent needs external input
  metadata?: Record<string, unknown>;
};
```

## Methods & Properties
As a plain object type, `AgentThread` does not have internal methods. Its state is manipulated by the following API functions:

| Property | Description |
| :--- | :--- |
| `id` | A unique identifier for the conversation. |
| `createdAt` | The ISO 8601 timestamp of when the thread was initialized. |
| `updatedAt` | The ISO 8601 timestamp of the last time the thread was modified by a step. |
| `step` | A counter indicating how many turns the agent has taken. |
| `messages` | An array of chat messages representing the full context provided to the LLM. |
| `done` | A boolean flag indicating if the agent has reached a terminal state. |
| `finalResponse` | The final text output from the agent, populated only when `done` is true. |
| `suspended` | An object containing details if the agent is waiting for human approval, human input, or an asynchronous result. |
| `metadata` | An optional key-value store for application-specific data. |

## Examples

### Creating and Stepping a Thread
This example demonstrates the basic lifecycle of a thread from creation through a single execution step.

```typescript
import { createThread, serializeThread, deserializeThread } from 'yaaf'

// 1. Create a new thread
const thread = createThread('Deploy v1.2.3 to production')

// 2. Execute one turn
const { thread: updated, done, suspended } = await agent.step(thread)

// 3. Serialize for persistence
const json = serializeThread(updated)

// 4. Restore later in a different process
const restored = deserializeThread(json)
```

### Manual Step Loop
Threads are designed to be used in loops where the application controls the transition between steps.

```typescript
import { createThread } from 'yaaf'

let thread = createThread('Summarise the Q4 report')
let { thread: t } = await agent.step(thread)

while (!t.done && !t.suspended) {
  const result = await agent.step(t)
  t = result.thread
}

if (t.done) {
  console.log(t.finalResponse)
}
```

### Forking a Thread
Threads can be branched to test different scenarios without modifying the original state.

```typescript
import { createThread, forkThread } from 'yaaf'

const original = createThread('Review and deploy PR #42')
const { thread: atStep3 } = await agent.step(original)

// Create two independent paths from the same point
const branchA = forkThread(atStep3, { scenario: 'approve' })
const branchB = forkThread(atStep3, { scenario: 'reject' })
```

## See Also
- `createThread`: Factory function for initializing new threads.
- `serializeThread`: Utility for converting threads to JSON strings.
- `deserializeThread`: Utility for restoring threads from JSON strings.
- `forkThread`: Utility for branching existing threads.