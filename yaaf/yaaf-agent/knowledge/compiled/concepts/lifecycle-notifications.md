---
summary: The pattern of monitoring and reporting agent state transitions (e.g., finished, failed, needs attention) to external observers.
title: Lifecycle Notifications
entity_type: concept
stub: false
compiled_at: 2026-04-16T14:40:02.350Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/utils/notifier.ts
confidence: 0.9
---

---
title: Lifecycle Notifications
entity_type: concept
summary: The pattern of monitoring and reporting agent state transitions (e.g., finished, failed, needs attention) to external observers.
related_subsystems:
  - Orchestrator
  - Plugins

## What It Is
Lifecycle Notifications in YAAF provide a standardized mechanism for monitoring and reporting the state transitions of LLM-powered agents. This system is designed to deliver updates to users or external systems when background agents reach specific milestones, encounter errors, or require human intervention. By decoupling the notification logic from the agent's core execution, YAAF allows for multi-channel reporting (e.g., console, webhooks, email) without modifying the agent's internal logic.

## How It Works in YAAF
The notification system is built around a set of core interfaces and utility classes defined in `src/utils/notifier.ts`.

### Notification Types
The framework categorizes notifications into five distinct types:
- `completed`: The agent has successfully finished its task.
- `failed`: The agent encountered a terminal error.
- `needs_attention`: The agent requires human input or manual intervention.
- `warning`: A non-terminal issue occurred during execution.
- `info`: General status updates.

### Core Components
- **Notification Object**: A structured payload containing a `type`, `title`, `message`, and optional `metadata` (such as agent ID, cost, or duration) and a `timestamp`.
- **NotificationChannel**: An interface that defines how a notification is delivered. It requires a `notify` method and an optional `destroy` method for cleanup.
- **CompositeNotifier**: A specialized channel that fans out a single notification to multiple underlying channels simultaneously. It is designed to be resilient; errors in one channel do not prevent delivery to others.
- **BufferNotifier**: A channel that stores notifications in memory, primarily used for testing or batch processing scenarios.

### Integration and Plugins
YAAF bridges the notification utility with its broader plugin architecture using the `notificationAdapterFromChannel` function. This allows any `NotificationChannel` to be wrapped as a `NotificationAdapter` plugin. Once registered with an agent's `PluginHost`, notifications from various subsystems—such as `AgentOrchestrator` lifecycle events, `Vigil` summaries, or `SecurityAuditLog` alerts—can flow through the same configured channels.

## Configuration
Developers configure notifications by instantiating specific channels and wiring them into the framework's orchestrators or plugin hosts.

### Example: Multi-Channel Configuration
```typescript
const notifier = new CompositeNotifier([
  new ConsoleNotifier(),
  new WebhookNotifier('https://hooks.slack.com/...'),
]);

// Wire into orchestrator
orchestrator.on('agent:completed', (agentId, result) => {
  notifier.notify({
    type: 'completed',
    title: `Agent ${agentId} finished`,
    message: result.summary,
  });
});
```

### Example: Custom Callback Notifier
For specialized delivery methods like email, a custom notifier can be implemented using a callback pattern:
```typescript
const custom = new CallbackNotifier(async (notif) => {
  await sendEmail(notif.title, notif.message);
});
```

## Sources
- `src/utils/notifier.ts`