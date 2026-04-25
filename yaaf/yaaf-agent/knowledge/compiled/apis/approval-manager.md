---
summary: A YAAF component for managing message approval flows within the Gateway module.
export_name: ApprovalManager
source_file: src/gateway/approvals.ts
category: class
title: ApprovalManager
entity_type: api
search_terms:
 - user in the loop
 - human approval for tools
 - asynchronous permissions
 - agent safety
 - dangerous operation confirmation
 - tool execution approval
 - PermissionPolicy async
 - how to ask for permission
 - Telegram approval flow
 - Slack tool confirmation
 - gateway approvals
 - user confirmation before running code
stub: false
compiled_at: 2026-04-24T16:49:09.985Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/gateway.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/gateway/approvals.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `ApprovalManager` class provides a mechanism for "user-in-the-loop" permission requests, enabling agents to seek human approval before executing potentially dangerous operations [Source 2]. It is part of the Gateway subsystem, which must be imported explicitly from `yaaf/gateway` [Source 1].

This component extends YAAF's synchronous `PermissionPolicy` with asynchronous approval flows. Instead of immediately granting or denying permission, the agent can use a communication [Channel](./channel.md) (like Telegram, Slack, or WhatsApp) to send a request to a user and wait for their response. This is particularly useful for [Tools](../subsystems/tools.md) that can have significant real-world consequences [Source 2].

The design is inspired by the execution approval system in OpenClaw [Source 2].

## Constructor

The `ApprovalManager` is instantiated with a configuration object that defines its behavior and communication transport [Source 2].

```typescript
import type { ApprovalManagerConfig } from 'yaaf/gateway';

export class ApprovalManager {
  constructor(config: ApprovalManagerConfig);
  // ...
}
```

### `ApprovalManagerConfig`

The configuration object has the following properties:

```typescript
export type ApprovalManagerConfig = {
  /** Transport for sending approval requests (e.g., Telegram, Slack) */
  transport: ApprovalTransport;
  /**
   * Tools that always require approval, regardless of other policies.
   * Matches exact names or glob patterns.
   */
  alwaysRequire?: string[];
  /**
   * Tools that never require approval (bypass).
   * Matches exact names or glob patterns.
   */
  neverRequire?: string[];
  /**
   * Default risk level for tools not in explicit lists.
   * Default: 'medium'.
   */
  defaultRisk?: ApprovalRequest["risk"];
  /**
   * Auto-approve low-risk tools?
   * Default: false.
   */
  autoApproveLow?: boolean;
  /**
   * Maximum pending approvals. New requests are denied if exceeded.
   * Default: 5.
   */
  maxPending?: number;
};
```

### Related Types

The configuration relies on several related types for defining the approval flow:

```typescript
// Defines the communication channel for sending requests.
export type ApprovalTransport = {
  /**
   * Send an approval request to the user and get their decision.
   * Must handle timeout internally (return 'timeout' if no response).
   */
  requestApproval(request: ApprovalRequest): Promise<ApprovalDecision>;
};

// The data structure for a single approval request.
export type ApprovalRequest = {
  tool: string;
  description: string;
  risk: "low" | "medium" | "high" | "critical";
  args: Record<string, unknown>;
  timestamp: number;
};

// The possible outcomes of an approval request.
export type ApprovalDecision = "approved" | "denied" | "timeout";

// A complete record of a request and its outcome.
export type ApprovalRecord = ApprovalRequest & {
  decision: ApprovalDecision;
  decidedAt: number;
  durationMs: number;
};
```

## Methods & Properties

### `asPermissionPolicy()`

This method returns an object conforming to the `PermissionPolicy` interface, allowing the `ApprovalManager` to be used directly in an `AgentRunner`'s configuration [Source 2].

```typescript
asPermissionPolicy(): PermissionPolicy;
```

**Returns:** A `PermissionPolicy` object that integrates the asynchronous approval flow into the agent's synchronous permission checks.

## Examples

The following example demonstrates how to create an `ApprovalManager` with a custom transport that uses a hypothetical Telegram client. The resulting permission policy is then passed to an `AgentRunner` [Source 2].

```typescript
import { ApprovalManager } from 'yaaf/gateway';
import { AgentRunner } from 'yaaf';

// Assume 'telegram' is a client for the Telegram API
declare const telegram: {
  send: (message: string) => Promise<void>;
  waitForReply: (timeout: number) => Promise<{ text: string }>;
};

const approvals = new ApprovalManager({
  transport: {
    requestApproval: async (request) => {
      // Send the approval request to the user via Telegram
      await telegram.send(
        `⚠️ ${request.tool} wants to run:\n${request.description}\n\nReply "yes" or "no"`
      );

      try {
        // Wait for the user's response for up to 5 minutes
        const response = await telegram.waitForReply(300_000);
        return response.text.toLowerCase().includes('yes') ? 'approved' : 'denied';
      } catch (error) {
        // Handle timeout if waitForReply throws
        return 'timeout';
      }
    },
  },
  // Configuration to always require approval for file system tools
  alwaysRequire: ['fs.*'],
  // Automatically approve tools with low risk
  autoApproveLow: true,
});

// Use the approval manager in the AgentRunner configuration
const runner = new AgentRunner({
  // ... other agent configuration
  permissions: approvals.asPermissionPolicy(),
});
```

## Sources

[Source 1]: src/gateway.ts
[Source 2]: src/gateway/approvals.ts