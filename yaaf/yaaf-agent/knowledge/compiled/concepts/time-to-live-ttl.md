---
summary: A mechanism to specify a duration after which a message or data item in YAAF's systems should be considered expired and potentially discarded.
title: Time-To-Live (TTL)
entity_type: concept
related_subsystems:
 - IPC
search_terms:
 - message expiration
 - data expiry
 - how long do messages live
 - message lifetime
 - IPC message timeout
 - ttlMs property
 - expired message handling
 - time-sensitive data
 - agent message lifecycle
 - preventing stale data
 - message expiry configuration
 - temporary messages
stub: false
compiled_at: 2026-04-24T18:03:43.810Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/inProcessIPC.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

Time-To-Live (TTL) is a mechanism that limits the lifespan of a data item, such as a message, within a system. It defines a specific duration after which the data is considered expired and should no longer be used or processed.

In the context of an agent framework like YAAF, TTL is crucial for maintaining data relevance and system stability. Agents often operate asynchronously, and messages can be queued for processing. A TTL ensures that time-sensitive messages are not acted upon after they have become stale or irrelevant, preventing agents from making decisions based on outdated information. This is particularly important in dynamic environments where the context can change rapidly.

## How It Works in YAAF

Within YAAF's [Inter-Process Communication](./inter-process-communication.md) (IPC) subsystem, TTL is implemented as an optional property on messages. The `IPCMessage` type definition includes a `ttlMs` field, which specifies the message's lifetime in milliseconds [Source 1].

[when](../apis/when.md) a message is created, it is assigned a `timestamp`. The TTL mechanism uses this timestamp along with the `ttlMs` value to determine if a message has expired. If the current time exceeds the message's creation `timestamp` plus its `ttlMs` duration, the message is considered expired.

The framework provides [Observability](./observability.md) into this process. The `InProcessIPCPlugin`, for example, is capable of emitting an `ipc:ttl_expired` event [Source 1]. This allows monitoring systems or other parts of the application to track and potentially react to messages being discarded due to TTL expiration. The exact point at which the TTL check occurs (e.g., on read, during a background sweep) is an implementation detail of the specific IPC adapter being used.

## Configuration

A developer can set a TTL for a message by providing the `ttlMs` property when constructing the message object to be sent via an IPC adapter.

The following TypeScript example illustrates how to set a 5-second TTL on an `IPCMessage`:

```typescript
import type { IPCMessage } from "yaaf";

// This is a partial message object, as required by the IPCAdapter.send method.
// The 'id', 'timestamp', 'read', and 'attempts' fields are added by the IPC system.
const timeSensitiveMessage: Omit<IPCMessage, "id" | "timestamp" | "read" | "attempts"> = {
  from: "agent-alpha",
  to: "agent-beta",
  body: JSON.stringify({ command: "execute_trade", price_limit: 150.50 }),
  maxAttempts: 1,
  ttlMs: 5000, // Expire after 5000 milliseconds (5 seconds)
  summary: "Execute trade command"
};

// This message would then be passed to an IPC adapter's `send` method.
// ipc.send("agent-beta-inbox", timeSensitiveMessage);
```

If the `ttlMs` property is omitted, the message does not have an expiration and will persist in the system until it is processed or manually cleared.

## Sources

[Source 1] src/[Integrations](../subsystems/integrations.md)/inProcessIPC.ts