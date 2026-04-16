---
title: Gateway Subsystem
entity_type: subsystem
summary: The architectural layer responsible for managing external communication, user-in-the-loop approvals, and channel-based interactions.
primary_files:
  - src/gateway/approvals.ts
exports:
  - ApprovalManager
  - ApprovalRequest
  - ApprovalDecision
  - ApprovalRecord
  - ApprovalTransport
  - ApprovalManagerConfig
stub: false
compiled_at: 2026-04-16T14:18:22.508Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/gateway/approvals.ts
confidence: 0.9
---

## Purpose
The Gateway Subsystem provides the infrastructure for external communication and human-in-the-loop (HITL) intervention. Its primary role is to manage asynchronous approval flows, allowing an agent to pause execution and request explicit permission from a user before performing potentially dangerous operations. 

This subsystem extends the framework's standard synchronous permission checks into asynchronous interactions that can span external communication channels such as Telegram, Slack, or WhatsApp.

## Architecture
The subsystem is built around a decoupled transport-manager pattern that separates the logic of approval policies from the mechanics of external communication.

### Key Components
- **ApprovalManager**: The central coordinator that evaluates whether a tool execution requires human intervention based on configured rules and risk levels. It manages the lifecycle of an approval request, from initiation to final decision.
- **ApprovalTransport**: An interface that defines how the framework communicates with the outside world. Implementations of this interface handle the delivery of requests to users and the retrieval of their responses.
- **ApprovalRequest**: A data structure containing the context of the requested action, including the tool name, a human-readable description, arguments, and a risk assessment.

## Integration Points
The Gateway Subsystem integrates with the agent's execution logic by providing a bridge to the permission system. The `ApprovalManager` can be converted into a standard permission policy, which is then consumed by the `AgentRunner`. This allows the agent to treat an external user response as a definitive permission result.

## Key APIs
The subsystem exposes several types and classes for managing the approval lifecycle:

### ApprovalManager
The primary class used to orchestrate user-in-the-loop flows. It processes tool execution requests and determines if they must be routed through an `ApprovalTransport`.

### ApprovalTransport
An interface required for external communication. Implementations must provide a `requestApproval` method:
```typescript
export type ApprovalTransport = {
  /**
   * Send an approval request to the user and get their decision.
   * Must handle timeout internally (return 'timeout' if no response).
   */
  requestApproval(request: ApprovalRequest): Promise<ApprovalDecision>
}
```

### Data Structures
- **ApprovalRequest**: Contains metadata about the pending operation (tool, description, risk level, args, timestamp).
- **ApprovalDecision**: A type representing the outcome of a request: `'approved'`, `'denied'`, or `'timeout'`.
- **ApprovalRecord**: An extended version of the request that includes the final decision, the time the decision was made, and the total duration of the wait.

## Configuration
The `ApprovalManager` is configured via the `ApprovalManagerConfig` object, which defines the behavior of the approval gate:

| Property | Type | Description |
| :--- | :--- | :--- |
| `transport` | `ApprovalTransport` | The implementation used to contact the user. |
| `alwaysRequire` | `string[]` | Tool names or glob patterns that always trigger an approval request. |
| `neverRequire` | `string[]` | Tool names or glob patterns that bypass the approval gate. |
| `defaultRisk` | `low \| medium \| high \| critical` | The risk level assigned to tools not explicitly categorized. |
| `autoApproveLow` | `boolean` | Whether to automatically approve 'low' risk tools without user input. |
| `maxPending` | `number` | The maximum number of concurrent pending approvals allowed. |

## Extension Points
The subsystem is designed to be extended through the implementation of custom **Transports**. By implementing the `ApprovalTransport` interface, developers can route agent approval requests to any external platform or internal dashboard.

Example implementation of a transport:
```ts
const approvals = new ApprovalManager({
  transport: {
    requestApproval: async (request) => {
      // Custom logic to send to a messaging platform
      await telegram.send(`⚠️ ${request.tool} wants to run:\n${request.description}`);
      const response = await telegram.waitForReply(300_000);
      return response.text.toLowerCase().includes('yes') ? 'approved' : 'denied';
    },
  },
});
```

## Sources
- `src/gateway/approvals.ts`