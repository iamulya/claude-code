---
summary: An interface for implementing notification delivery channels like console, webhooks, or email.
export_name: NotificationChannel
source_file: src/utils/notifier.ts
category: interface
title: NotificationChannel
entity_type: api
stub: false
compiled_at: 2026-04-16T14:39:58.106Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/utils/notifier.ts
confidence: 1
---

## Overview
`NotificationChannel` is a core interface in the YAAF lifecycle notification system. It defines a standard contract for delivering messages to users or external systems when agents finish tasks, encounter failures, or require manual intervention. 

The framework uses this interface to provide a provider-agnostic way of handling alerts. Implementations can range from simple console logging to complex integrations like Slack webhooks, email services, or persistent databases. Multiple channels can be managed simultaneously using a composite pattern, and channels can be adapted into the YAAF plugin system to capture security audits and orchestrator events.

## Signature / Constructor

```typescript
export interface NotificationChannel {
  /** Send a notification. Should not throw — errors are logged and swallowed. */
  notify(notification: Notification): Promise<void>
  /** Optional cleanup. */
  destroy?(): Promise<void>
}

export type Notification = {
  type: NotificationType
  title: string
  message: string
  /** Optional metadata (agent ID, cost, duration, etc.) */
  metadata?: Record<string, unknown>
  /** Timestamp (auto-set if omitted) */
  timestamp?: string
}

export type NotificationType = 
  | 'completed' 
  | 'failed' 
  | 'needs_attention' 
  | 'warning' 
  | 'info'
```

## Methods & Properties

### notify()
`notify(notification: Notification): Promise<void>`
The primary method for delivering a message. Implementations are expected to handle their own internal errors; the framework's notification logic typically swallows errors from this method to prevent notification failures from crashing the agent runtime.

### destroy()
`destroy?(): Promise<void>`
An optional lifecycle method used for cleaning up resources, such as closing network connections, flushing buffers, or clearing timers.

## Examples

### Implementing a Custom Channel
This example demonstrates a basic implementation that sends notifications via a hypothetical email service.

```typescript
import { NotificationChannel, Notification } from 'yaaf';

class EmailNotifier implements NotificationChannel {
  async notify(notification: Notification): Promise<void> {
    await sendEmail({
      subject: `[${notification.type.toUpperCase()}] ${notification.title}`,
      body: notification.message,
      data: notification.metadata
    });
  }
}
```

### Using Composite and Buffer Notifiers
The framework provides built-in implementations like `CompositeNotifier` to fan out messages to multiple destinations.

```typescript
import { CompositeNotifier, BufferNotifier, NotificationChannel } from 'yaaf';

const notifier = new CompositeNotifier([
  new ConsoleNotifier(),
  new BufferNotifier(), // Useful for testing or batching
]);

// Example usage within an application
await notifier.notify({
  type: 'completed',
  title: 'Data Processing Complete',
  message: 'The agent has successfully processed 500 records.',
  metadata: { duration: '45s', records: 500 }
});
```

### Adapting to the Plugin System
Channels can be converted into plugins using the `notificationAdapterFromChannel` utility, allowing them to be registered with an agent's `PluginHost`.

```typescript
import { notificationAdapterFromChannel } from 'yaaf';

const slackChannel = new WebhookNotifier('https://hooks.slack.com/services/...');
const plugin = notificationAdapterFromChannel('slack-notifications', slackChannel);

// The plugin can now be registered with an agent or orchestrator
agent.registerPlugin(plugin);
```