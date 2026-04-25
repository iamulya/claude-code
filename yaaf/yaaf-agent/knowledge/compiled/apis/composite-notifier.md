---
title: CompositeNotifier
summary: A concrete implementation of NotificationChannel that dispatches notifications to multiple registered channels simultaneously, handling errors gracefully.
export_name: CompositeNotifier
source_file: src/utils/notifier.ts
category: class
entity_type: api
search_terms:
 - multiple notification channels
 - fan-out notifications
 - aggregate notifiers
 - how to send notifications to console and webhook
 - combine notification channels
 - agent lifecycle alerts
 - error reporting for agents
 - agent completion alerts
 - NotificationChannel implementation
 - dispatching alerts to multiple systems
 - YAAF notification system
 - broadcasting agent events
stub: false
compiled_at: 2026-04-24T16:56:47.252Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/notifier.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

The `CompositeNotifier` class is an implementation of the `[[[[[[[[Notification]]]]]]]]Channel` interface that allows for fanning out Notifications to multiple Notification Channels at once [Source 1]. It acts as a single entry point for sending an alert, which it then broadcasts to an array of registered Channels, such as a console logger, a webhook, or a custom email sender.

A key feature of `CompositeNotifier` is its resilience. Errors that occur within any single notification [Channel](./channel.md) (e.g., a webhook endpoint being down) are logged and swallowed, ensuring that the failure of one channel does not prevent notifications from being sent to the others [Source 1]. This makes it a robust choice for production environments where notifications must be delivered reliably across different systems.

It is commonly used to aggregate different notification mechanisms so that application logic, like an agent orchestrator, only needs to interact with a single notifier instance to alert multiple destinations [Source 1].

## Constructor

The `CompositeNotifier` is instantiated by passing an array of objects that conform to the `NotificationChannel` interface.

```typescript
import { CompositeNotifier, NotificationChannel } from 'yaaf';

export class CompositeNotifier implements NotificationChannel {
  constructor(channels: NotificationChannel[]);
}
```

**Parameters:**

*   `channels` (`NotificationChannel[]`): An array of `NotificationChannel` instances to which notifications will be dispatched.

## Methods & Properties

`CompositeNotifier` implements the `NotificationChannel` interface.

### notify

Sends a notification to all registered channels simultaneously.

```typescript
public async notify(notification: Notification): Promise<void>;
```

**Parameters:**

*   `notification` (`Notification`): The notification object to be sent.

### destroy

Calls the optional `destroy` method on all registered channels that implement it. This is used for cleanup, such as closing network connections.

```typescript
public async destroy?(): Promise<void>;
```

## Examples

The following example demonstrates creating a `CompositeNotifier` to send agent completion events to both the console and a Slack webhook.

```typescript
import { CompositeNotifier, Notification } from 'yaaf';
import { ConsoleNotifier } from './consoleNotifier'; // Assuming these exist
import { WebhookNotifier } from './webhookNotifier'; // Assuming these exist

// 1. Instantiate individual notification channels.
const consoleChannel = new ConsoleNotifier();
const webhookChannel = new WebhookNotifier('https://hooks.slack.com/services/...');

// 2. Create a CompositeNotifier with the desired channels.
const notifier = new CompositeNotifier([
  consoleChannel,
  webhookChannel,
]);

// 3. Use the composite notifier within application logic, like an orchestrator.
// This event handler will now send a notification to both the console and Slack.
orchestrator.on('agent:completed', (agentId, result) => {
  const notification: Notification = {
    type: 'completed',
    title: `Agent ${agentId} finished successfully`,
    message: result.summary,
    metadata: {
      agentId: agentId,
      cost: result.cost,
    }
  };
  notifier.notify(notification);
});
```
[Source 1]

## See Also

*   `NotificationChannel`: The interface that `CompositeNotifier` implements.
*   `Notification`: The data type for notifications sent through channels.
*   `BufferNotifier`: An in-[Memory](../concepts/memory.md) notifier useful for testing.
*   `notificationAdapterFromChannel`: A function to adapt any `NotificationChannel` into a YAAF plugin.

## Sources

*   [Source 1]: `src/utils/notifier.ts`