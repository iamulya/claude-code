---
summary: A functional programming pattern applied to agents, where state transitions are handled by pure functions operating on immutable thread objects.
title: Stateless Reducer Pattern
entity_type: concept
related_subsystems:
 - agents
see_also:
 - "[Agent Turn](./agent-turn.md)"
 - "[Central State Management](./central-state-management.md)"
 - "[Session Persistence](./session-persistence.md)"
search_terms:
 - functional agent state
 - pure function agent
 - immutable agent state
 - how to persist agent conversations
 - resuming agent execution
 - "12 Factor Agents"
 - agent state management
 - serializable agent state
 - what is AgentThread
 - agent.step function
 - forking agent conversations
 - replayable agent execution
stub: false
compiled_at: 2026-04-25T00:24:48.964Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/thread.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

The Stateless Reducer Pattern is a functional programming approach to managing an agent's execution state in YAAF. It treats an agent's lifecycle as a series of state transitions, where each transition is performed by a pure function. This function, typically `agent.step()`, takes the current state as an input and returns a completely new state object, rather than modifying the original.

This pattern is inspired by "12 Factor Agents (Factor 12)" [Source 1]. It solves several key problems in building robust agentic systems:
- **Scalability:** By externalizing state into a self-contained, serializable object, the agent logic itself becomes stateless. This allows agent execution to be distributed across multiple processes, servers, or serverless functions without requiring sticky sessions.
- **Testability & Predictability:** Since the state transition is a pure function, given the same input state, it will always produce the same output state. This makes agent behavior easier to test, debug, and reason about.
- **Resilience:** The complete state can be persisted at any step. If a process fails, execution can be resumed from the last saved state on a different machine.
- **Advanced Features:** It enables capabilities like replaying an agent's entire execution history for debugging, or forking a conversation at any point to explore alternative paths ("what if?" scenarios) [Source 1].

## How It Works in YAAF

In YAAF, the Stateless Reducer Pattern is implemented through the `AgentThread` object and the `agent.step()` method.

The `AgentThread` is a serializable JSON object that encapsulates the entire state of an agent conversation. It contains everything needed to resume execution from any point [Source 1]. Its key fields include:
- `id`: A unique identifier for the thread.
- `messages`: The full, ordered history of the conversation.
- `step`: A counter for the number of turns taken.
- `done`: A boolean flag indicating if the agent has reached a terminal state.
- `suspended`: An object describing why an agent has paused, such as awaiting tool approval.
- `metadata`: User-defined data associated with the thread.

The core of the pattern is the agent's step function, which has the signature:
`agent.step(thread) → { thread: newThread, done: boolean, suspended?: SuspendReason }` [Source 1].

In this flow:
1. An external runner or process calls `agent.step()`, passing the current `AgentThread`.
2. The agent performs one turn of logic (e.g., an [LLM Call](./llm-call.md), [Tool Use](./tool-use.md)).
3. It constructs and returns a `StepResult` containing a *new* `AgentThread` object representing the updated state. The original `thread` object is not mutated.

To support persistence and distribution, YAAF provides helper functions for handling `AgentThread` objects:
- `createThread()`: Initializes a new thread.
- `forkThread()`: Creates a new thread by copying an existing one, allowing for conversational branching [Source 1].
- `serializeThread()`: Converts an `AgentThread` object into a JSON string for storage. It can optionally add an HMAC-SHA256 signature for integrity verification [Source 1].
- `deserializeThread()`: Parses a JSON string back into an `AgentThread` object. This function includes security measures such as a 50MB size limit to prevent denial-of-service attacks, stripping of `system` role messages to prevent prompt injection from tampered state, and optional HMAC signature verification [Source 1].

## Configuration

While the pattern itself is a core architectural principle, its security features are configurable. When serializing and deserializing threads for storage or transport, a developer can provide a secret key to enable HMAC-based integrity checks. This ensures that a persisted thread has not been tampered with before it is used to resume agent execution.

```typescript
import {
  createThread,
  serializeThread,
  deserializeThread,
} from "yaaf-agent";

// A secret key should be securely managed, e.g., via environment variables.
const HMAC_SECRET = process.env.THREAD_HMAC_SECRET;

// 1. Create a new thread
let thread = createThread("What is the weather in San Francisco?");

// ... agent execution happens, thread is updated ...
// let result = await agent.step(thread);
// thread = result.thread;

// 2. Serialize the thread for storage with an integrity signature
const serializedData = serializeThread(thread, HMAC_SECRET);
console.log("Serialized thread:", serializedData);

// 3. Later, deserialize the thread from storage
try {
  const deserializedThread = deserializeThread(serializedData, HMAC_SECRET);
  console.log("Successfully deserialized and verified thread.");

  // The agent can now safely resume execution with this thread.
  // await agent.resume(deserializedThread, ...);

} catch (error) {
  console.error("Failed to deserialize thread. It may be tampered.", error);
}
```

## See Also

- [Agent Turn](./agent-turn.md): The Stateless Reducer Pattern defines the state management for a single agent turn.
- [Central State Management](./central-state-management.md): This pattern is YAAF's core strategy for managing agent state centrally and explicitly.
- [Session Persistence](./session-persistence.md): The serializable nature of `AgentThread` is the foundation for persisting agent sessions.

## Sources
[Source 1]: src/agents/thread.ts