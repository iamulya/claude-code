---
summary: Specifies the external input required to resolve an agent's suspended state and allow execution to continue.
export_name: SuspendResolution
source_file: src/agents/thread.ts
category: type
title: SuspendResolution
entity_type: api
search_terms:
 - resume suspended agent
 - how to approve tool call
 - agent approval flow
 - unpause agent execution
 - resolve agent suspension
 - provide input to waiting agent
 - agent.resume parameters
 - what is SuspendResolution
 - approved tool call result
 - continue agent after approval
 - external input for agent
 - human in the loop agent
stub: false
compiled_at: 2026-04-25T00:14:45.162Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/thread.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `SuspendResolution` type defines the data structure used to provide external input to a suspended agent, allowing it to resume execution [Source 1]. When an agent's execution is paused for a reason specified by `SuspendReason` (such as awaiting approval for a tool call), a `SuspendResolution` object is constructed and passed to the agent's `resume` method to resolve the suspension [Source 1].

This mechanism is central to implementing human-in-the-loop workflows, where an agent must wait for external confirmation or data before proceeding.

## Signature

`SuspendResolution` is a discriminated union type. The `type` property determines the nature of the resolution.

```typescript
export type SuspendResolution =
  | { 
      /** The resolution type, indicating the tool call was approved. */
      type: "approved"; 
      /** 
       * Optional. A string result to be passed back to the agent as if it were the tool's output.
       * If not provided, the agent will proceed to execute the approved tool call.
       * If provided, the agent will skip the tool execution and use this string as the result.
       */
      result?: string;
    };
```
[Source 1]

## Examples

### Approving a Tool Call

When an agent is suspended with a `SuspendReason` of type `awaiting_approval`, you can resume it by providing an `approved` resolution.

```typescript
import type { AgentThread, SuspendResolution } from 'yaaf';

// Assume 'suspendedThread' is an AgentThread object where
// suspendedThread.suspended.type === 'awaiting_approval'

// Create a resolution to approve the pending tool call
const resolution: SuspendResolution = {
  type: 'approved',
};

// Resume the agent's execution with the approval
// const nextStepResult = await agent.resume(suspendedThread, resolution);
```
[Source 1]

### Approving a Tool Call with a Pre-supplied Result

In some cases, you might want to approve the *intent* of the tool call but provide the result directly, bypassing the actual tool execution. This can be useful for testing, mocking, or when the result is obtained through an external manual process.

```typescript
import type { AgentThread, SuspendResolution } from 'yaaf';

// Assume 'suspendedThread' is waiting for approval to call a 'getWeather' tool.
// Instead of letting the agent call the real API, we provide the result directly.

const resolutionWithResult: SuspendResolution = {
  type: 'approved',
  result: 'The weather is sunny with a high of 75°F.',
};

// The agent will now continue, using the provided string as the output
// of the 'getWeather' tool call without actually executing it.
// const nextStepResult = await agent.resume(suspendedThread, resolutionWithResult);
```
[Source 1]

## See Also

*   `SuspendReason`: The type describing why an agent has suspended execution.
*   `AgentThread`: The serializable state of an agent conversation, which includes the `suspended` status.
*   [AgentRunner](./agent-runner.md): The class responsible for executing agent logic, including resuming from suspension.
*   [ApprovalManager](./approval-manager.md): The subsystem that handles the logic for requiring and processing tool call approvals.

## Sources

*   [Source 1]: `src/agents/thread.ts`