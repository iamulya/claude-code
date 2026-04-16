---
summary: A design pattern where the agent's state is captured in a serializable thread object, allowing for pause/resume across process boundaries.
title: Stateless Reducer Pattern
entity_type: concept
stub: false
compiled_at: 2026-04-16T14:07:59.692Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/human-in-the-loop.md
confidence: 0.95
---

---
title: Stateless Reducer Pattern
entity_type: concept
summary: A design pattern where the agent's state is captured in a serializable thread object, allowing for pause/resume across process boundaries.
related_subsystems:
  - Agent Execution
  - State Management

## What It Is
The Stateless Reducer Pattern is a core architectural principle in YAAF, derived from the "12 Factor Agents" methodology (specifically Factors 5, 6, 7, and 12). It addresses the challenge of maintaining agent state in environments where processes may be short-lived, such as serverless functions, or where execution must pause for long durations, such as when awaiting human-in-the-loop approvals.

In this pattern, the agent's entire state is captured in a serializable "thread" object. This object serves as the single source of truth for the conversation; there is no separate, hidden "execution state" or in-memory process requirement. This allows an agent to "step" through its logic, be serialized to a database, and be resumed later on an entirely different server or process.

## How It Works in YAAF
YAAF implements this pattern through three primary primitives and a standardized state object called the `AgentThread`.

### The AgentThread Object
The `AgentThread` is a plain JSON object that contains the full conversation history, metadata, and current execution status.

```ts
type AgentThread = {
  id: string               // unique thread ID
  createdAt: string        // ISO timestamp
  updatedAt: string        // ISO timestamp
  step: number             // increments with each agent.step() call
  messages: ChatMessage[]  // full conversation history — the source of truth
  done: boolean            // true when final response is ready
  finalResponse?: string   // set when done === true
  suspended?: SuspendReason // set when agent needs external input
  metadata?: Record<string, unknown>
}
```

### Core Primitives
The framework provides three methods to interact with the thread state:

1.  **`agent.step(thread)`**: Executes a single LLM turn. It takes the current thread state and returns an updated thread object along with flags indicating if the task is `done` or `suspended`.
2.  **`agent.resume(thread, resolution)`**: Used when a thread has been suspended (e.g., awaiting human approval). It injects the external resolution into the thread and executes the next step.
3.  **`agent.runThread(thread)`**: A convenience wrapper that runs a continuous loop of `agent.step()` until the agent either completes the task or encounters a suspension point.

### Suspension and Persistence
When an agent requires human intervention—such as tool approval or a request for information—the `step()` method returns a `suspended` status. Because the thread is a plain JSON object, developers can use `serializeThread()` to save the state to a persistent store (like Redis or DynamoDB). 

Once the required input is received (e.g., via a webhook), the thread is retrieved, restored using `deserializeThread()`, and passed to `agent.resume()` to continue execution.

### Thread Forking
The pattern supports branching through `forkThread()`. This creates a clone of a thread at its current state with a new ID, allowing for "what-if" testing or parallel agent paths without modifying the original thread.

## Configuration
The pattern is utilized by managing the lifecycle of the `AgentThread`. Developers can manually control the step loop to handle persistence between turns.

### Basic Step Loop
```ts
import { createThread } from 'yaaf'

let thread = createThread('Summarise the Q4 report')
let { thread: t, done, suspended } = await agent.step(thread)

while (!t.done && !t.suspended) {
  ;({ thread: t } = await agent.step(t))
}
```

### Serialization for Persistence
To move a thread across process boundaries, YAAF provides utility functions:

```ts
import { serializeThread, deserializeThread } from 'yaaf'

// Save to storage
const json = serializeThread(updatedThread)
await db.save(json)

// Restore in a different process
const restored = deserializeThread(await db.load(threadId))
const { thread: resumed } = await agent.resume(restored, { type: 'approved' })
```

### Resolution Types
When calling `agent.resume()`, the developer must provide a resolution that matches the suspension reason:

| Resolution type | Use Case |
|----------------|-------------|
| `{ type: 'approved', result? }` | Approves a tool call marked with `requiresApproval`. |
| `{ type: 'rejected', reason? }` | Rejects a tool call, allowing the LLM to plan an alternative. |
| `{ type: 'human_input', response }` | Provides text input requested by the agent. |
| `{ type: 'async_result', result, error? }` | Provides the result of a long-running background job. |

## Sources
- Source 1: Human-in-the-Loop Agents (File: `human-in-the-loop.md`)