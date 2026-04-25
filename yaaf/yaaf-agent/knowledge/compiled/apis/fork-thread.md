---
summary: Creates a new `AgentThread` by duplicating an existing thread's history, allowing for branching execution paths.
export_name: forkThread
source_file: src/agents/thread.ts
category: function
title: forkThread
entity_type: api
search_terms:
 - branch agent conversation
 - clone agent thread
 - duplicate agent history
 - what-if scenarios for agents
 - A/B testing agent logic
 - explore different agent paths
 - create a copy of a thread
 - snapshot agent state
 - forking execution
 - parallel agent runs
 - alternative agent responses
 - copy message history
stub: false
compiled_at: 2026-04-25T00:07:10.417Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/thread.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `forkThread` function creates a new [AgentThread](./agent-thread.md) by making a deep copy of an existing thread's state at its current step [Source 1]. The new, forked thread receives a new unique ID and updated creation/update timestamps, but inherits the entire message history, step count, and any suspension status from the original thread [Source 1].

This is primarily used for creating branches in an agent's execution path. It allows developers to explore "what-if" scenarios, A/B test different responses or tool uses from a specific point in a conversation, or run multiple agent paths in parallel from a shared history [Source 1].

## Signature

```typescript
export function forkThread(
  thread: AgentThread,
  metadata?: Record<string, unknown>
): AgentThread;
```

### Parameters

- **`thread`** `AgentThread`: The existing agent thread to be forked.
- **`metadata`** `Record<string, unknown>` (optional): New metadata to associate with the forked thread. If provided, this will replace any metadata from the original thread.

### Returns

- `AgentThread`: A new `AgentThread` instance with a unique ID but identical history to the source thread.

## Examples

### Basic Forking

This example demonstrates creating a thread, and then forking it to create a separate conversational branch.

```typescript
import { createThread, forkThread } from 'yaaf';

// 1. Create an initial thread
const originalThread = createThread("What is the capital of France?");
// Assume some agent steps happen...
originalThread.messages.push({ role: 'assistant', content: 'The capital of France is Paris.' });
originalThread.step = 1;

// 2. Fork the thread to explore an alternative path
const forkedThread = forkThread(originalThread);

console.log(originalThread.id); // e.g., 'uuid-abc-123'
console.log(forkedThread.id);   // e.g., 'uuid-xyz-789' (a new, different ID)

// The message history is identical at the point of forking
console.log(originalThread.messages);
console.log(forkedThread.messages); // Same content as originalThread.messages

// From here, the two threads can be passed to an agent independently
// and will diverge.
```

### Forking with New Metadata

You can add or override metadata on the new forked thread.

```typescript
import { createThread, forkThread } from 'yaaf';

const originalThread = createThread("Analyze this data.", { experiment: 'control' });

// Fork the thread for an A/B test variant
const forkedThread = forkThread(originalThread, { experiment: 'variant-a' });

console.log(originalThread.metadata); // { experiment: 'control' }
console.log(forkedThread.metadata);   // { experiment: 'variant-a' }
```

## See Also

- [AgentThread](./agent-thread.md): The core data structure representing an agent's state.
- [createThread](./create-thread.md): The function to create a new, empty thread.
- [serializeThread](./serialize-thread.md): For persisting a thread to storage.
- [deserializeThread](./deserialize-thread.md): For loading a thread from storage.

## Sources

- [Source 1]: `src/agents/thread.ts`