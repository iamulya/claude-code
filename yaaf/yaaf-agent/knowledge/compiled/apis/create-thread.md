---
summary: Initializes a new `AgentThread` with a starting user message and optional metadata.
export_name: createThread
source_file: src/agents/thread.ts
category: function
title: createThread
entity_type: api
search_terms:
 - start new agent conversation
 - initialize agent thread
 - new user message
 - agent conversation state
 - create AgentThread
 - begin agent execution
 - how to start an agent
 - thread factory
 - conversation starter
 - add metadata to thread
stub: false
compiled_at: 2026-04-25T00:06:02.201Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/thread.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `createThread` function is the standard entry point for initiating a new agent conversation. It constructs a new `AgentThread` object, which represents the complete, serializable state of an agent's execution flow [Source 1].

This function takes an initial user message as its primary argument, which becomes the first message in the thread's history. It also allows for attaching arbitrary, user-defined metadata to the thread for tracking application-specific information, such as user IDs or session identifiers [Source 1].

The `AgentThread` object returned by this function is designed to be passed to an [Agent](./agent.md)'s `step` or `run` method to begin processing [Source 1].

## Signature

```typescript
export function createThread(
  userMessage: string, 
  metadata?: Record<string, unknown>
): AgentThread;
```

### Parameters

| Name          | Type                        | Description                                                                                             |
|---------------|-----------------------------|---------------------------------------------------------------------------------------------------------|
| `userMessage` | `string`                    | The initial message from the user that starts the conversation. This is added as the first `user` role message in the thread's history. |
| `metadata`    | `Record<string, unknown>` (optional) | A key-value object for storing arbitrary application-specific data associated with the thread. |

### Returns

`AgentThread`: A new `AgentThread` object, ready for use with an [Agent](./agent.md). It includes a unique ID, timestamps, the initial user message, and any provided metadata [Source 1].

## Examples

### Basic Usage

Creating a new thread with only a user message.

```typescript
import { createThread } from 'yaaf';

const userQuery = "What's the weather like in San Francisco?";
const thread = createThread(userQuery);

console.log(thread.id);         // e.g., 'a1b2c3d4-...'
console.log(thread.step);       // 0
console.log(thread.messages);   // [{ role: 'user', content: "What's the weather..." }]
console.log(thread.done);       // false
```

### With Metadata

Creating a new thread and attaching application-specific metadata.

```typescript
import { createThread } from 'yaaf';

const userQuery = "Can you summarize my last meeting?";
const thread = createThread(userQuery, {
  userId: "user-12345",
  sessionId: "session-abcde",
  requestSource: "mobile-app"
});

console.log(thread.metadata);
// {
//   userId: "user-12345",
//   sessionId: "session-abcde",
//   requestSource: "mobile-app"
// }
```

## See Also

- [Agent](./agent.md): The primary class that consumes and processes `AgentThread` objects.
- `AgentThread`: The type definition for the serializable state of an agent conversation.
- `forkThread`: A function to create a new thread by branching an existing one.
- `serializeThread`: A function to convert a thread object into a JSON string for storage.
- `deserializeThread`: A function to safely parse a JSON string back into a thread object.

## Sources

[Source 1]: src/agents/thread.ts