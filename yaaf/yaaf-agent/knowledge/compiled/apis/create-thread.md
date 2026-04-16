---
summary: Factory function to initialize a new AgentThread with a user message.
export_name: createThread
source_file: src/thread.ts
category: function
title: createThread
entity_type: api
stub: false
compiled_at: 2026-04-16T14:08:11.319Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/human-in-the-loop.md
confidence: 0.98
---

## Overview
`createThread` is a factory function used to initialize a new `AgentThread` object. In the YAAF architecture, a thread serves as the single source of truth for an agent's state, capturing the complete conversation history and execution status. 

This function is typically the entry point for starting a new interaction with an agent. The resulting thread object is a plain JSON structure that can be passed to agent execution methods like `agent.step()` or `agent.runThread()`.

## Signature / Constructor

```typescript
function createThread(
  message: string, 
  metadata?: Record<string, unknown>
): AgentThread;
```

### Parameters
*   **message**: The initial prompt or instruction from the user that starts the conversation.
*   **metadata**: (Optional) An object containing arbitrary key-value pairs to be stored with the thread.

### Return Type
The function returns an `AgentThread` object with the following structure:

| Property | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | A unique identifier for the thread. |
| `createdAt` | `string` | ISO timestamp of creation. |
| `updatedAt` | `string` | ISO timestamp of the last update. |
| `step` | `number` | The current execution turn (starts at 0). |
| `messages` | `ChatMessage[]` | The conversation history, initialized with the user message. |
| `done` | `boolean` | Indicates if the agent has reached a final response. |
| `finalResponse` | `string` (optional) | The final text output from the agent. |
| `suspended` | `SuspendReason` (optional) | Details if the agent is waiting for human input or async results. |
| `metadata` | `Record<string, unknown>` (optional) | User-defined metadata. |

## Examples

### Basic Initialization
Creating a thread and passing it to an agent for immediate execution.

```typescript
import { createThread, agent } from 'yaaf';

// Initialize the thread
const thread = createThread('Summarize the latest financial report');

// Execute the thread to completion
const { response } = await agent.runThread(thread);
console.log(response);
```

### Initialization with Metadata
Attaching context-specific data to a thread for later retrieval or filtering.

```typescript
import { createThread } from 'yaaf';

const thread = createThread('Deploy version 1.2.3', {
  userId: 'user_882',
  environment: 'production',
  priority: 'high'
});

console.log(thread.metadata.environment); // 'production'
```

### Manual Step Loop
Using `createThread` in a manual execution loop to handle intermediate states.

```typescript
import { createThread, agent } from 'yaaf';

let thread = createThread('Analyze this dataset');
let result = await agent.step(thread);

while (!result.done && !result.suspended) {
  result = await agent.step(result.thread);
}

if (result.done) {
  console.log('Result:', result.thread.finalResponse);
}
```

## See Also
* `forkThread`: Clone an existing thread to create a new execution branch.
* `serializeThread`: Convert a thread to a JSON string for persistence.
* `deserializeThread`: Restore a thread object from a JSON string.