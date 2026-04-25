---
summary: Constructs a worker result summary suitable for injection into the coordinator as a user message.
export_name: buildWorkerResult
source_file: src/agents/coordinator.ts
category: function
title: buildWorkerResult
entity_type: api
search_terms:
 - coordinator worker communication
 - format worker output
 - create user message from task
 - task notification to string
 - how to report task status
 - multi-agent message passing
 - worker result formatting
 - agent task summary
 - build coordinator input
 - TaskNotification helper
 - agent-to-agent message
stub: false
compiled_at: 2026-04-24T16:54:02.904Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/coordinator.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `buildWorkerResult` function is a utility for formatting the outcome of a worker agent's task into a standardized string. This string is designed to be sent as a user-level message to a coordinator agent, informing it of the task's completion, failure, or other status [Source 1].

This function is a key component of the coordinator-worker pattern in YAAF, facilitating clear and structured communication from worker agents back to the central coordinator that delegates tasks [Source 1]. By using this helper, developers can ensure that worker results are presented to the coordinator in a consistent format that its underlying prompt is engineered to understand.

## Signature

The function takes a task ID, status, and summary string as arguments and returns a formatted string [Source 1].

```typescript
export function buildWorkerResult(
  taskId: string,
  status: TaskStatus,
  summary: string,
  opts?: { /* ... */ }
): string;
```

### Parameters

-   `taskId` (`string`): The unique identifier of the task being reported.
-   `status` (`TaskStatus`): The final status of the task. The `TaskStatus` type is defined as:
    ```typescript
    export type TaskStatus = "completed" | "failed" | "killed";
    ```
-   `summary` (`string`): A concise summary of the task's outcome.
-   `opts` (`object`, optional): An optional object for additional configuration. The source material does not specify its properties [Source 1].

### Returns

-   (`string`): A formatted string suitable for use as a message to a coordinator agent.

## Examples

The following example demonstrates how to take the details from a `TaskNotification` object and use `buildWorkerResult` to create a message for a coordinator agent.

```typescript
import { buildWorkerResult, TaskNotification, TaskStatus } from 'yaaf';

// A worker agent completes its task and generates a notification object.
const workerTaskResult: {
  taskId: string;
  status: TaskStatus;
  summary: string;
} = {
  taskId: 'research-auth-bug-451',
  status: 'completed',
  summary: 'Identified the root cause of the authentication bug. It is related to incorrect JWT signature verification on the /api/v2/user endpoint.',
};

// Use the helper to format the result into a string.
const messageForCoordinator = buildWorkerResult(
  workerTaskResult.taskId,
  workerTaskResult.status,
  workerTaskResult.summary
);

// This message can now be passed to the coordinator agent's `run` method.
console.log(messageForCoordinator);

/*
  Example output might look like:
  "TASK COMPLETED (research-auth-bug-451): Identified the root cause of the authentication bug. It is related to incorrect JWT signature verification on the /api/v2/user endpoint."
*/
```

## See Also

-   `TaskNotification`: The structured data type that represents a worker's result.
-   `CoordinatorAgent`: The agent that receives and processes the formatted result string.
-   `buildCoordinatorPrompt`: The function used to create the [System Prompt](../concepts/system-prompt.md) for a `CoordinatorAgent`, which is designed to interpret messages created by `buildWorkerResult`.

## Sources

[Source 1]: src/agents/coordinator.ts