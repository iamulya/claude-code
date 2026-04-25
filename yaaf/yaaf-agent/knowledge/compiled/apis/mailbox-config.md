---
export_name: MailboxConfig
source_file: src/agents/mailbox.ts
category: type
summary: Configuration options for initializing the Mailbox system.
title: MailboxConfig
entity_type: api
search_terms:
 - mailbox setup
 - agent communication config
 - file-based IPC settings
 - baseDir for agents
 - team mailbox directory
 - message polling interval
 - configure agent inbox
 - YAAF mailbox options
 - inter-agent communication setup
 - defaultTeam setting
 - pollIntervalMs property
 - how to configure Mailbox class
stub: false
compiled_at: 2026-04-24T17:20:12.619Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/mailbox.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`MailboxConfig` is a TypeScript type alias for the configuration object required [when](./when.md) initializing the `Mailbox` class [Source 1]. It specifies the essential settings for the file-based [Inter-Process Communication](../concepts/inter-process-communication.md) (IPC) system that enables agents to communicate with each other.

This configuration defines the root directory for storing message files, an optional default team name for operations, and the frequency at which agents poll their inboxes for new messages [Source 1].

## Signature

`MailboxConfig` is a type alias for an object with the following properties:

```typescript
export type MailboxConfig = {
  /** Base directory for all team mailboxes */
  baseDir: string;
  /** Default team name (used when team isn't specified) */
  defaultTeam?: string;
  /** Polling interval in ms (default: 500) */
  pollIntervalMs?: number;
};
```
[Source 1]

### Properties

- **`baseDir`**: `string` (required)
  The absolute or relative path to the root directory where all team and agent mailboxes will be created. Each agent's inbox will be located at a path like `{baseDir}/{teamName}/inboxes/{agentName}.json` [Source 1].

- **`defaultTeam`**: `string` (optional)
  The name of the team to use for mailbox operations (like `send` or `readUnread`) when a specific team name is not provided in the method call [Source 1].

- **`pollIntervalMs`**: `number` (optional)
  The interval, in milliseconds, at which an agent's mailbox should be polled for new messages. If not specified, it defaults to 500ms [Source 1].

## Examples

The following example demonstrates how to create a `MailboxConfig` object and use it to instantiate the `Mailbox` class.

```typescript
import { Mailbox, MailboxConfig } from 'yaaf';

// Define the configuration for the mailbox system.
const mailboxConfig: MailboxConfig = {
  baseDir: '/var/tmp/agent-swarms',
  defaultTeam: 'research-team',
  pollIntervalMs: 1000, // Poll for new messages every second.
};

// Initialize the Mailbox service with the specified configuration.
const mailbox = new Mailbox(mailboxConfig);

// Any operations on this mailbox instance will now use the configured settings.
// For example, sending a message without specifying a team will use 'research-team'.
await mailbox.send('data-analyst', {
  from: 'lead-researcher',
  text: 'Please analyze the latest dataset.',
  timestamp: new Date().toISOString(),
  read: false,
});
```

## Sources

[Source 1]: src/agents/mailbox.ts