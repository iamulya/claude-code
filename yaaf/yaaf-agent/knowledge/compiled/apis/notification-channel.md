---
title: NotificationChannel
summary: An interface defining the contract for classes that deliver YAAF notifications to users via a specific medium.
export_name: NotificationChannel
source_file: src/utils/notifier.ts
category: interface
entity_type: api
search_terms:
 - how to send notifications
 - agent lifecycle alerts
 - custom notification handler
 - notification medium
 - agent completion alert
 - agent failure notification
 - implementing a notifier
 - notification system contract
 - delivering agent messages
 - webhook notifications
 - console notifications
 - pluggable notification system
 - agent status updates
stub: false
compiled_at: 2026-04-24T17:23:23.626Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/notifier.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

The `[[[[[[[[Notification]]]]]]]][[[[[[[[Channel]]]]]]]]` interface is the core abstraction for YAAF's Notification system. It defines a standard contract for any class that delivers notifications about an agent's lifecycle to a user or external system [Source 1].

This interface enables a pluggable notification architecture. By implementing `NotificationChannel`, developers can create custom delivery mechanisms for various media, such as email, Slack, webhooks, or logging services. These custom Channels can then be used by higher-level [Utilities](../subsystems/utilities.md) like `CompositeNotifier` to broadcast agent events like completion, failure, or warnings [Source 1].

The primary use case for `NotificationChannel` is to create a class that encapsulates the logic for sending a formatted message to a specific destination.

## Signature

`NotificationChannel` is a TypeScript interface with one required method, `notify`, and one optional method, `destroy`. It operates on `Notification` objects [Source 1].

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

export interface NotificationChannel {
  /** Send a notification. Should not throw — errors are logged and swallowed. */
  notify(notification: Notification): Promise<void>;
  /** Optional cleanup. */
  destroy?(): Promise<void>;
}
```

## Methods & Properties

### notify

`(notification: Notification): Promise<void>`

The `notify` method is responsible for sending the notification to the target medium.

- **`notification`**: An object of type `Notification` containing the details of the event to be sent.
- **Returns**: A `Promise<void>` that resolves [when](./when.md) the notification has been sent.

Per the contract, implementations of this method should handle their own errors internally (e.g., with a `try...catch` block) and should not throw exceptions. This ensures that a failure in one Channel does not prevent other channels from processing the notification [Source 1].

### destroy

`?(): Promise<void>`

The optional `destroy` method is used for any necessary cleanup logic when the channel is no longer needed. This could include closing network connections, flushing buffers, or releasing other resources.

- **Returns**: A `Promise<void>` that resolves when cleanup is complete.

## Examples

### Implementing a Custom Notification Channel

The most common use of this interface is to create a custom notification handler. The following example shows a simple channel that logs notifications to the console.

```typescript
import { NotificationChannel, Notification, CompositeNotifier } from 'yaaf';

// 1. Implement the NotificationChannel interface
class ConsoleNotifier implements NotificationChannel {
  async notify(notification: Notification): Promise<void> {
    try {
      const meta = notification.metadata ? `\nMetadata: ${JSON.stringify(notification.metadata)}` : '';
      const output = `
[YAAF Notification - ${notification.type.toUpperCase()}]
Title: ${notification.title}
Message: ${notification.message}${meta}
      `;
      console.log(output);
    } catch (error) {
      // Per the contract, log errors but do not throw
      console.error('ConsoleNotifier failed:', error);
    }
  }
}

// 2. Instantiate and use the custom channel
const consoleChannel = new ConsoleNotifier();

// Can be used standalone...
await consoleChannel.notify({
  type: 'info',
  title: 'Agent Starting',
  message: 'Agent "DataProcessor" has begun execution.',
});

// ...or composed with other channels
const notifier = new CompositeNotifier([
  consoleChannel,
  // new WebhookNotifier('https://hooks.slack.com/...'),
]);

await notifier.notify({
  type: 'completed',
  title: 'Agent "DataProcessor" finished',
  message: 'Successfully processed 1,000 records.',
  metadata: { agentId: 'abc-123', durationMs: 54321 },
});
```

## See Also

- `CompositeNotifier`: A class that fans out notifications to multiple `NotificationChannel` instances simultaneously.
- `BufferNotifier`: An in-[Memory](../concepts/memory.md) `NotificationChannel` implementation useful for testing.
- `notificationAdapterFromChannel`: A function to wrap a `NotificationChannel` as a YAAF plugin.
- `Notification`: The type definition for the data object passed to a channel.

## Sources

[Source 1] src/utils/notifier.ts