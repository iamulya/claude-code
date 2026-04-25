---
summary: Standardized events emitted by YAAF components to provide insights into their internal state and operations for monitoring and debugging.
title: Observability Events
entity_type: concept
related_subsystems:
 - IPC
search_terms:
 - YAAF monitoring
 - agent debugging
 - instrumentation events
 - how to monitor agents
 - ipc:dlq event
 - ipc:backpressure event
 - ipc:ttl_expired event
 - dead letter queue events
 - backpressure monitoring
 - message TTL expiration
 - internal framework events
 - plugin observability
 - system health checks
stub: false
compiled_at: 2026-04-24T17:59:19.333Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/inProcessIPC.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

[Observability](./observability.md) Events are standardized signals emitted by YAAF components, such as plugins, to provide visibility into their internal operations, state changes, and error conditions. These events are crucial for monitoring system health, debugging agent behavior, and implementing production-grade features like alerting and metrics collection [Source 1]. They serve as a structured way for the framework and its extensions to report significant occurrences without tightly coupling to a specific logging or monitoring implementation.

## How It Works in YAAF

In YAAF, components are designed to emit observability events to signal important runtime situations. For example, the `InProcessIPCPlugin`, which handles communication between agents within the same process, emits several specific events related to its message-handling lifecycle [Source 1].

These events typically include a type identifier and a payload containing relevant context. Key examples from the [Inter-Process Communication](./inter-process-communication.md) (IPC) subsystem include [Source 1]:

*   **`ipc:dlq`**: Fired [when](../apis/when.md) a message is moved to a dead-letter queue (DLQ). This happens when a message cannot be processed successfully after a certain number of attempts. The event payload includes the inbox name, the message ID, and the reason for the failure. The structure is defined as:
    ```typescript
    { type: "ipc:dlq"; inbox: string; messageId: string; reason: string }
    ```
*   **`ipc:[[[[[[[[Backpressure]]]]]]]]`**: Emitted when an inbox reaches its maximum size (`maxInboxSize`) and a Backpressure policy (e.g., dropping the oldest message or rejecting new ones) is enforced. This event signals that a consumer agent may be falling behind.
*   **`ipc:ttl_expired`**: Signals that a message has been discarded because its Time-To-Live (TTL) has expired before it could be processed.

These events allow developers to hook into the internal workings of YAAF's subsystems to build robust monitoring and recovery mechanisms.

## Sources

[Source 1]: src/[Integrations](../subsystems/integrations.md)/inProcessIPC.ts