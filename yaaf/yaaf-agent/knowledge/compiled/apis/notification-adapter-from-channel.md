---
summary: A factory function that wraps a NotificationChannel into a NotificationAdapter plugin for use with the YAAF plugin system.
export_name: notificationAdapterFromChannel
source_file: src/utils/notifier.ts
category: function
title: notificationAdapterFromChannel
entity_type: api
stub: false
compiled_at: 2026-04-16T14:40:01.018Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/utils/notifier.ts
confidence: 1
---

## Overview
The `notificationAdapterFromChannel` function is a utility factory designed to bridge the YAAF notification utility system with the framework's plugin architecture. It converts a standard `NotificationChannel` into a `NotificationAdapter` plugin, allowing it to be registered with an agent's `PluginHost`.

This adapter ensures that notifications from disparate sources—such as lifecycle events from an orchestrator, critical alerts from a security audit log, or health summaries—are routed through the same delivery mechanism.

## Signature / Constructor

```typescript
function notificationAdapterFromChannel(
  name: string,
  channel: NotificationChannel,
): NotificationAdapter
```

### Parameters
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `name` | `string` | A unique identifier for the resulting plugin instance. |
| `channel` | `NotificationChannel` | An object implementing the `NotificationChannel` interface (e.g., a console logger, webhook client, or composite notifier). |

### Return Value
Returns a `NotificationAdapter` object compatible with the YAAF plugin system.

## Examples

### Wrapping a Custom Channel
This example demonstrates creating a simple custom channel and converting it into a plugin.

```typescript
import { 
  notificationAdapterFromChannel, 
  NotificationChannel, 
  Notification 
} from 'yaaf/utils/notifier';

// Define a custom delivery mechanism
const emailChannel: NotificationChannel = {
  async notify(notification: Notification) {
    // Logic to send email
    console.log(`Sending email: ${notification.title}`);
  }
};

// Convert the channel into a YAAF plugin
const emailPlugin = notificationAdapterFromChannel(
  'email-notifier-plugin',
  emailChannel
);

// The resulting plugin can be registered with an agent or orchestrator
// agent.registerPlugin(emailPlugin);
```

### Using with CompositeNotifier
You can wrap multiple channels into a single plugin using the `CompositeNotifier`.

```typescript
import { 
  notificationAdapterFromChannel, 
  CompositeNotifier, 
  NotificationChannel 
} from 'yaaf/utils/notifier';

const composite = new CompositeNotifier([
  new ConsoleNotifier(),
  new WebhookNotifier('https://hooks.slack.com/services/...')
]);

const notificationPlugin = notificationAdapterFromChannel(
  'multi-channel-notifier',
  composite
);
```