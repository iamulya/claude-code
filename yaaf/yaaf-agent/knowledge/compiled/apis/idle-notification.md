---
export_name: IdleNotification
source_file: src/agents/mailbox.ts
category: type
summary: Represents a notification sent by an agent to indicate its idle status or task completion.
title: IdleNotification
entity_type: api
search_terms:
 - agent status notification
 - task completion message
 - agent idle state
 - inter-agent communication
 - mailbox message types
 - how to know when an agent is finished
 - agent lifecycle events
 - available agent signal
 - failed task notification
 - agent interrupted message
 - YAAF mailbox protocol
 - agent swarm coordination
stub: false
compiled_at: 2026-04-24T17:13:08.614Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/mailbox.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `Idle[[[[[[[[Notification]]]]]]]]` type defines the structure for a specific message within the YAAF agent mailbox system [Source 1]. Its primary purpose is to allow an agent to broadcast its status [when](./when.md) it is no longer actively working on a task. This is a crucial mechanism for coordinating work in [Multi-Agent Systems](../concepts/multi-agent-systems.md), enabling a supervising agent or a team to know when an agent is available for new tasks, has been interrupted, or has encountered a failure [Source 1].

This Notification can be sent for several reasons:
*   The agent has successfully completed its assigned task.
*   The agent's task was interrupted externally.
*   The agent or its task failed.

The `IdleNotification` contains details about the reason for idleness and the outcome of any task it was working on [Source 1].

## Signature

`IdleNotification` is a TypeScript type alias with the following structure [Source 1]:

```typescript
export type IdleNotification = {
  /** A literal string identifying the message type. */
  type: "idle_notification";

  /** The name of the agent sending the notification. */
  from: string;

  /** An ISO 8601 timestamp indicating when the notification was created. */
  timestamp: string;

  /** Optional reason why the agent has become idle. */
  idleReason?: "available" | "interrupted" | "failed";

  /** Optional short, human-readable summary of the status. */
  summary?: string;

  /** If the agent became idle after finishing a task, this is the ID of that task. */
  completedTaskId?: string;

  /** The final status of the completed task. */
  completedStatus?: "resolved" | "blocked" | "failed";

  /** If the task or agent failed, a string explaining the reason. */
  failureReason?: string;
};
```

## Examples

### Task Completed Successfully

An agent named `researcher-01` sends a notification after successfully completing its task.

```typescript
import { IdleNotification } from "yaaf";

const notification: IdleNotification = {
  type: "idle_notification",
  from: "researcher-01",
  timestamp: new Date().toISOString(),
  idleReason: "available",
  summary: "Finished analyzing market data.",
  completedTaskId: "task-123-market-analysis",
  completedStatus: "resolved",
};

// This notification would then be sent via the Mailbox system.
```

### Task Failed

An agent named `code-generator` sends a notification after its task failed due to a compilation error.

```typescript
import { IdleNotification } from "yaaf";

const notification: IdleNotification = {
  type: "idle_notification",
  from: "code-generator",
  timestamp: new Date().toISOString(),
  idleReason: "failed",
  summary: "Code generation failed.",
  completedTaskId: "task-456-generate-api-client",
  completedStatus: "failed",
  failureReason: "Compilation failed: Type 'any' is not assignable to type 'string'.",
};
```

### Agent Interrupted

An agent is manually stopped by a user or another process.

```typescript
import { IdleNotification } from "yaaf";

const notification: IdleNotification = {
  type: "idle_notification",
  from: "data-processor",
  timestamp: new Date().toISOString(),
  idleReason: "interrupted",
  summary: "Processing was manually stopped by the user.",
  completedTaskId: "task-789-long-running-job",
  completedStatus: "blocked",
};
```

## See Also

The `IdleNotification` is part of the [File-based IPC](../concepts/file-based-ipc.md) protocol used by the `Mailbox` class. Other message types in this protocol include:
*   `MailboxMessage`
*   `ShutdownRequest`
*   `PermissionRequest`
*   `PermissionResponse`

## Sources

[Source 1] src/agents/mailbox.ts