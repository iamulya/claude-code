---
title: notificationAdapterFromChannel
summary: A factory function that converts any NotificationChannel implementation into a NotificationAdapter plugin, enabling seamless integration with the YAAF plugin system.
export_name: notificationAdapterFromChannel
source_file: src/utils/notifier.ts
category: function
entity_type: api
search_terms:
 - convert notification channel to plugin
 - create notification adapter
 - bridge notifier and plugin system
 - how to use custom notifiers with agents
 - agent lifecycle notifications
 - Vigil.brief() notifications
 - SecurityAuditLog alerts
 - AgentOrchestrator events
 - plugin for notifications
 - NotificationChannel to NotificationAdapter
 - YAAF notification system
 - integrate custom alerts
stub: false
compiled_at: 2026-04-24T17:23:16.047Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/notifier.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

The `[[[[[[[[Notification]]]]]]]]AdapterFrom[[[[[[[[Channel]]]]]]]]` function is a factory that serves as a bridge between YAAF's standalone Notification [Utilities](../subsystems/utilities.md) and its core [Plugin System](../subsystems/plugin-system.md) [Source 1]. It takes any object that conforms to the `NotificationChannel` interface and wraps it in a `NotificationAdapter` plugin.

This allows developers to create custom notification logic (e.g., sending emails, Slack messages, or logging to a specific service) and seamlessly integrate it into an agent's lifecycle. Once registered as a plugin, various YAAF subsystems can use this Channel to deliver important alerts and status updates. According to the source, this includes lifecycle events from an `AgentOrchestrator`, critical alerts from a `SecurityAuditLog`, and ad-hoc messages sent via `Vigil.brief()` [Source 1].

## Signature

The function takes a name for the plugin and an instance of a `NotificationChannel` and returns a `NotificationAdapter` plugin.

```typescript
export function notificationAdapterFromChannel(
  name: string,
  channel: NotificationChannel,
): NotificationAdapter;
```

**Parameters:**

*   `name` (string): A unique identifier for the resulting plugin.
*   `channel` (`NotificationChannel`): An object that implements the `NotificationChannel` interface.

### Supporting Types

The `channel` parameter must conform to the `NotificationChannel` interface, which is defined as follows [Source 1]:

```typescript
/**
 * A notification channel delivers notifications to users via some medium.
 */
export interface NotificationChannel {
  /** Send a notification. Should not throw — errors are logged and swallowed. */
  notify(notification: Notification): Promise<void>;
  /** Optional cleanup. */
  destroy?(): Promise<void>;
}
```

The `notify` method receives a `Notification` object with the following structure [Source 1]:

```typescript
export type NotificationType = "completed" | "failed" | "needs_attention" | "warning" | "info";

export type Notification = {
  type: NotificationType;
  title: string;
  message: string;
  /** Optional metadata (agent ID, cost, duration, etc.) */
  metadata?: Record<string, unknown>;
  /** Timestamp (auto-set if omitted) */
  timestamp?: string;
};
```

## Examples

This example demonstrates how to create a custom `NotificationChannel` that logs to the console and then convert it into a plugin for use with a YAAF agent.

```typescript
import { 
  notificationAdapterFromChannel, 
  NotificationChannel, 
  Notification 
} from 'yaaf';

// Assume Agent and PluginHost are also available from 'yaaf'
// import { Agent } from 'yaaf';

// 1. Define a custom notification channel implementation.
//    In a real application, this might send an email or a webhook.
class ConsoleLogChannel implements NotificationChannel {
  async notify(notification: Notification): Promise<void> {
    const meta = notification.metadata ? JSON.stringify(notification.metadata) : '';
    console.log(
      `[${notification.type.toUpperCase()}] ${notification.title}: ${notification.message} ${meta}`
    );
  }
}

const myChannel = new ConsoleLogChannel();

// 2. Use the factory to convert the channel into a NotificationAdapter plugin.
const consoleNotifierPlugin = notificationAdapterFromChannel(
  'console-notifier',
  myChannel
);

// 3. Register the plugin with an agent.
// const agent = new Agent({
//   // ... other agent configuration
//   plugins: [consoleNotifierPlugin],
// });

// Now, any part of the agent's ecosystem that sends notifications
// will have them routed through the ConsoleLogChannel.
```

## Sources

[Source 1] src/utils/notifier.ts