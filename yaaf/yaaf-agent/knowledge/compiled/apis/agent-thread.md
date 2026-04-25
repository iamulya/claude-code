---
summary: Represents the complete, serializable, step-by-step execution state of an LLM agent, enabling persistence and resumption.
export_name: AgentThread
source_file: src/agents/thread.ts
category: type
title: AgentThread
entity_type: api
search_terms:
 - agent state management
 - how to save agent progress
 - persistent agent conversations
 - resuming agent execution
 - agent conversation history
 - stateless agent reducer pattern
 - serializable agent state
 - forking agent conversations
 - agent thread persistence
 - what is an agent thread
 - step-by-step agent execution
 - agent suspension and resumption
 - thread serialization
stub: false
compiled_at: 2026-04-25T00:04:22.462Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/thread.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `AgentThread` type defines the complete, serializable state for a single agent conversation. It is a plain JavaScript object that captures everything needed to pause, persist, and resume an agent's execution at any point [Source 1].

This structure is central to the "stateless reducer" pattern in YAAF, where an [Agent](./agent.md)'s `step` method takes a thread and returns a new, updated thread: `agent.step(thread) → { thread: newThread, ... }`. This design allows agent execution to be stateless, as all necessary state is contained within the `AgentThread` object itself [Source 1].

Because threads are simple JSON-serializable objects, they can be stored in any persistence layer (e.g., databases, file systems, key-value stores) and resumed in different processes, servers, or serverless functions. This enables robust, scalable, and debuggable agent systems. A thread can be replayed for debugging, or forked to explore alternative execution paths [Source 1].

## Signature

`AgentThread` is a TypeScript type alias. Its definition and related types are as follows [Source 1].

```typescript
export type AgentThread = {
  /** Unique thread identifier */
  id: string;
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last update */
  updatedAt: string;
  /** Step counter (increments with each agent.step() call) */
  step: number;
  /** Full conversation history — the source of truth */
  messages: ChatMessage[];
  /** Whether the thread has reached a terminal state */
  done: boolean;
  /** Final response content (set when done === true) */
  finalResponse?: string;
  /** Suspension details (set when the thread is suspended) */
  suspended?: SuspendReason;
  /** Optional metadata (user-defined) */
  metadata?: Record<string, unknown>;
};
```

### Related Types

The `AgentThread` type relies on several other types to represent its full state, particularly when execution is suspended [Source 1].

```typescript
/**
 * The reason an agent suspended mid-execution.
 */
export type SuspendReason =
  | {
      type: "awaiting_approval";
      /** The tool call the LLM requested that requires approval */
      pendingToolCall: ToolCall;
      /** Parsed arguments */
      args: Record<string, unknown>;
      /** Human-readable reason (from the tool's requiresApproval setting) */
      message: string;
    };

/**
 * Result of resolving a suspension.
 * Pass this to `agent.resume(thread, resolution)`.
 */
export type SuspendResolution =
  | { type: "approved"; result?: string };

/**
 * The result of a single agent.step() call.
 */
export type StepResult = {
  /** The updated thread after this step */
  thread: AgentThread;
  /** Whether the agent is done (final response produced) */
  done: boolean;
  /** Final response text (only when done === true) */
  response?: string;
  /** Set if the agent suspended and needs external input to continue */
  suspended?: SuspendReason;
};
```

## Properties

| Property        | Type                               | Description                                                                                             |
| --------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `id`            | `string`                           | A unique identifier for the thread, typically a UUID [Source 1].                                        |
| `createdAt`     | `string`                           | An ISO 8601 timestamp string indicating when the thread was created [Source 1].                         |
| `updatedAt`     | `string`                           | An ISO 8601 timestamp string indicating the last time the thread was modified [Source 1].               |
| `step`          | `number`                           | A counter that increments with each call to the agent's `step` method [Source 1].                       |
| `messages`      | `[[ChatMessage]][]`                | The complete history of messages in the conversation, which serves as the source of truth [Source 1].   |
| `done`          | `boolean`                          | A flag indicating whether the agent has reached a terminal state and produced a final response [Source 1]. |
| `finalResponse` | `string` (optional)                | The final output from the agent. This is set only when `done` is `true` [Source 1].                     |
| `suspended`     | `SuspendReason` (optional)         | If the agent's execution is paused (e.g., awaiting tool approval), this object contains the details [Source 1]. |
| `metadata`      | `Record<string, unknown>` (optional) | An open-ended object for storing user-defined metadata associated with the thread [Source 1].           |

## Examples

### Example 1: A Thread Suspended for Approval

This example shows an `AgentThread` where the agent has paused execution because it needs approval to run a tool. The `suspended` property contains the necessary context to resume.

```json
{
  "id": "thread_abc123",
  "createdAt": "2023-10-27T10:00:00.000Z",
  "updatedAt": "2023-10-27T10:05:30.000Z",
  "step": 3,
  "messages": [
    { "role": "user", "content": "What's the weather in SF?" },
    {
      "role": "assistant",
      "content": null,
      "tool_calls": [
        {
          "id": "call_xyz789",
          "type": "function",
          "function": {
            "name": "get_weather",
            "arguments": "{\"city\": \"San Francisco\"}"
          }
        }
      ]
    }
  ],
  "done": false,
  "suspended": {
    "type": "awaiting_approval",
    "pendingToolCall": {
      "id": "call_xyz789",
      "type": "function",
      "function": {
        "name": "get_weather",
        "arguments": "{\"city\": \"San Francisco\"}"
      }
    },
    "args": { "city": "San Francisco" },
    "message": "This tool requires user approval before execution."
  },
  "metadata": {
    "userId": "user-42"
  }
}
```

### Example 2: A Completed Thread

This example shows an `AgentThread` after the agent has successfully completed its task. The `done` flag is `true` and `finalResponse` contains the result.

```json
{
  "id": "thread_def456",
  "createdAt": "2023-10-27T11:00:00.000Z",
  "updatedAt": "2023-10-27T11:02:15.000Z",
  "step": 5,
  "messages": [
    { "role": "user", "content": "What's the weather in SF?" },
    {
      "role": "assistant",
      "content": null,
      "tool_calls": [
        {
          "id": "call_uvw456",
          "type": "function",
          "function": {
            "name": "get_weather",
            "arguments": "{\"city\": \"San Francisco\"}"
          }
        }
      ]
    },
    {
      "role": "tool",
      "tool_call_id": "call_uvw456",
      "content": "{\"temperature\": 65, \"condition\": \"Sunny\"}"
    },
    {
      "role": "assistant",
      "content": "The weather in San Francisco is 65°F and sunny."
    }
  ],
  "done": true,
  "finalResponse": "The weather in San Francisco is 65°F and sunny.",
  "metadata": {
    "userId": "user-42"
  }
}
```

## See Also

- [Agent](./agent.md): The primary class that consumes and produces `AgentThread` objects via its `step` and `resume` methods.
- [ChatMessage](./chat-message.md): The type used for messages within the `messages` array of a thread.
- [Tool Calls](../concepts/tool-calls.md): The concept of tool usage, which can lead to a thread being suspended.
- `createThread()`: A factory function to initialize a new `AgentThread`.
- `forkThread()`: A function to create a new thread by branching an existing one.
- `serializeThread()` / `deserializeThread()`: Functions for safely storing and retrieving threads as JSON strings, with optional HMAC integrity checking [Source 1].

## Sources

- [Source 1]: `src/agents/thread.ts`