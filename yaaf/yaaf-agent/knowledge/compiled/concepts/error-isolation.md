---
summary: The architectural principle ensuring that failures in one part of the Gateway system, such as a specific channel, do not disrupt the operation of other parts.
title: Error Isolation
entity_type: concept
related_subsystems:
 - Gateway
search_terms:
 - gateway error handling
 - channel failure
 - preventing cascading failures
 - robust multi-channel agent
 - how does gateway handle errors
 - channel isolation
 - fault tolerance in agents
 - YAAF gateway stability
 - onError handler
 - multi-platform agent errors
 - resilient agent design
 - handling channel disconnects
stub: false
compiled_at: 2026-04-24T17:54:53.098Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/gateway/channel.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

Error Isolation is a core design principle within the YAAF Gateway subsystem. It ensures that an error, exception, or failure originating from a single [Channel](../apis/channel.md) does not cause a cascading failure that affects other active channels or the Gateway itself [Source 1]. This is critical for building production-grade agents that operate across multiple platforms (e.g., Discord, Telegram, Slack). If one platform's connection drops or its API returns an error, the agent must continue to function reliably on all other connected platforms.

The primary goal of Error Isolation is to enhance the stability and fault tolerance of the agent, preventing a localized problem from becoming a system-wide outage.

## How It Works in YAAF

Error Isolation is primarily implemented by the `Gateway` class. The Gateway manages the lifecycle and message processing for all configured channels. It achieves isolation by handling errors that occur within the context of a specific channel and preventing them from propagating to the main application loop [Source 1].

The key mechanism for this is the optional `onError` handler in the `GatewayConfig`. [when](../apis/when.md) a developer provides this handler, the Gateway can catch exceptions that occur during message processing or within a channel's internal operations. Instead of crashing, the Gateway invokes the `onError` function, passing it the error object and a context object that includes the name of the channel where the error occurred [Source 1].

This allows the application to log the error, attempt to restart the failed channel, or alert an administrator, all while the other channels continue to operate without interruption. If no `onError` handler is provided, unhandled exceptions may still risk halting the application, making its configuration a best practice for robust deployments.

## Configuration

A developer can configure error handling and enable isolation by providing an `onError` callback in the `GatewayConfig`. This function receives the error and the context, including the channel name.

```typescript
import { Gateway, ConsoleChannel, InboundMessage } from 'yaaf';

// Assume myAgent is a configured YAAF agent instance.
const myAgent = {
  async run(input: string): Promise<string> {
    // Agent logic here...
    return `You said: ${input}`;
  }
};

// A hypothetical channel that might fail.
class UnstableChannel implements Channel {
  // ... implementation details
  async send(message: OutboundMessage): Promise<void> {
    if (Math.random() > 0.5) {
      throw new Error("Simulated network failure in UnstableChannel.");
    }
    console.log(`[UnstableChannel] SENT: ${message.text}`);
  }
  // ... other required methods
}

const gateway = new Gateway({
  agent: myAgent,
  channels: [
    new ConsoleChannel(), // A stable channel
    new UnstableChannel(), // An unstable channel
  ],
  onError: (error: Error, context: { channel: string; message?: InboundMessage }) => {
    console.error(
      `[Gateway] An error occurred in channel '${context.channel}'. The other channels are unaffected.`
    );
    console.error(`[Gateway] Error details:`, error.message);

    // This handler catches the error, preventing a crash.
    // The ConsoleChannel will continue to function normally.
  },
});

gateway.start();
```
In this example, if `UnstableChannel` throws an error, the `onError` handler will be called. The error is logged, but it does not stop the Gateway or affect the operation of `ConsoleChannel` [Source 1].

## Sources
[Source 1] src/gateway/channel.ts