---
title: Permission Policy
entity_type: concept
summary: A security mechanism for controlling tool execution through allow/deny lists and manual approval gates.
stub: false
compiled_at: 2026-04-16T14:12:35.675Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agent.ts
confidence: 0.9
---

---
title: "Permission Policy"
entity_type: "concept"
summary: "A security mechanism for controlling tool execution through allow/deny lists and manual approval gates."
related_subsystems:
  - "Security"
  - "Agent"

## What It Is
A Permission Policy is a security layer in YAAF designed to govern how and when an agent can execute tools. It addresses the risk of autonomous agents performing unintended, dangerous, or costly actions by providing a structured way to define allow/deny lists and human-in-the-loop approval requirements.

In the YAAF execution lifecycle, the Permission Policy serves as the first line of defense for tool safety. It is distinct from identity-based authorization; while a Permission Policy determines if a tool is "safe" to run within the current environment, an Access Policy determines if a specific user has the rights to run it.

## How It Works in YAAF
The Permission Policy is implemented via the `PermissionPolicy` class and is integrated directly into the `Agent` configuration. When an agent attempts to call a tool, the policy evaluates the call against its defined rules before execution begins.

The policy supports three primary actions:
1.  **Allow**: The tool is permitted to run automatically.
2.  **Deny**: The tool execution is blocked.
3.  **Require Approval**: The execution is paused until an external entity (such as a user via a CLI or a web interface) grants permission.

The framework provides helper functions such as `allowAll()` and `denyAll()` for broad configurations, and `cliApproval()` for standard human-in-the-loop workflows. Rules can use glob patterns (e.g., `search_*`) to apply to groups of tools.

### Execution Order
When an agent is configured with both a Permission Policy and an Access Policy, YAAF follows a specific evaluation order:
1.  **Permission Policy**: Evaluates tool safety ("Is this tool allowed/safe?").
2.  **Access Policy**: Evaluates identity-aware authorization ("Is this specific user authorized to use this tool?").

## Configuration
Developers configure the policy by instantiating a `PermissionPolicy` and using its fluent API to define rules. This instance is then passed to the `Agent` constructor.

```ts
const agent = new Agent({
  systemPrompt: 'You are a helpful travel assistant.',
  tools: createTravelTools(),
  permissions: new PermissionPolicy()
    .allow('search_*') // Allow all search tools automatically
    .requireApproval('book_trip', 'Booking costs real money') // Pause for human approval
    .onRequest(cliApproval()), // Use the CLI helper to handle approval requests
  // ... other config
});
```

The `onRequest` method defines the handler that is triggered when a tool requires manual intervention. This handler can be a built-in utility like `cliApproval()` or a custom function that integrates with external notification systems or UI components.

## See Also
- [[Agent]]
- [[Access Policy]]
- [[Sandbox]]