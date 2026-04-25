---
export_name: ApprovalTransport
source_file: src/gateway/approvals.ts
category: type
title: ApprovalTransport
entity_type: api
summary: Defines the interface for sending an approval request to a user over an external channel and receiving their decision.
search_terms:
 - user in the loop
 - asynchronous permissions
 - human approval for tools
 - how to ask for permission
 - agent confirmation
 - Slack approval
 - Telegram approval
 - implementing requestApproval
 - custom approval channel
 - user consent for agent actions
 - dangerous operation confirmation
 - permission request channel
 - wait for user response
stub: false
compiled_at: 2026-04-24T16:49:37.095Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/gateway/approvals.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `ApprovalTransport` type defines the contract for an object that handles the communication aspect of an asynchronous, user-in-the-loop approval process. It decouples the core logic of the `ApprovalManager` from the specific [Channel](./channel.md) used to communicate with the user, such as Telegram, Slack, or email [Source 1].

An implementation of `ApprovalTransport` is responsible for sending the details of a pending operation to a user, waiting for their response, and returning their decision. This allows agents to pause execution and request explicit permission before performing potentially dangerous or sensitive actions [Source 1].

## Signature

`ApprovalTransport` is a TypeScript type alias for an object with a single method, `requestApproval`.

```typescript
import type { ApprovalRequest, ApprovalDecision } from "yaaf";

export type ApprovalTransport = {
  /**
   * Send an approval request to the user and get their decision.
   * Must handle timeout internally (return 'timeout' if no response).
   */
  requestApproval(request: ApprovalRequest): Promise<ApprovalDecision>;
};
```

### Related Types

The `requestApproval` method uses the following related types for its parameters and return value:

```typescript
// The data sent to the transport for the user to review.
export type ApprovalRequest = {
  tool: string;
  description: string;
  risk: "low" | "medium" | "high" | "critical";
  args: Record<string, unknown>;
  timestamp: number;
};

// The possible outcomes of an approval request.
export type ApprovalDecision = "approved" | "denied" | "timeout";
```

## Methods & Properties

### requestApproval

Sends an approval request to the user and waits for their decision.

**Signature:**
```typescript
requestApproval(request: ApprovalRequest): Promise<ApprovalDecision>;
```

**Parameters:**
- `request` (`ApprovalRequest`): An object containing the details of the action requiring approval, including the tool name, a human-readable description, and the arguments.

**Returns:**
- `Promise<ApprovalDecision>`: A promise that resolves to one of three string literals:
    - `'approved'`: The user explicitly approved the action.
    - `'denied'`: The user explicitly denied the action.
    - `'timeout'`: The user did not respond within the implementation's defined timeout period.

**Implementation Notes:**
- The transport is responsible for its own timeout logic. If no response is received from the user within a reasonable timeframe, it must resolve the promise with the `'timeout'` value [Source 1].

## Examples

### Implementing a Telegram Transport

This example shows how to create an `ApprovalTransport` object that uses a hypothetical Telegram client to send a message to a user and wait for their reply.

```typescript
import {
  ApprovalTransport,
  ApprovalManager,
  ApprovalRequest,
  ApprovalDecision,
} from "yaaf";

// A mock Telegram client for demonstration purposes.
const telegram = {
  send: async (message: string) => console.log(`TELEGRAM > ${message}`),
  waitForReply: async (timeout: number): Promise<{ text: string }> => {
    // In a real implementation, this would listen for an incoming message.
    // Here we simulate a user approving after 2 seconds.
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { text: "yes, proceed" };
  },
};

// Create an object that conforms to the ApprovalTransport interface.
const telegramTransport: ApprovalTransport = {
  requestApproval: async (
    request: ApprovalRequest
  ): Promise<ApprovalDecision> => {
    // 1. Send the request to the user.
    await telegram.send(
      `⚠️ The tool "${request.tool}" wants to run with high risk.\n` +
      `Description: ${request.description}\n\n` +
      `Reply "yes" to approve or "no" to deny.`
    );

    try {
      // 2. Wait for a response, with a 5-minute timeout.
      const response = await telegram.waitForReply(300_000);

      // 3. Parse the response and return a decision.
      if (response.text.toLowerCase().includes("yes")) {
        return "approved";
      } else {
        return "denied";
      }
    } catch (error) {
      // 4. If waitForReply throws a timeout error, return 'timeout'.
      console.error("Did not receive a reply in time.", error);
      return "timeout";
    }
  },
};

// 5. Use the transport in the ApprovalManager configuration.
const approvalManager = new ApprovalManager({
  transport: telegramTransport,
});

// The ApprovalManager can now be used to create a permission policy for an AgentRunner.
const agentPermissions = approvalManager.asPermissionPolicy();
```

## See Also

- `ApprovalManager`: The class that orchestrates the approval process using an `ApprovalTransport`.
- `ApprovalRequest`: The data structure describing an action that requires approval.
- `ApprovalDecision`: The type representing the possible outcomes of a request.

## Sources

[Source 1]: src/gateway/approvals.ts