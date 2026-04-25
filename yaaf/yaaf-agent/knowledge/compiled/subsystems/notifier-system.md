---
title: Notifier System
summary: A core YAAF subsystem providing a lifecycle notification system for agents, supporting multiple output channels like console, webhooks, and custom handlers.
primary_files:
 - src/utils/notifier.ts
entity_type: subsystem
exports:
 - Notification
 - NotificationType
 - NotificationChannel
 - CompositeNotifier
 - BufferNotifier
 - notificationAdapterFromChannel
search_terms:
 - agent lifecycle events
 - how to get agent notifications
 - webhook notifications for agents
 - agent completion alerts
 - agent failure alerts
 - custom notification handlers
 - console notifier
 - composite notifier
 - buffer notifier for testing
 - connecting notifier to plugins
 - agent monitoring
 - background agent status
 - Vigil notifications
 - AgentOrchestrator events
stub: false
compiled_at: 2026-04-24T18:17:02.515Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/notifier.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The Notifier System provides a unified mechanism for delivering lifecycle [Notification](../apis/notification.md)s about agent activity to users [Source 1]. It is designed to inform stakeholders [when](../apis/when.md) background agents complete tasks, encounter failures, or require attention. The system is architected to support multiple Notification [Channel](../apis/channel.md)s simultaneously, such as logging to the console, sending a webhook, or invoking custom handlers, allowing for flexible and robust monitoring strategies [Source 1].

## Architecture

The Notifier System is built around a central interface and several concrete implementations that handle the routing and delivery of notifications [Source 1].

### Core Components

*   **`Notification`**: A data structure representing a single notification event. It includes a `type` (e.g., "completed", "failed"), a `title`, a `message`, a timestamp, and optional `metadata` for additional context like agent ID, cost, or duration [Source 1].
*   **`NotificationChannel`**: The primary interface that defines the contract for any notification delivery mechanism. It requires a `notify` method to send a notification and an optional `destroy` method for cleanup. Implementations of this interface are expected to handle errors gracefully without throwing exceptions [Source 1].
*   **`CompositeNotifier`**: An implementation of `NotificationChannel` that acts as a fan-out mechanism. It holds a collection of other `NotificationChannel` instances and forwards any incoming notification to all of them. It is designed to be resilient; an error in one Channel does not prevent notifications from being sent to the others [Source 1].
*   **`BufferNotifier`**: A specialized `NotificationChannel` implementation that stores notifications in an in-[Memory](../concepts/memory.md) buffer instead of sending them immediately. This is primarily useful for testing scenarios or for applications that require batch processing of notifications [Source 1].

The system also supports other concrete channel implementations, such as `ConsoleNotifier`, `WebhookNotifier`, and custom `CallbackNotifier` instances, as demonstrated in usage examples [Source 1].

## Integration Points

The Notifier System is designed to integrate with other parts of the YAAF framework, particularly the plugin and orchestration systems.

The key integration mechanism is the `notificationAdapterFromChannel` function. This utility function wraps any object that implements the `NotificationChannel` interface and converts it into a `NotificationAdapter` plugin. This allows a configured notifier to be registered with an agent's `PluginHost` [Source 1].

By bridging the Notifier System with the [Plugin System](./plugin-system.md), notifications from various high-level framework components can be funneled through the same set of channels. This includes:
*   Briefings from the `Vigil` monitoring system.
*   Lifecycle events from an `AgentOrchestrator` (e.g., `agent:completed`).
*   Critical alerts from the `SecurityAuditLog` [Source 1].

## Key APIs

*   **`Notification`**: The type definition for a notification object.
*   **`NotificationChannel`**: The interface that custom notification channels must implement.
*   **`CompositeNotifier`**: A class for combining multiple `NotificationChannel` instances into a single channel.
*   **`BufferNotifier`**: A class for buffering notifications in memory, useful for testing.
*   **`notificationAdapterFromChannel(name, channel)`**: A function that converts a `NotificationChannel` into a YAAF plugin for seamless integration with the agent's plugin host [Source 1].

## Configuration

Configuration of the Notifier System is typically done programmatically during application setup. Developers instantiate one or more `NotificationChannel` implementations and combine them using the `CompositeNotifier` [Source 1].

```typescript
// Example of programmatic configuration
const notifier = new CompositeNotifier([
  new ConsoleNotifier(),
  new WebhookNotifier('https://hooks.slack.com/...'),
]);

// Wire into an orchestrator's lifecycle events
orchestrator.on('agent:completed', (agentId, result) => {
  notifier.notify({
    type: 'completed',
    title: `Agent ${agentId} finished`,
    message: result.summary,
  });
});
```
This configured `notifier` instance can then be passed to other systems or adapted into a plugin using `notificationAdapterFromChannel` [Source 1].

## Extension Points

The primary extension point for the Notifier System is the creation of custom notification channels. Developers can implement the `NotificationChannel` interface to integrate with any third-party service or internal system, such as email services, SMS gateways, or custom databases [Source 1].

```typescript
// Example of a custom channel using a callback
const customEmailNotifier = new CallbackNotifier(async (notification) => {
  await sendEmail(notification.title, notification.message);
});

// This custom notifier can then be used within a CompositeNotifier
const notifier = new CompositeNotifier([
  new ConsoleNotifier(),
  customEmailNotifier,
]);
```
This pattern allows developers to extend the framework's notification capabilities to suit their specific operational needs [Source 1].

## Sources

[Source 1] `src/utils/notifier.ts`