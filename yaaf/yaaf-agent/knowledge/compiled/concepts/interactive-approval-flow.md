---
title: Interactive Approval Flow
entity_type: concept
summary: A human-in-the-loop pattern where dangerous agent actions are paused until a user provides explicit authorization via a communication channel.
stub: false
compiled_at: 2026-04-16T14:07:25.036Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/gateway.md
confidence: 0.95
---

---
title: "Interactive Approval Flow"
entity_type: "concept"
summary: "A human-in-the-loop pattern where dangerous agent actions are paused until a user provides explicit authorization via a communication channel."
related_subsystems:
  - "Gateway"

## What It Is
The Interactive Approval Flow is a safety pattern designed to provide human oversight for autonomous agents. It addresses the risk of agents performing "dangerous operations"—such as financial transactions, destructive data modifications, or sensitive communications—without explicit consent. By implementing this flow, YAAF ensures that an agent's execution is suspended at critical decision points until a designated human operator reviews and authorizes the action.

## How It Works in YAAF
In YAAF, the Interactive Approval Flow is managed by the `ApprovalManager` class within the Gateway module. This mechanism bridges the gap between the agent's internal permission logic and external communication platforms (Channels).

When an agent attempts to use a tool that is flagged as requiring oversight, the system triggers a request through the `ApprovalManager`. The manager then:
1.  **Dispatches a Notification**: Sends a message to a specific `Channel` (e.g., Slack, Telegram, or a Console) containing the context of the request, including the tool name, arguments, and the reason for the action.
2.  **Suspends Execution**: The agent's process waits for a response from the communication channel.
3.  **Handles Timeouts**: If a user does not respond within a configured timeframe, the request is automatically handled (typically resulting in a denial to ensure safety).
4.  **Resumes Execution**: Once a user provides an "approve" or "deny" response via the channel, the `ApprovalManager` returns the result to the agent's permission policy, allowing the agent to either proceed or handle the rejection.

## Configuration
Developers configure the approval flow by instantiating an `ApprovalManager` and integrating it into the agent's permission lifecycle.

### Basic Setup
The `ApprovalManager` requires a target channel and a timeout duration (in milliseconds).

```typescript
import { ApprovalManager } from 'yaaf/gateway';

const approvals = new ApprovalManager({
  channel: slackChannel,
  timeout: 300_000,  // 5 minutes
});
```

### Integration with Permissions
The flow is typically invoked within a permission policy's `onRequest` hook. This hook intercepts tool calls and routes them to the human approver.

```typescript
// In a permission policy implementation:
permissions.onRequest(async (toolName, args, reason) => {
  return approvals.request({
    tool: toolName,
    arguments: args,
    reason,
    approvers: ['admin-user-id'], // Optional: restrict to specific users
  });
});
```

## Sources
- Source 1: `Gateway & Channels` (yaaf/knowledge/raw/docs/gateway.md)