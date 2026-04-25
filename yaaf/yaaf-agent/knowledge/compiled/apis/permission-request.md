---
export_name: PermissionRequest
source_file: src/agents/mailbox.ts
category: type
summary: A message type for an agent to request permission to use a tool or perform an action.
title: PermissionRequest
entity_type: api
search_terms:
 - agent tool use approval
 - requesting tool permissions
 - mailbox message types
 - human-in-the-loop agent
 - agent action confirmation
 - secure tool execution
 - permission_request message
 - agent communication protocol
 - multi-agent safety
 - how to approve agent actions
 - tool use request format
 - agent interaction model
stub: false
compiled_at: 2026-04-24T17:28:02.637Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/mailbox.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `PermissionRequest` type defines the structure of a message sent by an agent to seek [Authorization](../concepts/authorization.md) before executing a specific tool or action [Source 1]. This is a core component of the agent communication protocol facilitated by the `Mailbox` subsystem.

It is used in scenarios requiring human-in-the-loop supervision, safety checks, or hierarchical control within a multi-agent system. An agent constructs a `PermissionRequest` message detailing the tool it wants to use, the inputs it will provide, and a description of the intended action. This message is then sent to another agent or a human supervisor who can review the request and respond with a `PermissionResponse` message to either approve or deny the action [Source 1].

## Signature

`PermissionRequest` is a TypeScript type alias with the following structure [Source 1]:

```typescript
export type PermissionRequest = {
  /** A literal string identifying the message type. */
  type: "permission_request";

  /** A unique identifier to correlate this request with its corresponding response. */
  requestId: string;

  /** The ID of the agent making the request. */
  agentId: string;

  /** The name of the tool the agent intends to use. */
  toolName: string;

  /** A unique identifier for this specific instance of tool use. */
  toolUseId: string;

  /** A human-readable description of the intended action. */
  description: string;

  /** The parameters or arguments the agent plans to pass to the tool. */
  input: Record<string, unknown>;
};
```

## Examples

### Creating a Permission Request

This example shows how an agent might construct a `PermissionRequest` object before sending it through the `Mailbox`. The agent, "CodeExecutor-01", wants to use the "executeShellCommand" tool to delete a temporary directory.

```typescript
import { PermissionRequest } from 'yaaf';
import { v4 as uuidv4 } from 'uuid';

const requestId = uuidv4();
const toolUseId = uuidv4();

const request: PermissionRequest = {
  type: "permission_request",
  requestId: requestId,
  agentId: "CodeExecutor-01",
  toolName: "executeShellCommand",
  toolUseId: toolUseId,
  description: "The agent wants to delete the temporary directory '/tmp/agent-work' to clean up project files.",
  input: {
    command: "rm -rf /tmp/agent-work"
  }
};

// This request object would then be sent to a supervisor agent
// using a Mailbox instance.
// e.g., await mailbox.send('supervisor', { from: 'CodeExecutor-01', text: JSON.stringify(request) });
```

## See Also

*   `PermissionResponse`: The corresponding message type used to approve or deny a `PermissionRequest`.
*   `Mailbox`: The class responsible for sending and receiving agent messages, including permission requests.

## Sources

[Source 1]: src/agents/mailbox.ts