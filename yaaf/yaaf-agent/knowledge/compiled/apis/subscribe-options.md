---
summary: Configuration options for an IPC message subscription, such as filtering by sender.
category: type
title: SubscribeOptions
entity_type: api
export_name: SubscribeOptions
source_file: src/integrations/inProcessIPC.ts
search_terms:
 - IPC subscription
 - message filtering
 - allowed senders
 - IPC backpressure
 - message handler options
 - ipc adapter subscribe
 - InProcessIPCPlugin options
 - inter-process communication
 - message queue options
 - subscriber configuration
stub: false
compiled_at: 2026-04-25T00:14:46.763Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/inProcessIPC.ts
compiled_from_quality: unknown
confidence: 0.85
---

## Overview

`SubscribeOptions` is a configuration type used when creating a subscription to an agent's inbox via an [IPCAdapter](./ipc-adapter.md). It allows for customizing the behavior of the message handler, primarily for security and flow control.

For example, a subscription can be configured to only accept messages from a specific list of trusted sender agents, providing a layer of capability enforcement at the transport level [Source 1]. Other potential options, inferred from comments in the source code, may relate to backpressure strategies for handling high-volume inboxes [Source 1].

## Signature

The `SubscribeOptions` type is passed as the optional third argument to the `subscribe` method of the [IPCAdapter](./ipc-adapter.md) interface [Source 1].

```typescript
// From the IPCAdapter interface
subscribe(
  inbox: string,
  handler: (msg: IPCMessage) => void,
  options?: SubscribeOptions,
): () => void;
```

The specific definition of the `SubscribeOptions` type is not available in the provided source material. However, comments suggest it may include properties for security and backpressure [Source 1].

## Properties

Based on feature descriptions for the [InProcessIPCPlugin](../plugins/in-process-ipc-plugin.md), `SubscribeOptions` may include the following properties. Note that this is inferred and not a definitive type definition from the source material.

- `allowedSenders`: `string[]`
  - An optional whitelist of agent IDs. If provided, the subscription's handler will only be invoked for messages originating from one of the specified senders. This is used for capability enforcement [Source 1].

## Examples

The following is a hypothetical example demonstrating how `SubscribeOptions` might be used to create a secure subscription that only processes messages from a known set of agents.

```typescript
// Note: This is a hypothetical example as the exact structure of SubscribeOptions
// is not defined in the provided source material.

import { type IPCAdapter, type IPCMessage, type SubscribeOptions } from 'yaaf';

function setupSecureSubscription(ipc: IPCAdapter, agentId: string) {
  // Only accept messages from the system monitor and orchestrator agents.
  const options: SubscribeOptions = {
    allowedSenders: ['agent-system-monitor', 'agent-orchestrator'],
  };

  const inboxName = `${agentId}-inbox`;

  const unsubscribe = ipc.subscribe(
    inboxName,
    (message: IPCMessage) => {
      console.log(`Received trusted message from ${message.from}: ${message.body}`);
      // Process the message...
    },
    options
  );

  console.log(`Listening on inbox "${inboxName}" for trusted senders.`);

  // To stop listening later:
  // unsubscribe();
}
```

## See Also

- [IPCAdapter](./ipc-adapter.md): The interface that defines the `subscribe` method where these options are used.
- [InProcessIPCPlugin](../plugins/in-process-ipc-plugin.md): An implementation of `IPCAdapter` that uses these options for same-process communication.

## Sources

- [Source 1]: `src/integrations/inProcessIPC.ts`