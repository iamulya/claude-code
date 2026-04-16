---
title: Async Approvals
entity_type: concept
summary: A mechanism for pausing agent execution to obtain human permission via asynchronous communication channels like Telegram or Slack.
stub: false
compiled_at: 2026-04-16T14:18:23.977Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/gateway/approvals.ts
confidence: 0.95
---

---
title: "Async Approvals"
entity_type: "concept"
summary: "A mechanism for pausing agent execution to obtain human permission via asynchronous communication channels like Telegram or Slack."
related_subsystems: ["gateway", "tools"]

## What It Is
Async Approvals is a human-in-the-loop (HITL) safety mechanism in YAAF designed to manage the execution of sensitive or "dangerous" operations. It allows an agent to pause its execution flow and request explicit permission from a user through external asynchronous communication channels, such as Telegram, Slack, or WhatsApp.

This concept extends YAAF's standard synchronous permission policies to support long-running wait states where the user may not be immediately present in the primary application interface. It is inspired by the execution approval systems found in frameworks like OpenClaw.

## How It Works in YAAF
The Async Approvals system is primarily implemented through the `ApprovalManager` class within the `gateway/approvals` module. It bridges the gap between tool execution and external user communication.

### The Approval Flow
1.  **Interception**: When an agent attempts to call a tool, the `ApprovalManager` evaluates the request against its configuration (e.g., risk levels or tool name patterns).
2.  **Request Creation**: If approval is required, an `ApprovalRequest` object is generated. This object contains the tool name, a human-readable description, the risk level (`low`, `medium`, `high`, or `critical`), and the raw input arguments.
3.  **Transport**: The manager uses an `ApprovalTransport` to send the request to the user. The transport is responsible for the actual delivery (e.g., sending a message via a Telegram bot) and waiting for a response.
4.  **Suspension**: The agent's execution is paused asynchronously while awaiting the `ApprovalDecision`.
5.  **Resolution**: The user provides a decision—`approved`, `denied`, or the request reaches a `timeout`.
6.  **Recording**: The outcome is stored as an `ApprovalRecord`, which includes the decision, the timestamp, and the duration of the wait.

### Integration with AgentRunner
The `ApprovalManager` is integrated into the agent's lifecycle by converting it into a standard permission policy using the `.asPermissionPolicy()` method. This policy is then passed to the `AgentRunner` configuration.

## Configuration
Developers configure the behavior of the approval system via the `ApprovalManagerConfig` object. This includes defining which tools require oversight and how the system should handle different risk levels.

```typescript
const approvals = new ApprovalManager({
  transport: {
    requestApproval: async (request) => {
      // Implementation of the external communication logic
      await telegram.send(`⚠️ ${request.tool} wants to run:\n${request.description}`);
      const response = await telegram.waitForReply(300_000); // 5 minute timeout
      return response.text.toLowerCase().includes('yes') ? 'approved' : 'denied';
    },
  },
  alwaysRequire: ['file_system_delete', 'database_drop'],
  neverRequire: ['read_only_*'],
  autoApproveLow: true,
  defaultRisk: 'medium',
  maxPending: 5
});

// Applying the manager to an AgentRunner
const runner = new AgentRunner({
  // ... other config
  permissions: approvals.asPermissionPolicy(),
});
```

### Key Configuration Fields
*   **transport**: An object implementing `ApprovalTransport` to handle external I/O.
*   **alwaysRequire / neverRequire**: Arrays of tool names or glob patterns to explicitly force or bypass approval.
*   **autoApproveLow**: A boolean flag to automatically permit tools categorized with a `low` risk level.
*   **maxPending**: A safety limit on the number of concurrent pending approval requests; new requests are automatically denied if this limit is exceeded.

## Sources
* `src/gateway/approvals.ts`