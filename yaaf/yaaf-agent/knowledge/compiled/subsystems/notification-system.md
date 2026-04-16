---
summary: A logical subsystem for delivering lifecycle notifications from agents and orchestrators to users via multiple channels.
primary_files:
  - src/utils/notifier.ts
title: Notification System
entity_type: subsystem
exports:
  - NotificationChannel
  - CompositeNotifier
  - BufferNotifier
  - notificationAdapterFromChannel
stub: false
compiled_at: 2026-04-16T14:39:51.467Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/utils/notifier.ts
confidence: 0.95
---

## Purpose
The Notification System provides a unified mechanism for delivering lifecycle updates and alerts from agents and orchestrators to users. It is designed to handle background processes where immediate console output may not be available or sufficient, supporting delivery across multiple channels such as webhooks, consoles, or custom integrations.

The system addresses the need for visibility into agent states, specifically when agents finish execution, encounter failures, or require human intervention.

## Architecture
The subsystem is built around a provider-agnostic interface that decouples the source of a notification from its delivery medium.

### Core Components
- **Notification**: A standardized data structure containing the notification's `type`, `title`, `message`, and optional `metadata` (such as agent IDs, execution cost, or duration).
- **NotificationChannel**: An interface that defines the contract for delivery mediums. Implementations must provide a `notify` method and an optional `destroy` method for cleanup.
- **CompositeNotifier**: An implementation of the `NotificationChannel` that fans out a single notification to multiple underlying channels simultaneously. It is designed for resilience; errors in one channel are logged and swallowed to ensure they do not prevent delivery to other channels.
- **BufferNotifier**: A specialized channel that stores notifications in memory. This is primarily utilized for testing environments or scenarios requiring batch processing of alerts.

### Notification Types
The system categorizes alerts into five distinct types:
- `completed`: Successful task execution.
- `failed`: Execution errors or crashes.
- `needs_attention`: Scenarios requiring human-in-the-loop intervention.
- `warning`: Non-critical issues or potential problems.
- `info`: General status updates.

## Integration Points
The Notification System serves as a central hub for several other framework components:
- **AgentOrchestrator**: Hooks into lifecycle events (e.g., `agent:completed`) to broadcast status updates.
- **SecurityAuditLog**: Forwards critical security alerts and audit trails to configured notification channels.
- **Vigil**: Uses the system to deliver periodic briefs or status reports.

## Key APIs

### NotificationChannel
The primary interface for all delivery implementations.
```typescript
export interface NotificationChannel {
  /** Send a notification. Should not throw — errors are logged and swallowed. */
  notify(notification: Notification): Promise<void>
  /** Optional cleanup. */
  destroy?(): Promise<void>
}
```

### CompositeNotifier
Used to aggregate multiple channels into a single delivery point.
```typescript
const notifier = new CompositeNotifier([
  new ConsoleNotifier(),
  new WebhookNotifier('https://hooks.slack.com/...'),
]);
```

### notificationAdapterFromChannel
A bridge function that converts a standard `NotificationChannel` into a plugin-compatible `NotificationAdapter`. This allows utilities defined in `src/utils/notifier.ts` to be registered within an agent's `PluginHost`.

## Extension Points
Developers can extend the system by implementing the `NotificationChannel` interface to support new delivery mediums. Examples of potential extensions include:
- **EmailNotifier**: For delivering alerts via SMTP or third-party email services.
- **Slack/Discord Notifiers**: For integration with team collaboration tools.
- **DatabaseNotifier**: For persisting notification history to a relational or document store.

Custom channels are typically integrated by passing them to a `CompositeNotifier` or by using the `notificationAdapterFromChannel` utility to register them as framework plugins.