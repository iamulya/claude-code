---
summary: Describes the output of a single agent execution step, including the updated thread, completion status, and any suspension details.
export_name: StepResult
source_file: src/agents/thread.ts
category: type
title: StepResult
entity_type: api
search_terms:
 - agent step output
 - result of agent.step
 - agent execution result
 - what does agent.step return
 - agent thread update
 - agent completion status
 - suspended agent state
 - how to check if agent is done
 - agent final response
 - agent suspension reason
 - YAAF agent loop
 - agent state machine output
 - agent run status
stub: false
compiled_at: 2026-04-25T00:14:25.472Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/thread.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `StepResult` type represents the outcome of a single execution cycle of an [Agent](./agent.md)'s `step` method [Source 1]. It is a fundamental part of YAAF's stateless, step-by-step execution model.

Each `StepResult` object contains the updated agent thread, a flag indicating if the agent's task is complete, the final response if available, and details about any suspension that may have occurred (e.g., waiting for tool approval) [Source 1]. By examining the `StepResult`, the calling code can decide whether to continue the execution loop, handle a suspension, or terminate and present the final response.

## Signature

The `StepResult` is a TypeScript type alias with the following structure [Source 1]:

```typescript
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

### Properties

- `thread`: The new `AgentThread` object representing the agent's state after the step has completed. This should be passed to the next call to `agent.step()`.
- `done`: A boolean that is `true` if the agent has reached a terminal state and produced its final response.
- `response`: An optional string containing the agent's final output. This property is only expected to be present when `done` is `true`.
- `suspended`: An optional `SuspendReason` object. If present, the agent has paused execution and is awaiting external input, such as an approval for a tool call. The execution loop should handle this state before proceeding.

## Examples

A typical agent execution loop processes `StepResult` objects until the `done` flag is true or a suspension occurs.

```typescript
import { Agent, StepResult } from 'yaaf';
import { AgentThread, createThread } from 'yaaf/agents/thread'; // Assuming direct import for example

async function runAgentLoop(agent: Agent, initialMessage: string): Promise<StepResult> {
  let thread: AgentThread = createThread(initialMessage);
  let result: StepResult;

  // Loop until the agent is done or suspended
  while (true) {
    result = await agent.step(thread);
    thread = result.thread; // Always use the updated thread for the next step

    if (result.done || result.suspended) {
      break; // Exit loop on completion or suspension
    }
  }

  if (result.done) {
    console.log("Agent finished successfully.");
    console.log("Final Response:", result.response);
  } else if (result.suspended) {
    console.log(`Agent suspended, reason: ${result.suspended.type}`);
    // Here you would implement logic to resolve the suspension,
    // e.g., by calling agent.resume(thread, resolution).
  }

  return result;
}
```

## See Also

- [Agent](./agent.md): The primary class that consumes an `AgentThread` and produces a `StepResult` via its `step` method.
- `AgentThread`: The serializable state object that is updated in each `StepResult`.
- `SuspendReason`: The type describing why an agent has paused execution, contained within the `suspended` property.

## Sources

[Source 1]: src/agents/thread.ts