---
title: Async Approvals Gateway
entity_type: subsystem
summary: Provides a framework for extending synchronous permission policies with asynchronous, user-in-the-loop approval flows for agent actions over external communication channels.
primary_files:
 - src/gateway/approvals.ts
exports:
 - ApprovalManager
 - ApprovalTransport
 - ApprovalRequest
 - ApprovalDecision
search_terms:
 - user in the loop
 - human approval for agents
 - asynchronous permissions
 - agent safety
 - dangerous tool execution
 - ask for permission before running tool
 - Telegram approval
 - Slack approval
 - YAAF permissions
 - user confirmation
 - agent guardrails
 - OpenClaw exec approval
 - wait for user response
stub: false
compiled_at: 2026-04-24T18:09:48.740Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/gateway/approvals.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The Async Approvals Gateway extends YAAF's standard synchronous [Permission System](./permission-system.md) to support "user-in-the-loop" scenarios [Source 1]. It allows an agent to pause its execution, request explicit permission from a human user for a potentially dangerous or sensitive operation, and wait for a response before proceeding. This is particularly useful for actions with real-world consequences, where automatic execution is undesirable [Source 1].

The system is designed to work over asynchronous communication [Channel](../apis/channel.md)s like Telegram, Slack, or WhatsApp, enabling agents to interact with users for approval even [when](../apis/when.md) they are not directly observing the agent's console. The design is inspired by the execution approval system in OpenClaw [Source 1].

## Architecture

The subsystem is centered around the `ApprovalManager` class, which orchestrates the approval logic. Its core components are [Source 1]:

-   **`ApprovalManager`**: The main class that implements the permission policy. It determines whether a given [Tool Execution](../concepts/tool-execution.md) requires approval based on its configuration, creates an `ApprovalRequest`, and delegates the communication to a transport layer.
-   **`ApprovalTransport`**: An interface that defines the contract for communicating with the user. Developers must provide a concrete implementation of this interface, which is responsible for sending the `ApprovalRequest` to a user via a specific Channel (e.g., a messaging app) and returning the user's `ApprovalDecision`. The transport is also responsible for handling its own timeouts [Source 1].
-   **`ApprovalRequest`**: A data structure containing all the context for a permission request, including the tool name, a human-readable description of the action, the arguments, a risk level (`low`, `medium`, `high`, `critical`), and a timestamp.
-   **`ApprovalDecision`**: A type representing the possible outcomes of a request: `'approved'`, `'denied'`, or `'timeout'`.

When a tool is about to be executed, the agent's permission system consults the `ApprovalManager`. The manager checks its configuration to decide if approval is needed. If so, it constructs an `ApprovalRequest` and passes it to the configured `ApprovalTransport`. The agent's execution is paused until the transport returns a decision.

## Integration Points

The primary integration point for this subsystem is the agent's core permission framework. An instance of `ApprovalManager` can be converted into a permission policy and provided to the `AgentRunner` during its configuration. This injects the asynchronous approval flow directly into the agent's tool invocation lifecycle [Source 1].

```typescript
const approvals = new ApprovalManager({
  transport: myTelegramTransport,
  // ... other config
});

// Use in AgentRunner config
const runner = new AgentRunner({
  // ... other agent config
  permissions: approvals.asPermissionPolicy(),
});
```

## Key APIs

-   **`ApprovalManager`**: The central class for managing approval flows. It is configured with a transport and rules for when to require approval [Source 1].
-   **`ApprovalTransport`**: An interface that must be implemented by developers to connect the approval system to a specific user communication channel. Its primary method is `requestApproval(request: ApprovalRequest): Promise<ApprovalDecision>` [Source 1].
-   **`ApprovalRequest`**: The object passed to the `ApprovalTransport` containing the details of the action requiring approval [Source 1].
-   **`ApprovalDecision`**: A string literal type representing the outcome of an approval request [Source 1].

## Configuration

The `ApprovalManager` is configured via an `ApprovalManagerConfig` object passed to its constructor. Key configuration options include [Source 1]:

-   `transport`: (Required) An object conforming to the `ApprovalTransport` interface.
-   `alwaysRequire`: An array of tool names or glob patterns that will always trigger an approval request.
-   `neverRequire`: An array of tool names or glob patterns that will bypass the approval flow.
-   `defaultRisk`: The risk level to assign to [Tools](./tools.md) not explicitly categorized. Defaults to `'medium'`.
-   `autoApproveLow`: A boolean flag to automatically approve tools classified as low-risk. Defaults to `false`.
-   `maxPending`: The maximum number of concurrent approval requests allowed. If this limit is exceeded, new requests are automatically denied. Defaults to `5`.

## Extension Points

The main extension point of this subsystem is the `ApprovalTransport` interface. By providing a custom implementation, developers can integrate the approval [workflow](../concepts/workflow.md) with any external service or communication protocol, such as email, SMS, or a custom web application UI [Source 1].

## Sources

[Source 1] `src/gateway/approvals.ts`