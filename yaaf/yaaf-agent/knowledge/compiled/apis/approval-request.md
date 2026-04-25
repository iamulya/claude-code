---
export_name: ApprovalRequest
source_file: src/gateway/approvals.ts
category: type
title: ApprovalRequest
entity_type: api
summary: A type representing a request for user approval before executing a potentially dangerous tool.
search_terms:
 - user approval flow
 - human in the loop
 - permission request object
 - tool execution confirmation
 - asynchronous permissions
 - what is an approval request
 - dangerous operation confirmation
 - agent safety
 - user consent for actions
 - approval request properties
 - risk level for tools
stub: false
compiled_at: 2026-04-24T16:49:29.057Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/gateway/approvals.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `ApprovalRequest` type defines the data structure used to request permission from a user before an agent executes a tool [Source 1]. It encapsulates all the necessary information for a human to make an informed decision about a pending operation.

This object is a core component of YAAF's asynchronous, "human-in-the-loop" [Permission System](../subsystems/permission-system.md). It is created by an `ApprovalManager` and passed to an `ApprovalTransport`, which then presents the information to the user over a communication [Channel](./channel.md) like Slack or Telegram [Source 1].

## Signature

`ApprovalRequest` is a TypeScript type alias with the following properties [Source 1]:

```typescript
export type ApprovalRequest = {
  /** Tool requesting approval */
  tool: string;
  /** Human-readable description of what will happen */
  description: string;
  /** Risk level */
  risk: "low" | "medium" | "high" | "critical";
  /** The raw input arguments */
  args: Record<string, unknown>;
  /** Request timestamp */
  timestamp: number;
};
```

### Properties

*   **`tool: string`**
    The name of the tool that is requesting permission to run.

*   **`description: string`**
    A human-readable summary of the action the tool will perform if approved. This should be clear and concise enough for a non-technical user to understand the consequences.

*   **`risk: "low" | "medium" | "high" | "critical"`**
    The assessed risk level of the operation. This helps the user quickly gauge the potential impact of approving the request.

*   **`args: Record<string, unknown>`**
    The raw input arguments that will be passed to the tool's execution function. This provides full transparency into the operation.

*   **`timestamp: number`**
    A Unix timestamp indicating [when](./when.md) the approval request was generated.

## Examples

An `ApprovalRequest` object is typically received as an argument within an `ApprovalTransport` implementation. The transport's `requestApproval` function uses the object's properties to format a message for the user.

```typescript
import type { ApprovalRequest, ApprovalDecision, ApprovalTransport } from 'yaaf';

// A mock transport for sending approval requests via a messaging service.
const myTransport: ApprovalTransport = {
  async requestApproval(request: ApprovalRequest): Promise<ApprovalDecision> {
    // The 'request' object contains all the details about the pending action.
    console.log(`Received approval request for tool: ${request.tool}`);
    
    const message = `
      ⚠️ **Approval Needed** ⚠️
      
      **Tool:** \`${request.tool}\`
      **Risk:** ${request.risk.toUpperCase()}
      **Action:** ${request.description}
      **Arguments:** \`\`\`json\n${JSON.stringify(request.args, null, 2)}\n\`\`\`
      
      Reply "yes" to approve or "no" to deny.
    `;
    
    // In a real implementation, you would send this message to a user
    // and wait for their reply.
    // await sendMessageToUser(message);
    // const userReply = await waitForReply();
    
    // For this example, we'll just simulate an approval.
    return Promise.resolve('approved');
  },
};

// Example of what an ApprovalRequest object might look like at runtime:
const sampleRequest: ApprovalRequest = {
  tool: 'fileSystem.deleteFile',
  description: 'Deletes the file at path /home/user/important_document.txt',
  risk: 'critical',
  args: { path: '/home/user/important_document.txt' },
  timestamp: Date.now(),
};

myTransport.requestApproval(sampleRequest);
```

## See Also

*   `ApprovalManager`: The class that manages the approval lifecycle.
*   `ApprovalTransport`: The interface for sending `ApprovalRequest` objects to users.
*   `ApprovalDecision`: The type representing the outcome of a request (`'approved'`, `'denied'`, or `'timeout'`).
*   `ApprovalRecord`: A type that extends `ApprovalRequest` with the final decision and timing information.

## Sources

[Source 1]: src/gateway/approvals.ts