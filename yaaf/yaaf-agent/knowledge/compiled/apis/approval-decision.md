---
export_name: ApprovalDecision
source_file: src/gateway/approvals.ts
category: type
title: ApprovalDecision
entity_type: api
summary: "A type representing the possible outcomes of an asynchronous approval request: approved, denied, or timeout."
search_terms:
 - user approval status
 - permission request outcome
 - agent action confirmation
 - tool execution decision
 - asynchronous permission result
 - approved denied timeout
 - human in the loop response
 - gateway approval types
 - ApprovalRequest result
 - user consent state
stub: false
compiled_at: 2026-04-24T16:48:53.366Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/gateway/approvals.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `ApprovalDecision` type is a string literal type that represents the possible outcomes of an asynchronous approval request made to a user. It is a core component of YAAF's user-in-the-loop [Permission System](../subsystems/permission-system.md), which allows agents to ask for confirmation before executing potentially dangerous operations. [Source 1]

This type is returned by an `ApprovalTransport`'s `requestApproval` method and is stored in an `ApprovalRecord` to log the outcome of a request. [Source 1]

The possible values are:
*   `'approved'`: The user explicitly granted permission for the operation.
*   `'denied'`: The user explicitly denied permission for the operation.
*   `'timeout'`: The user did not respond to the request within the configured time limit. [Source 1]

## Signature

`ApprovalDecision` is defined as a union of three string literals. [Source 1]

```typescript
export type ApprovalDecision = "approved" | "denied" | "timeout";
```

## Examples

The following example shows how `ApprovalDecision` is used as the return type [when](./when.md) implementing a custom `ApprovalTransport`. The transport logic must resolve to one of the three possible string values. [Source 1]

```typescript
import type { ApprovalRequest, ApprovalDecision, ApprovalTransport } from 'yaaf';

// A mock messaging API for demonstration purposes
const someMessagingApi = {
  async waitForReply(options: { timeout: number }): Promise<{ text: string } | null> {
    // In a real application, this would wait for a user's message
    // from a service like Slack, Telegram, or WhatsApp.
    return new Promise(resolve => {
      setTimeout(() => {
        const responses = [{ text: 'yes' }, { text: 'no' }, null];
        resolve(responses[Math.floor(Math.random() * 3)]);
      }, 1000);
    });
  }
};

const myTransport: ApprovalTransport = {
  async requestApproval(request: ApprovalRequest): Promise<ApprovalDecision> {
    console.log(`Requesting approval for: ${request.description}`);

    const userResponse = await someMessagingApi.waitForReply({ timeout: 300_000 });

    if (!userResponse) {
      // The user did not respond in time.
      return 'timeout';
    }

    if (userResponse.text.toLowerCase().trim() === 'yes') {
      // The user granted permission.
      return 'approved';
    } else {
      // Any other response is treated as a denial.
      return 'denied';
    }
  }
};
```

## See Also

*   `ApprovalRequest`: The type defining the data sent to a user for approval.
*   `ApprovalRecord`: The type for a completed approval request, which includes the `ApprovalDecision`.
*   `ApprovalTransport`: The interface for sending approval requests, which must return an `ApprovalDecision`.
*   `ApprovalManager`: The class that manages the overall approval [workflow](../concepts/workflow.md).

## Sources

[Source 1] `src/gateway/approvals.ts`