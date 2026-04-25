---
summary: A set of principles for building robust, scalable, and stateless LLM agents, inspired by the Twelve-Factor App methodology.
title: "12 Factor Agents"
entity_type: concept
see_also:
 - "[Agent Session](./agent-session.md)"
 - "[Session Persistence](./session-persistence.md)"
 - "[Agent Turn](./agent-turn.md)"
search_terms:
 - stateless agent architecture
 - scalable LLM agents
 - how to persist agent state
 - resuming agent execution
 - Twelve-Factor App for AI
 - agent thread serialization
 - YAAF agent state management
 - robust agent design
 - agent execution model
 - decoupling agent logic from state
 - agent as a pure function
 - agent reducer pattern
stub: false
compiled_at: 2026-04-25T00:16:43.221Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/thread.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

12 Factor Agents is an architectural pattern in YAAF for building robust, scalable, and maintainable LLM-powered agents. It adapts the principles of the [Twelve-Factor App methodology](https://12factor.net/) to the domain of AI agents, with a strong emphasis on statelessness and process disposability.

The core problem this pattern solves is the tight coupling of an agent's execution state to a specific process or server. In traditional stateful applications, if a process crashes or needs to be restarted, the ongoing work is lost. For long-running or complex agent tasks, this is unacceptable. The 12 Factor Agent pattern ensures that an agent's execution can be paused, persisted, and resumed seamlessly across different processes, servers, or even serverless function invocations [Source 1].

## How It Works in YAAF

YAAF implements the 12 Factor Agent pattern through a "stateless reducer" model. The agent's logic is treated as a pure function that takes the current state as input and produces a new state as output, without retaining any internal state between invocations [Source 1].

The central component of this pattern is the `AgentThread` object. An `AgentThread` is a complete, serializable representation of an agent's execution state at any given moment. It is a plain JSON object that contains everything needed to continue the agent's work [Source 1]:

*   **`messages`**: The full conversation history.
*   **`suspended`**: Details about why an agent has paused, such as awaiting approval for a tool call.
*   **`done`**: A boolean flag indicating if the agent has reached a terminal state.
*   **`finalResponse`**: The final output from the agent.
*   **Metadata**: Includes a unique ID, step counter, and timestamps.

The agent's progression is managed by a `step` function, which embodies the reducer pattern [Source 1]:

`agent.step(thread) → { thread: newThread, done: boolean, suspended?: SuspendReason }`

Each call to `agent.step()` takes the current `AgentThread`, performs one unit of work (e.g., an [LLM Call](./llm-call.md) or a [Tool Execution](./tool-execution.md)), and returns a new, updated `AgentThread` object. Because the `AgentThread` is just JSON, it can be stored in any persistence layer, such as a database, a Redis cache, or a file system [Source 1].

This design enables several key capabilities:
*   **Resilience**: If a process fails, the last saved `AgentThread` can be loaded into a new process to resume execution exactly where it left off.
*   **Scalability**: Agent workloads can be distributed across many stateless workers, as any worker can process any `AgentThread`.
*   **Debugging and Auditing**: The entire history of an agent's execution can be replayed from its sequence of `AgentThread` snapshots.
*   **Branching**: An `AgentThread` can be forked at any step to explore alternative execution paths, for example in A/B testing scenarios [Source 1].

YAAF provides helper functions to manage the lifecycle of a thread, including `createThread`, `forkThread`, `serializeThread`, and `deserializeThread`. The `deserializeThread` function includes security measures, such as stripping system messages to prevent [Prompt Injection](./prompt-injection.md) via tampered state blobs and optional HMAC signature verification to ensure data integrity [Source 1].

## See Also

*   [Agent Session](./agent-session.md): The `AgentThread` is the concrete, serializable implementation of an agent session.
*   [Session Persistence](./session-persistence.md): This concept describes the mechanisms for storing and retrieving `AgentThread` objects.
*   [Agent Turn](./agent-turn.md): Each invocation of the `agent.step()` function constitutes a single agent turn.

## Sources

[Source 1]: src/agents/thread.ts