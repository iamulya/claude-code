---
summary: A mechanism in YAAF's messaging systems to store messages that could not be delivered or processed successfully for later inspection or reprocessing.
title: Dead Letter Queue (DLQ)
entity_type: concept
related_subsystems:
 - IPC
search_terms:
 - undeliverable messages
 - failed message processing
 - what is a DLQ
 - YAAF message failure
 - IPC error handling
 - agent communication errors
 - dead lettering
 - message reprocessing
 - inspect failed messages
 - ipc:dlq event
 - message delivery guarantee
 - poison pill message
stub: false
compiled_at: 2026-04-24T17:54:19.867Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/inProcessIPC.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

A Dead Letter Queue (DLQ) is a dedicated storage mechanism within YAAF's [Inter-Process Communication](./inter-process-communication.md) (IPC) subsystem. It is designed to hold messages that cannot be successfully delivered to or processed by their intended recipient after a certain number of attempts or due to a critical error [Source 1].

The primary purpose of a DLQ is to enhance system reliability and [Observability](./observability.md). By isolating problematic messages, it prevents them from repeatedly failing and consuming resources or blocking the processing of subsequent messages in a queue. These "dead-lettered" messages are preserved for later analysis, debugging, or manual intervention, ensuring that no message is silently lost [Source 1].

## How It Works in YAAF

The Dead Letter Queue functionality is defined as part of the `IPCAdapter` interface, making it a standard feature across different IPC transport implementations [Source 1].

The core components of the DLQ mechanism are:

*   **`deadLetter()` Method**: An IPC adapter provides the `deadLetter(inbox: string, message: IPCMessage, reason: string)` method. This function is called to explicitly move a specific message to the DLQ associated with the target inbox. It requires a `reason` string, which provides context for the failure [Source 1].
*   **`listDeadLetters()` Method**: To inspect the contents of a DLQ, the `listDeadLetters(inbox: string)` method can be used. It returns a promise that resolves to an array of `IPCMessage` objects currently held in the queue for a given inbox [Source 1].
*   **Observability Event**: [when](../apis/when.md) a message is sent to the DLQ, the IPC system can emit an `ipc:dlq` event. This event contains the inbox name, the ID of the failed message, and the reason for the failure, allowing monitoring systems to track and alert on message delivery issues in real-time [Source 1]. The event structure is defined as:
    ```typescript
    { type: "ipc:dlq"; inbox: string; messageId: string; reason: string }
    ```
*   **Message State**: The `IPCMessage` type includes fields such as `attempts` and `maxAttempts`, which can be used by message processing logic to determine when a message should be dead-lettered, although the decision logic itself is not defined within the interface [Source 1].

## Sources

[Source 1]: src/[Integrations](../subsystems/integrations.md)/inProcessIPC.ts