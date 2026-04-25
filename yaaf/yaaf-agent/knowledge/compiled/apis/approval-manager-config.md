---
export_name: ApprovalManagerConfig
source_file: src/gateway/approvals.ts
category: type
title: ApprovalManagerConfig
entity_type: api
summary: Configuration object for the ApprovalManager class, defining transport, policies, and behavior for handling asynchronous user approval requests.
search_terms:
 - user approval settings
 - configure approval manager
 - human in the loop config
 - permission request options
 - approval transport
 - always require approval
 - never require approval
 - auto-approve tools
 - default tool risk
 - max pending requests
 - asynchronous permissions
 - user-in-the-loop
 - gateway approvals
stub: false
compiled_at: 2026-04-24T16:49:16.001Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/gateway/approvals.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `ApprovalManagerConfig` type defines the configuration options for an `ApprovalManager` instance. This object is passed to the `ApprovalManager` constructor to customize its behavior for handling asynchronous, [User-in-the-loop permission requests](../concepts/user-in-the-loop-permission-requests.md) for agent [Tools](../subsystems/tools.md) [Source 1].

It specifies the transport mechanism for communicating with the user (e.g., via Slack or Telegram), sets rules for which tools always or never require approval, defines default risk levels, and configures behavior like auto-approvals and concurrency limits [Source 1].

## Signature

`ApprovalManagerConfig` is a TypeScript type alias.

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

### Dependent Types

The configuration relies on the `ApprovalTransport` type to define the communication [Channel](./channel.md) [Source 1].

```typescript
export type ApprovalTransport = {
  /**
   * Send an approval request to the user and get their decision.
   * Must handle timeout internally (return 'timeout' if no response).
   */
  requestApproval(request: ApprovalRequest): Promise<ApprovalDecision>;
};
```

## Properties

- **`transport`**: `ApprovalTransport` (required)
  An object that implements the `requestApproval` method. This is responsible for sending the approval request to the user and returning their decision. It must handle its own logic for communication and timeouts [Source 1].

- **`alwaysRequire`**: `string[]` (optional)
  An array of tool names or glob patterns. Tools matching these patterns will always trigger an approval request, overriding any other policies [Source 1].

- **`neverRequire`**: `string[]` (optional)
  An array of tool names or glob patterns. Tools matching these patterns will never trigger an approval request and will be permitted to run automatically [Source 1].

- **`defaultRisk`**: `'low' | 'medium' | 'high' | 'critical'` (optional)
  The risk level assigned to tools that are not explicitly categorized. Defaults to `'medium'` if not specified [Source 1].

- **`autoApproveLow`**: `boolean` (optional)
  If set to `true`, tools with a risk level of `'low'` will be automatically approved without sending a request to the user. Defaults to `false` [Source 1].

- **`maxPending`**: `number` (optional)
  The maximum number of approval requests that can be pending at one time. If this limit is reached, new requests will be automatically denied. Defaults to `5` [Source 1].

## Examples

The following example shows how to define an `ApprovalManagerConfig` object and use it to instantiate an `ApprovalManager`.

```typescript
import { ApprovalManager, ApprovalManagerConfig, ApprovalTransport } from 'yaaf';

// 1. Define a transport for sending requests (e.g., via a chat service)
const myTransport: ApprovalTransport = {
  requestApproval: async (request) => {
    console.log(`Requesting approval for ${request.tool}: ${request.description}`);
    // In a real application, this would send a message to a user
    // and wait for a reply.
    // For this example, we'll auto-approve after a short delay.
    await new Promise(resolve => setTimeout(resolve, 100));
    return 'approved';
  },
};

// 2. Create the configuration object
const config: ApprovalManagerConfig = {
  transport: myTransport,
  alwaysRequire: ['fileSystem.delete', 'database.dropTable'],
  neverRequire: ['math.add', 'utils.*'],
  defaultRisk: 'medium',
  autoApproveLow: true,
  maxPending: 10,
};

// 3. Use the config to create an ApprovalManager
const approvals = new ApprovalManager(config);

// This manager can now be used to create a permission policy for an AgentRunner
// const runner = new AgentRunner({
//   ...
//   permissions: approvals.asPermissionPolicy(),
// });
```

## See Also

- `ApprovalManager`: The class that uses this configuration to manage approval flows.

## Sources

[Source 1]: src/gateway/approvals.ts