---
summary: The process of selectively processing or ignoring inbound messages based on defined criteria before they reach the agent.
title: Message Filtering
entity_type: concept
related_subsystems:
 - Gateway
search_terms:
 - ignore messages
 - process only certain messages
 - how to respond to mentions
 - group chat filtering
 - inbound message rules
 - message pre-processing
 - gateway message filter
 - conditional message handling
 - prevent agent from responding
 - allowlist messages
 - block messages
 - selective agent activation
stub: false
compiled_at: 2026-04-24T17:58:40.370Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/gateway/channel.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

Message Filtering is a mechanism within YAAF's Gateway subsystem that allows developers to programmatically decide whether an incoming message should be processed by an agent or silently ignored. This is crucial for controlling an agent's behavior in noisy environments like group chats or public Channels.

The primary problem solved by message filtering is preventing the agent from responding to every message it sees. For example, in a multi-user chat, an agent should typically only activate [when](../apis/when.md) it is directly addressed (e.g., via a mention). Filtering provides a hook to implement this logic, reducing unnecessary [LLM](./llm.md) invocations, lowering operational costs, and making the agent's presence less intrusive.

## How It Works in YAAF

Message filtering is a configurable feature of the Gateway, which is responsible for routing messages from various Channels to an agent [Source 1]. The logic is defined by providing a `messageFilter` function within the `GatewayConfig` object during setup [Source 1].

This function receives the full `InboundMessage` object for every message that arrives through any of the gateway's configured [Channel](../apis/channel.md)s. It must return a boolean value:
*   **`true`**: The message is considered valid and is passed along for further processing by the agent.
*   **`false`**: The message is discarded, and the processing pipeline for that message is terminated [Source 1].

If no `messageFilter` function is provided in the configuration, the gateway defaults to processing all inbound messages [Source 1]. The source material notes that common use cases for filtering include responding only to mentions in group chats or implementing allowlists for direct messages [Source 1].

## Configuration

A developer enables message filtering by setting the `messageFilter` property in the `GatewayConfig` object. The value should be a function that implements the desired filtering logic.

The following example demonstrates how to configure a gateway to only process messages that explicitly mention the agent by name.

```typescript
import { GatewayConfig, InboundMessage, Agent, Channel } from 'yaaf';

// Assume 'myAgent' and 'myChannels' are already defined
declare const myAgent: Agent;
declare const myChannels: Channel[];

const gatewayConfig: GatewayConfig = {
  agent: myAgent,
  channels: myChannels,

  /**
   * Filter inbound messages.
   * This example function checks if the message text starts with '@my-agent'.
   * If it does, the function returns true, and the Gateway processes the message.
   * Otherwise, it returns false, and the Gateway ignores the message.
   */
  messageFilter: (message: InboundMessage): boolean => {
    // In a real application, this logic could be more complex,
    // checking user IDs, channel types, etc.
    if (message.text.trim().startsWith('@my-agent')) {
      return true; // Process this message
    }
    return false; // Ignore all other messages
  },
};

// The Gateway would then be instantiated with this configuration.
```

## Sources

[Source 1]: src/gateway/channel.ts