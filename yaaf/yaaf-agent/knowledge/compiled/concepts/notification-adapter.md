---
summary: An adapter interface that allows a NotificationChannel to be integrated into the YAAF plugin system, enabling custom notification delivery via plugins.
title: NotificationAdapter
entity_type: concept
related_subsystems:
 - Plugin System
see_also:
 - "[notificationAdapterFromChannel](../apis/notification-adapter-from-channel.md)"
 - "[NotificationChannel](../apis/notification-channel.md)"
 - "[Plugin System](../subsystems/plugin-system.md)"
search_terms:
 - agent notifications
 - how to send alerts from agent
 - custom notification channel
 - plugin for notifications
 - YAAF alerts
 - agent lifecycle events
 - connect notifier to plugin
 - WebhookNotifier plugin
 - ConsoleNotifier plugin
 - bridging notifier and plugins
 - NotificationChannel adapter
 - agent completion alerts
stub: false
compiled_at: 2026-04-25T00:22:06.579Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/notifier.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

A `NotificationAdapter` is a specific type of plugin capability in YAAF that acts as a bridge between the framework's notification utilities and the [Plugin System](../subsystems/plugin-system.md) [Source 1]. It implements the adapter design pattern to allow any object conforming to the [NotificationChannel](../apis/notification-channel.md) interface to be registered and used as a standard YAAF plugin.

The primary problem this concept solves is the decoupling of notification generation from notification delivery. Various core components within YAAF, such as the `AgentOrchestrator` for lifecycle events or the `SecurityAuditLog` for critical alerts, need to send notifications. Instead of hardcoding delivery mechanisms like webhooks or console logs into these components, they emit generic notifications. The `NotificationAdapter` allows developers to create plugins that listen for these notifications and deliver them via any desired medium (e.g., Slack, email, SMS) without modifying the core framework [Source 1].

## How It Works in YAAF

The mechanism relies on two key interfaces: `Notification` and [NotificationChannel](../apis/notification-channel.md). A `Notification` is a data structure containing a type (e.g., `completed`, `failed`), title, message, and optional metadata [Source 1]. A [NotificationChannel](../apis/notification-channel.md) is a simple interface with a single `notify` method that accepts a `Notification` object and is responsible for its delivery [Source 1].

The `NotificationAdapter` is a plugin-compatible wrapper around a [NotificationChannel](../apis/notification-channel.md). The most common way to create one is by using the `[[notificationAdapterFromChannel]]` utility function. This function takes a name and an instance of a [NotificationChannel](../apis/notification-channel.md) (such as `ConsoleNotifier` or a custom `WebhookNotifier`) and returns a `NotificationAdapter` object that can be registered with an agent's plugin host [Source 1].

Once a `NotificationAdapter` plugin is registered, it becomes available to any part of the system that needs to send notifications. This creates a unified pipeline, ensuring that events from disparate sources—such as agent completion, task failure, or security warnings—are all routed through the same user-configured notification channels [Source 1].

## Configuration

A developer typically configures a `NotificationAdapter` by first instantiating a desired [NotificationChannel](../apis/notification-channel.md) and then wrapping it using the `[[notificationAdapterFromChannel]]` function. The resulting adapter is then included in the agent's plugin configuration.

```typescript
import { WebhookNotifier } from './notifiers'; // A custom or library-provided notifier
import { notificationAdapterFromChannel } from 'yaaf/utils';
import { Agent } from 'yaaf/core';

// 1. Instantiate a specific notification channel.
const slackNotifier = new WebhookNotifier('https://hooks.slack.com/...');

// 2. Wrap the channel in a NotificationAdapter using the utility function.
const slackPlugin = notificationAdapterFromChannel(
  'slack-webhook-notifier',
  slackNotifier,
);

// 3. Register the adapter as a plugin with an agent.
const agent = new Agent({
  name: 'MyAgent',
  plugins: [
    slackPlugin,
    // ... other plugins
  ],
});

// Now, when the agent's lifecycle emits a 'completed' or 'failed' event,
// the notification will be sent to the configured Slack webhook.
```

## Sources

[Source 1]: src/utils/notifier.ts