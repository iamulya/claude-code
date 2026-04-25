---
title: ApprovalManager API
entity_type: api
summary: Manages interactive approval flows for agent operations, typically for dangerous tool invocations.
export_name: ApprovalManager
source_file: src/gateway.ts
category: class
search_terms:
 - interactive approval flow
 - human in the loop
 - tool use confirmation
 - dangerous operation approval
 - agent action confirmation
 - require user permission
 - how to approve agent actions
 - user consent for tools
 - permission policy integration
 - agent safety
 - secure tool invocation
 - action approval timeout
 - get user consent
stub: false
compiled_at: 2026-04-24T16:49:09.984Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/gateway.md
compiled_from_quality: documentation
confidence: 0.95
---

## Overview

The `ApprovalManager` class provides a mechanism for creating interactive approval flows for potentially dangerous or sensitive agent operations [Source 1]. It allows an agent to request explicit permission from a human user before proceeding with an action, such as invoking a tool with specific arguments.

This is a key component for implementing "human-in-the-loop" safety patterns. It works by sending a request message through a specified `[[[[[[[[Channel]]]]]]]]` to designated approvers and waiting for a response. The flow can be configured with a timeout, after which the request will be automatically denied [Source 1]. A common use case is to integrate `ApprovalManager` within a permission policy to conditionally grant access to [Tools](../subsystems/tools.md) based on user consent.

## Constructor

The `ApprovalManager` is instantiated with a configuration object that specifies the communication Channel and a timeout period [Source 1].

```typescript
import { ApprovalManager, type Channel } from 'yaaf/gateway';

interface ApprovalManagerConfig {
  /**
   * The channel instance to use for sending approval requests
   * and receiving responses.
   */
  channel: Channel;

  /**
   * The time in milliseconds to wait for an approval before
   * automatically denying the request.
   */
  timeout?: number; // e.g., 300_000 for 5 minutes
}

const approvals = new ApprovalManager(config: ApprovalManagerConfig);
```

## Methods & Properties

### request

The `request` method initiates an approval flow. It sends a message to the specified approvers and waits for a response or a timeout [Source 1]. It returns a promise that resolves to `true` if approved and `false` if denied or timed out.

**Signature**
```typescript
interface RequestApprovalOptions {
  /** The name of the tool being requested. */
  tool: string;

  /** The arguments the tool will be called with. */
  arguments: any;

  /** The agent's stated reason for using the tool. */
  reason: string;

  /** An array of user IDs who are authorized to approve this request. */
  approvers: string[];
}

public async request(options: RequestApprovalOptions): Promise<boolean>;
```

## Examples

The following example demonstrates how to use `ApprovalManager` within a permission policy to require admin approval before a tool can be used [Source 1].

```typescript
import { ApprovalManager } from 'yaaf/gateway';
import { slackChannel } from './channels'; // Assuming a channel is already configured
import { permissions } from './permissions'; // Assuming a permission policy object

// Initialize the manager with a channel and a 5-minute timeout.
const approvals = new ApprovalManager({
  channel: slackChannel,
  timeout: 300_000,
});

// Configure the permission policy to use the approval manager.
permissions.onRequest(async (toolName, args, reason) => {
  // This function will be called whenever a tool is about to be used.
  // It returns a promise that resolves to a boolean indicating permission.

  // For a specific dangerous tool, require approval from an admin.
  if (toolName === 'deleteDatabase') {
    return approvals.request({
      tool: toolName,
      arguments: args,
      reason,
      approvers: ['admin-user-id'], // The user ID of the admin on Slack
    });
  }

  // Allow other tools by default.
  return true;
});
```

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/gateway.md