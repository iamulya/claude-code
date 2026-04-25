---
title: SlackChannel
summary: The `SlackChannel` class integrates a YAAF agent with Slack via its Web API and Events API.
export_name: SlackChannel
source_file: src/gateway.ts
category: class
entity_type: api
search_terms:
 - slack integration
 - connect agent to slack
 - slack bot framework
 - yaaf slack channel
 - slack web api
 - slack events api
 - messaging platform adapter
 - how to use slack with yaaf
 - agent slack gateway
 - interactive slack approvals
 - chatops with yaaf
 - slack transport
stub: false
compiled_at: 2026-04-25T00:14:15.391Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/gateway.md
compiled_from_quality: documentation
confidence: 0.9
---

## Overview

The `SlackChannel` class is a built-in transport adapter that connects a YAAF [Agent](./agent.md) to the Slack messaging platform. It functions as a component within the [Gateway](./gateway.md) subsystem, handling the two-way communication between a user in a Slack workspace and the agent [Source 1].

`SlackChannel` utilizes Slack's Web API for sending messages and its Events API for receiving them. This allows the agent to listen for user messages in channels or direct messages and send responses back to the same context [Source 1].

In addition to basic messaging, `SlackChannel` is suitable for more complex interactive workflows, such as handling security-sensitive operations through the [ApprovalManager](./approval-manager.md) [Source 1].

## Signature / Constructor

`SlackChannel` is a class that extends the base [Channel](./channel.md) class. While the source material does not provide its specific constructor signature, it is instantiated and passed to the [Gateway](./gateway.md)'s `channels` array during setup [Source 1].

```typescript
import { Gateway, SlackChannel } from 'yaaf/gateway';
import { Agent } from 'yaaf';

// The agent to be connected
declare const myAgent: Agent;

// Configuration for SlackChannel is required, but not detailed in the source.
// This typically includes API tokens and signing secrets.
const slackChannel = new SlackChannel({
  /* ...slack-specific configuration... */
});

const gateway = new Gateway({
  agent: myAgent,
  channels: [slackChannel],
});
```

## Examples

### Basic Gateway Integration

This example demonstrates how to configure a [Gateway](./gateway.md) to use `SlackChannel` to serve an agent on Slack [Source 1].

```typescript
import { Gateway, SlackChannel } from 'yaaf/gateway';
import { Agent } from 'yaaf';

// Assume myAgent is a fully configured YAAF Agent instance
declare const myAgent: Agent;

// Instantiate the SlackChannel with necessary credentials (e.g., from environment variables)
const slackChannel = new SlackChannel({
  // Specific configuration options like tokens are required by the Slack API
  // but are not detailed in the provided source material.
});

// Create a Gateway to manage the connection
const gateway = new Gateway({
  agent: myAgent,
  channels: [slackChannel],
});

// Start the gateway to begin listening for Slack events
async function startApp() {
  await gateway.start();
  console.log('YAAF Agent is running on Slack.');
}

startApp();
```

### Interactive Approvals

`SlackChannel` can be used with [ApprovalManager](./approval-manager.md) to create interactive approval flows for potentially dangerous operations directly within Slack [Source 1].

```typescript
import { ApprovalManager } from 'yaaf/gateway';
import { SlackChannel } from 'yaaf/gateway';

// Assume slackChannel is an initialized SlackChannel instance
declare const slackChannel: SlackChannel;

// Create an ApprovalManager that uses the Slack channel for communication
const approvals = new ApprovalManager({
  channel: slackChannel,
  timeout: 300_000, // 5-minute timeout for approval requests
});

// Example usage within a permission policy
// This function would be called before executing a sensitive tool.
async function requestApproval(toolName: string, args: any, reason: string) {
  return approvals.request({
    tool: toolName,
    arguments: args,
    reason,
    approvers: ['U012AB3CDE'], // Slack User ID of an admin
  });
}
```

## See Also

- [Gateway](./gateway.md): The main subsystem that manages and runs channels.
- [Channel](./channel.md): The base class that `SlackChannel` extends.
- [ApprovalManager](./approval-manager.md): A utility for creating interactive approval flows, often used with `SlackChannel`.
- [Agent](./agent.md): The core entity that the `SlackChannel` connects to users.

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/gateway.md