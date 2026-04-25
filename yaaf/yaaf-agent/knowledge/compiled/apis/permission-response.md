---
export_name: PermissionResponse
source_file: src/agents/mailbox.ts
category: type
summary: A message type for responding to a permission request from an agent.
title: PermissionResponse
entity_type: api
search_terms:
 - agent permission response
 - mailbox message types
 - approve tool use
 - deny tool use
 - permission request reply
 - tool use authorization
 - agent communication protocol
 - mailbox permission_response
 - how to respond to permission request
 - agent IPC
 - structured agent messages
 - YAAF mailbox types
stub: false
compiled_at: 2026-04-24T17:28:11.473Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/mailbox.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `PermissionResponse` type defines the structure of a message sent in reply to a `PermissionRequest` within the YAAF agent mailbox system [Source 1]. It is used to either approve or deny an agent's request to use a specific tool.

This message type is a key component of workflows requiring oversight, such as human-in-the-loop approvals or manager-worker agent patterns where a supervising agent must authorize the actions of its subordinates. A response can simply grant permission, deny it with an explanation, or grant it with modifications to the original tool input parameters [Source 1].

## Signature

`PermissionResponse` is a TypeScript type alias with the following structure [Source 1]:

```typescript
export type PermissionResponse = {
  /**
   * A literal string to identify the message type. Must be "permission_response".
   */
  type: "permission_response";

  /**
   * The unique identifier from the original PermissionRequest this message is responding to.
   * This is used for correlation.
   */
  requestId: string;

  /**
   * Indicates the outcome of the permission request.
   * - "success": The request is approved.
   * - "error": The request is denied.
   */
  subtype: "success" | "error";

  /**
   * An optional error message explaining why the request was denied.
   * This should be provided when `subtype` is "error".
   */
  error?: string;

  /**
   * An optional object containing modified input parameters for the tool.
   * If provided on a "success" response, the agent should use this input
   * instead of the original input from its request.
   */
  updatedInput?: Record<string, unknown>;
};
```

## Examples

### Approving a Request

This example shows a successful response to a permission request, approving the [Tool Use](../concepts/tool-use.md).

```typescript
import type { PermissionResponse } from 'yaaf';

const approvalResponse: PermissionResponse = {
  type: 'permission_response',
  requestId: 'req-12345-abcdef', // Corresponds to the original PermissionRequest
  subtype: 'success',
};

// Send this response via the Mailbox...
```

### Approving with Modified Input

This example shows a successful response that also modifies the input parameters for the tool. The requesting agent should use these new parameters instead of its original ones.

```typescript
import type { PermissionResponse } from 'yaaf';

const modifiedApproval: PermissionResponse = {
  type: 'permission_response',
  requestId: 'req-67890-ghijkl',
  subtype: 'success',
  updatedInput: {
    fileName: 'report-final-v2.pdf', // Original might have been 'report.pdf'
    includeCharts: true,
  },
};
```

### Denying a Request

This example shows how to deny a permission request and provide a reason.

```typescript
import type { PermissionResponse } from 'yaaf';

const denialResponse: PermissionResponse = {
  type: 'permission_response',
  requestId: 'req-abcde-12345',
  subtype: 'error',
  error: 'Insufficient budget for this API call. Please use a cheaper alternative.',
};
```

## See Also

- `PermissionRequest`: The message type that initiates the request this response answers.
- `Mailbox`: The class responsible for sending and receiving `PermissionResponse` and other agent messages.

## Sources

[Source 1]: src/agents/mailbox.ts