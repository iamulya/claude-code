---
summary: Defines the specific reasons an agent's execution might be paused, providing context for external resolution.
export_name: SuspendReason
source_file: src/agents/thread.ts
category: type
title: SuspendReason
entity_type: api
search_terms:
 - agent paused state
 - why did my agent stop
 - handle agent suspension
 - awaiting approval reason
 - tool call approval
 - resume agent execution
 - agent requires input
 - thread suspended state
 - external input for agent
 - pause and resume agent
 - human in the loop
 - agent interaction required
stub: false
compiled_at: 2026-04-25T00:14:47.090Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/thread.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `SuspendReason` type is a discriminated union that specifies why an agent's execution has been paused. When an [AgentRunner](./agent-runner.md)'s `step()` method returns a result where the `suspended` property is set, this type provides the necessary context for an external system—such as a user interface or an orchestration layer—to understand the reason for the pause and determine how to proceed [Source 1].

This mechanism is central to implementing patterns like human-in-the-loop approvals for sensitive operations. Each variant of the `SuspendReason` type contains the specific information needed to resolve that particular suspension cause [Source 1].

The most common reason for suspension is `awaiting_approval`, which occurs when an LLM attempts to use a tool that requires explicit consent before execution [Source 1].

## Signature

`SuspendReason` is a TypeScript type alias for a discriminated union. The source material defines the `awaiting_approval` variant [Source 1].

```typescript
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
```

### Variants

#### `awaiting_approval`
Indicates the agent is paused pending approval for a specific tool call.

- `type`: The literal string `"awaiting_approval"`.
- `pendingToolCall`: A `ToolCall` object representing the function call the LLM wants to execute.
- `args`: The parsed arguments for the `pendingToolCall`.
- `message`: A human-readable string explaining why approval is required, typically derived from the tool's configuration.

## Examples

The following example demonstrates how to check for and handle a suspended agent state after calling `agent.step()`.

```typescript
import { AgentRunner, StepResult, SuspendReason, AgentThread } from 'yaaf';

// Assume 'runner' and 'thread' are initialized instances
declare const runner: AgentRunner;
declare let thread: AgentThread;

async function processAgentStep() {
  const result: StepResult = await runner.step(thread);

  if (result.suspended) {
    console.log('Agent execution is suspended.');
    await handleSuspension(result.thread, result.suspended);
  } else if (result.done) {
    console.log('Agent finished with response:', result.response);
  } else {
    // Agent is not done and not suspended, continue processing
    thread = result.thread;
    // Potentially call processAgentStep() again in a loop
  }
}

async function handleSuspension(currentThread: AgentThread, reason: SuspendReason) {
  switch (reason.type) {
    case 'awaiting_approval':
      console.log(`Approval required: ${reason.message}`);
      console.log(`Tool to be called: ${reason.pendingToolCall.toolName}`);
      console.log('With arguments:', reason.args);

      // In a real application, you would prompt a user for a decision.
      const isApproved = await askForUserApproval();

      if (isApproved) {
        // Resume the agent, providing the approval.
        const resolution = { type: 'approved' };
        await runner.resume(currentThread, resolution);
        console.log('Agent resumed.');
      } else {
        // Handle denial case, e.g., by stopping the agent or providing
        // a different instruction.
        console.log('Tool call denied. Agent remains suspended.');
      }
      break;
    
    // Future versions might include other suspension reasons.
    default:
      console.error('Unknown suspension reason:', reason);
  }
}

async function askForUserApproval(): Promise<boolean> {
  // Dummy implementation for getting user consent
  return Promise.resolve(true);
}
```

## See Also

- [AgentRunner](./agent-runner.md): The class responsible for executing agent steps and producing results that may include a `SuspendReason`.
- [Tool Calls](../concepts/tool-calls.md): The concept of agents using tools, which is the primary trigger for suspensions requiring approval.
- `AgentThread`: The serializable state of an agent, which includes the `suspended` field when paused.
- `StepResult`: The object returned from `agent.step()`, containing the `suspended` property.
- `SuspendResolution`: The type used to provide input back to a suspended agent via `agent.resume()`.

## Sources

[Source 1]: src/agents/thread.ts