---
summary: Executes a single turn of the LLM, returning an updated thread and indicating if the agent is done or suspended.
export_name: Agent
source_file: src/agent.ts
category: function
title: Agent.step
entity_type: api
stub: false
compiled_at: 2026-04-16T14:08:07.607Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/human-in-the-loop.md
confidence: 0.95
---

## Overview
`Agent.step` is a core execution primitive in YAAF that implements the **stateless reducer** pattern (aligned with Factors 5, 6, 7, and 12 of the 12 Factor Agents methodology). It processes a single turn of an LLM-powered agent's reasoning or action loop.

Unlike traditional agent frameworks that maintain internal execution state, `Agent.step` takes an `AgentThread` as input—which serves as the single source of truth—and returns a new, updated `AgentThread`. This design allows agents to be paused, serialized, and resumed across different processes or serverless invocations.

## Signature / Constructor
```typescript
async step(thread: AgentThread, options?: StepOptions): Promise<StepResult>
```

### Parameters
- `thread`: An `AgentThread` object representing the current state of the conversation and execution history.
- `options`: (Optional) Configuration for the specific execution step.

### Return Type
Returns a `Promise` resolving to a `StepResult` object:
- `thread`: The updated `AgentThread` containing new messages, updated metadata, and potential suspension states.
- `done`: A boolean indicating if the agent has reached a final response.
- `response`: (Optional) The final text response if `done` is `true`.
- `suspended`: (Optional) A `SuspendReason` object if the agent has paused execution to wait for human approval, human input, or an asynchronous result.

## Methods & Properties
As a method of the `Agent` class, `step` interacts with the following `StepResult` properties:

| Property | Description |
|----------|-------------|
| `done` | When `true`, the task is complete and the final output is available in `thread.finalResponse`. |
| `suspended` | If present, indicates the agent cannot proceed without external resolution. Common types include `awaiting_approval`, `awaiting_human_input`, and `awaiting_async_result`. |
| `thread` | The new state of the agent. This object should be used for the subsequent call to `step` or `resume`. |

## Examples

### Basic Execution Loop
This example demonstrates running an agent to completion by repeatedly calling `step` until it is either finished or requires external intervention.

```typescript
import { createThread } from 'yaaf'

let thread = createThread('Summarise the Q4 report')
let result = await agent.step(thread)

while (!result.done && !result.suspended) {
  result = await agent.step(result.thread)
}

if (result.done) {
  console.log('Final Response:', result.thread.finalResponse)
}
```

### Handling Human-in-the-Loop Suspension
When a tool is configured with `requiresApproval: true`, `step` will return a suspended state before executing the tool.

```typescript
const result = await agent.step(createThread('deploy v1.3.0'))

if (result.suspended?.type === 'awaiting_approval') {
  console.log(`Action required: ${result.suspended.message}`)
  
  // The thread can be serialized and saved to a database here
  const serialized = serializeThread(result.thread)
  await db.save(result.thread.id, serialized)
}
```

## See Also
- AgentThread
- agent.resume
- agent.runThread
- createThread
- serializeThread