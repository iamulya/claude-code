---
title: ApprovalManager
entity_type: api
summary: A class that manages asynchronous user-in-the-loop approval flows for tool execution via external communication channels.
export_name: ApprovalManager
source_file: src/gateway/approvals.ts
category: class
stub: false
compiled_at: 2026-04-16T14:07:15.784Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/gateway.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/gateway/approvals.ts
confidence: 1
---

## Overview
The `ApprovalManager` class facilitates human-in-the-loop (HITL) workflows by intercepting tool execution requests and routing them to external communication channels for manual approval. It extends the framework's permission system to support asynchronous decisions, allowing an agent to pause execution while waiting for a human response via platforms such as Slack, Telegram, or a terminal.

This class is typically used when an agent needs to perform "dangerous" operations (e.g., deleting data, making financial transactions) that require explicit authorization beyond static permission policies.

## Signature / Constructor

```typescript
export class ApprovalManager {
  constructor(config: ApprovalManagerConfig);
}
```

### Configuration Types

#### ApprovalManagerConfig
| Property | Type | Description |
| :--- | :--- | :--- |
| `transport` | `ApprovalTransport` | The mechanism used to send requests and receive decisions. |
| `alwaysRequire` | `string[]` | (Optional) Tool names or glob patterns that always trigger an approval request. |
| `neverRequire` | `string[]` | (Optional) Tool names or glob patterns that bypass approval. |
| `defaultRisk` | `'low' \| 'medium' \| 'high' \| 'critical'` | (Optional) Default risk level if not specified. Defaults to `'medium'`. |
| `autoApproveLow` | `boolean` | (Optional) Whether to automatically approve low-risk tools. Defaults to `false`. |
| `maxPending` | `number` | (Optional) Maximum number of concurrent pending approvals. Defaults to `5`. |

#### ApprovalTransport
An interface that must be implemented to bridge the manager with a communication channel.
```typescript
export type ApprovalTransport = {
  /**
   * Send an approval request to the user and get their decision.
   * Must handle timeout internally (return 'timeout' if no response).
   */
  requestApproval(request: ApprovalRequest): Promise<ApprovalDecision>;
}
```

#### ApprovalRequest
```typescript
export type ApprovalRequest = {
  tool: string;
  description: string;
  risk: 'low' | 'medium' | 'high' | 'critical';
  args: Record<string, unknown>;
  timestamp: number;
}
```

## Methods & Properties

### request()
Initiates an approval flow for a specific tool execution.
```typescript
request(request: Omit<ApprovalRequest, 'timestamp'>): Promise<ApprovalDecision>
```

### asPermissionPolicy()
Converts the `ApprovalManager` instance into a permission policy that can be consumed by an agent runner. This allows the manager to automatically intercept tool calls based on the configured risk levels and patterns.

## Examples

### Basic Implementation with a Transport
This example demonstrates creating a transport that prompts a user via a hypothetical Telegram client.

```typescript
import { ApprovalManager, type ApprovalDecision } from 'yaaf/gateway';

const approvals = new ApprovalManager({
  transport: {
    requestApproval: async (request): Promise<ApprovalDecision> => {
      // Send message to user
      await telegram.send(
        `⚠️ Tool Approval Required: ${request.tool}\n` +
        `Reason: ${request.description}\n` +
        `Arguments: ${JSON.stringify(request.args)}`
      );
      
      // Wait for a response with a 5-minute timeout
      const response = await telegram.waitForReply({ timeout: 300_000 });
      
      if (!response) return 'timeout';
      return response.text.toLowerCase() === 'yes' ? 'approved' : 'denied';
    }
  },
  alwaysRequire: ['database_delete', 'send_payment']
});
```

### Integration with Agent Permissions
Using the manager to gate tool execution within an agent runner.

```typescript
import { AgentRunner } from 'yaaf';
import { ApprovalManager } from 'yaaf/gateway';

const approvals = new ApprovalManager({ transport: myTransport });

const runner = new AgentRunner({
  agent: myAgent,
  // Use the manager as the permission policy
  permissions: approvals.asPermissionPolicy(),
});
```

## See Also
- `Gateway`
- `Channel`