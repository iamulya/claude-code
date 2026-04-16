---
summary: A notification channel implementation that fans out notifications to multiple underlying channels simultaneously.
export_name: CompositeNotifier
source_file: src/utils/notifier.ts
category: class
title: CompositeNotifier
entity_type: api
stub: false
compiled_at: 2026-04-16T14:39:54.345Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/utils/notifier.ts
confidence: 1
---

## Overview
`CompositeNotifier` is a utility class used to distribute lifecycle notifications to multiple destinations at once. It implements the `NotificationChannel` interface and acts as a dispatcher, ensuring that a single notification event (such as an agent completion or failure) is delivered to all registered sub-channels, such as console logs, webhooks, or custom email adapters.

The implementation is designed for resilience; errors occurring within one notification channel do not prevent other channels from receiving the notification.

## Signature / Constructor

```typescript
export class CompositeNotifier implements NotificationChannel {
  constructor(channels: NotificationChannel[])
}
```

### Parameters
- `channels`: An array of objects implementing the `NotificationChannel` interface.

## Methods & Properties

### notify()
Delivers a notification object to all channels registered in the constructor.

```typescript
notify(notification: Notification): Promise<void>
```

- **Parameters**: 
    - `notification`: A `Notification` object containing the `type`, `title`, `message`, and optional `metadata` or `timestamp`.
- **Behavior**: This method iterates through all internal channels and calls their respective `notify` methods. It is designed not to throw; errors from individual channels are typically logged and swallowed to ensure the stability of the calling process.

### destroy()
Performs cleanup for all underlying channels that implement a `destroy` method.

```typescript
destroy?(): Promise<void>
```

## Examples

### Basic Multi-Channel Setup
This example demonstrates how to combine a console logger and a webhook into a single notifier for use with an orchestrator.

```typescript
import { CompositeNotifier, ConsoleNotifier, WebhookNotifier } from 'yaaf';

const notifier = new CompositeNotifier([
  new ConsoleNotifier(),
  new WebhookNotifier('https://hooks.slack.com/services/...'),
]);

// Wire into an orchestrator's lifecycle events
orchestrator.on('agent:completed', (agentId, result) => {
  notifier.notify({
    type: 'completed',
    title: `Agent ${agentId} finished`,
    message: result.summary,
    metadata: { agentId, duration: result.duration }
  });
});
```

### Using with Custom Callbacks
You can mix standard channels with custom logic using a `CallbackNotifier`.

```typescript
const notifier = new CompositeNotifier([
  new ConsoleNotifier(),
  new CallbackNotifier(async (notif) => {
    console.log(`Custom processing for: ${notif.title}`);
  }),
]);

await notifier.notify({
  type: 'info',
  title: 'System Update',
  message: 'All agents are online.'
});
```

## See Also
- `NotificationChannel`
- `Notification`
- `notificationAdapterFromChannel`