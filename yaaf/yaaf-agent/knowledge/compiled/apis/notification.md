---
title: Notification
summary: Represents a structured notification message, including its type, title, message, optional metadata, and timestamp.
export_name: Notification
source_file: src/utils/notifier.ts
category: type
entity_type: api
search_terms:
 - agent lifecycle events
 - structured agent message
 - notification data structure
 - agent completion message
 - agent failure alert
 - user attention required
 - notification metadata
 - agent status update
 - info message format
 - warning message format
 - notification channel payload
stub: false
compiled_at: 2026-04-24T17:23:06.115Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/notifier.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

The `Notification` type defines the standardized data structure for all notification messages within the YAAF framework [Source 1]. It is used to convey information about an agent's lifecycle events, such as completion, failure, or the need for user intervention.

This structured format ensures that different notification channels (like console logs, webhooks, or email) receive consistent and comprehensive information. Any component that sends notifications, such as an `AgentOrchestrator` or a plugin, will construct an object of this type to be processed by a `NotificationChannel` [Source 1].

## Signature

`Notification` is a TypeScript type alias with the following structure [Source 1]:

```typescript
export type NotificationType = "completed" | "failed" | "needs_attention" | "warning" | "info";

export type Notification = {
  /**
   * The category of the notification.
   */
  type: NotificationType;

  /**
   * A brief, human-readable title for the notification.
   */
  title: string;

  /**
   * The main content or body of the notification message.
   */
  message: string;

  /**
   * Optional metadata for including structured data like agent ID,
   * execution cost, duration, etc.
   */
  metadata?: Record<string, unknown>;

  /**
   * An ISO 8601 timestamp string. If omitted when creating the notification,
   * it is typically set automatically by the notification channel.
   */
  timestamp?: string;
};
```

## Examples

### Agent Completion Notification

A minimal notification for a successfully completed agent task.

```typescript
import { Notification } from 'yaaf';

const completionNotice: Notification = {
  type: 'completed',
  title: 'Agent "Data-Analyzer-01" Finished',
  message: 'The data analysis task completed successfully in 45.2 seconds.',
  metadata: {
    agentId: 'Data-Analyzer-01',
    durationSeconds: 45.2,
    costUSD: 0.012,
  },
};
```

### Agent Failure Notification

A notification for a failed agent run, including error details in the metadata.

```typescript
import { Notification } from 'yaaf';

const failureNotice: Notification = {
  type: 'failed',
  title: 'Critical Failure: Agent "Invoice-Processor-42"',
  message: 'The agent failed to process an invoice due to an API error.',
  metadata: {
    agentId: 'Invoice-Processor-42',
    errorCode: 'API_UNAVAILABLE',
    attempt: 3,
    invoiceId: 'INV-2023-987',
  },
};
```

### User Attention Required

A notification indicating that an agent is paused and requires human input to proceed.

```typescript
import { Notification } from 'yaaf';

const attentionNotice: Notification = {
  type: 'needs_attention',
  title: 'Action Required: Agent "Onboarding-Assistant"',
  message: 'The agent requires approval to create a new user account for "jane.doe@example.com".',
  metadata: {
    agentId: 'Onboarding-Assistant',
    approvalStep: 'createUserAccount',
  },
};
```

## See Also

*   `NotificationChannel`: The interface that consumers of `Notification` objects implement.
*   `CompositeNotifier`: A class that fans out a single `Notification` to multiple channels.
*   `notificationAdapterFromChannel`: A function to bridge the notification system with the agent [Plugin System](../subsystems/plugin-system.md).

## Sources

*   [Source 1]: `src/utils/notifier.ts`