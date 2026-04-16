---
summary: A guide on how to use YAAF's HITL primitives to build agents that require human approval or input.
title: Implementing Human-in-the-Loop Agents
entity_type: guide
difficulty: intermediate
stub: false
compiled_at: 2026-04-16T14:08:22.146Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/human-in-the-loop.md
confidence: 1
---

## Overview
YAAF implements the "stateless reducer" pattern for agents, adhering to the 12 Factor Agents methodology. This architecture allows agents to suspend execution, persist their entire state as a JSON object, and resume later—potentially in a different process or serverless execution environment.

This guide covers how to implement Human-in-the-Loop (HITL) workflows using three primary patterns:
1. **Human Approval**: Requiring permission before executing sensitive tools.
2. **Human Input**: Allowing the agent to ask the user clarifying questions.
3. **Async Results**: Waiting for long-running external processes to complete.

## Step-by-Step

### 1. Configure Tools for Approval
To require human intervention before a tool executes, set the `requiresApproval` property when defining a tool. This can be a boolean or a dynamic function based on the tool arguments.

```ts
import { buildTool } from 'yaaf'

const deployTool = buildTool({
  name: 'deploy_to_production',
  description: 'Deploy a version to production',
  inputSchema: {
    type: 'object',
    properties: {
      version: { type: 'string' },
    },
    required: ['version'],
  },
  // Require approval for every call
  requiresApproval: true,

  async call({ version }) {
    return { status: 'deployed', version }
  },
})
```

### 2. Implement the Step Loop
Unlike `agent.runThread()`, which runs to completion or failure, HITL workflows use `agent.step()`. This method executes a single turn and returns a `suspended` object if intervention is required.

```ts
import { createThread, serializeThread } from 'yaaf'

const thread = createThread('Deploy v1.3.0')
const { thread: updated, suspended } = await agent.step(thread)

if (suspended?.type === 'awaiting_approval') {
  // The agent has paused before calling the tool
  console.log(`Action: ${suspended.pendingToolCall.name}`)
  
  // Save the thread state to a database
  const state = serializeThread(updated)
  await db.save(updated.id, state)
}
```

### 3. Resume Execution
When a human provides a resolution (approval or rejection), use `agent.resume()` to continue the conversation.

```ts
import { deserializeThread } from 'yaaf'

// Load and restore the thread
const json = await db.load(threadId)
const savedThread = deserializeThread(json)

// Resume with an 'approved' resolution
const { thread: resumed } = await agent.resume(savedThread, { 
  type: 'approved' 
})

// Continue the loop until done or suspended again
let current = resumed
while (!current.done && !current.suspended) {
  const result = await agent.step(current)
  current = result.thread
}
```

### 4. Handle Human Input Requests
The agent can proactively ask the user for information using the built-in `request_human_input` tool. When the LLM calls this tool, `agent.step()` returns a suspension of type `awaiting_human_input`.

```ts
const { thread, suspended } = await agent.step(createThread('Plan the deployment'))

if (suspended?.type === 'awaiting_human_input') {
  const userInput = await getResponseFromUser(suspended.question)

  await agent.resume(thread, {
    type: 'human_input',
    response: userInput,
  })
}
```

### 5. Branching with Thread Forking
For "what-if" scenarios or testing different agent paths, use `forkThread`. This creates a copy of the thread at its current state with a new unique ID.

```ts
import { forkThread } from 'yaaf'

const branchA = forkThread(originalThread, { scenario: 'path-a' })
const branchB = forkThread(originalThread, { scenario: 'path-b' })

// Resume branches independently
await agent.resume(branchA, { type: 'approved' })
await agent.resume(branchB, { type: 'rejected', reason: 'Safety check failed' })
```

## Configuration Reference

### AgentThread Structure
The `AgentThread` is the single source of truth for the agent's state.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier for the thread. |
| `step` | `number` | Incremental counter of `agent.step()` calls. |
| `messages` | `ChatMessage[]` | The full conversation history. |
| `suspended` | `SuspendReason` | Present when the agent is waiting for external input. |

### Resolution Types
When calling `agent.resume(thread, resolution)`, the `resolution` object must match one of the following patterns:

| Resolution Type | Required Fields | Usage |
|-----------------|-----------------|-------|
| `approved` | `type: 'approved'`, `result?` | Approves a tool call. |
| `rejected` | `type: 'rejected'`, `reason?` | Denies a tool call; the LLM receives the reason. |
| `human_input` | `type: 'human_input'`, `response` | Provides text back to a `request_human_input` call. |
| `async_result` | `type: 'async_result'`, `result`, `error?` | Provides the result of a long-running job. |

## Common Mistakes
*   **Using `agent.runThread` for HITL**: `runThread` is a convenience wrapper that will throw an error if the agent attempts to suspend. Always use `agent.step()` and `agent.resume()` for interactive workflows.
*   **Loss of State**: Forgetting to serialize and save the thread after a `suspended` result is returned. Because YAAF is stateless, the in-memory object will be lost if the process restarts.
*   **Manual Message Injection**: Attempting to manually push messages into the `messages` array instead of using `agent.resume()`. Resuming ensures the internal state machine correctly transitions from a suspended state.

## Next Steps
*   Explore persistence strategies using Redis or DynamoDB for thread storage.
*   Implement multi-process handlers for webhooks (e.g., Slack or Email approval buttons).
*   Learn about constructing manual `awaiting_async_result` suspensions for CI/CD integrations.