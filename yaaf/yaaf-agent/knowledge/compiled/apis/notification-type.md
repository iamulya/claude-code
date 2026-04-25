---
title: NotificationType
summary: Defines the categorical types of notifications that can be generated and processed by the YAAF Notifier System.
export_name: NotificationType
source_file: src/utils/notifier.ts
category: type
entity_type: api
search_terms:
 - notification categories
 - agent status types
 - completed notification
 - failed notification
 - needs attention notification
 - warning notification
 - info notification
 - notifier system events
 - agent lifecycle alerts
 - types of alerts
 - Notification object type field
 - what are the possible notification types
stub: false
compiled_at: 2026-04-24T17:23:21.963Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/notifier.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

`[[[[[[[[Notification]]]]]]]]Type` is a string literal type that defines the set of possible categories for a Notification within the YAAF [Notifier System](../subsystems/notifier-system.md) [Source 1]. It is used as the `type` property of the `Notification` object to classify the nature of the alert, allowing different [Channel](./channel.md)s or handlers to process notifications based on their severity or purpose.

The available notification types are [Source 1]:
- `completed`: Indicates that an agent or task has finished successfully.
- `failed`: Indicates that an agent or task has terminated with an error.
- `needs_attention`: Signals that an agent requires user input or manual intervention to proceed.
- `warning`: Used for non-critical issues or potential problems that do not halt execution.
- `info`: For general informational messages about an agent's progress or status.

This type is a fundamental part of the `Notification` data structure, which is passed to `NotificationChannel` implementations like `CompositeNotifier` or `BufferNotifier` [Source 1].

## Signature

`NotificationType` is defined as a union of string literals [Source 1].

```typescript
export type NotificationType = "completed" | "failed" | "needs_attention" | "warning" | "info";
```

## Examples

The most common use of `NotificationType` is [when](./when.md) creating a `Notification` object to be sent through a notifier Channel. The following example shows how it might be used within an event handler for an agent orchestrator [Source 1].

```typescript
import { Notification, NotificationType } from 'yaaf';

// Assume 'notifier' is an instance of a NotificationChannel
// and 'orchestrator' is an agent orchestrator instance.

orchestrator.on('agent:completed', (agentId, result) => {
  const notification: Notification = {
    type: 'completed', // Using one of the NotificationType values
    title: `Agent ${agentId} finished`,
    message: result.summary,
    metadata: {
      agentId: agentId,
      result: result,
    }
  };
  
  notifier.notify(notification);
});

orchestrator.on('agent:failed', (agentId, error) => {
  const notification: Notification = {
    type: 'failed', // Using a different NotificationType value
    title: `Agent ${agentId} failed`,
    message: error.message,
    metadata: {
      agentId: agentId,
      error: error,
    }
  };
  
  notifier.notify(notification);
});
```

## See Also

- `Notification`: The data structure that uses `NotificationType`.
- `NotificationChannel`: The interface for notification delivery channels.
- `CompositeNotifier`: A class that fans out notifications to multiple channels.
- `notificationAdapterFromChannel`: A function to bridge the notifier system with the [Plugin System](../subsystems/plugin-system.md).

## Sources

[Source 1]: src/utils/notifier.ts