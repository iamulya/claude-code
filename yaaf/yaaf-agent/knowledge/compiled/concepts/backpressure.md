---
summary: A flow control mechanism in YAAF to prevent a producer from overwhelming a consumer by limiting the rate or volume of data.
title: Backpressure
entity_type: concept
related_subsystems:
 - ipc
search_terms:
 - flow control
 - preventing message overload
 - max inbox size
 - message queue limit
 - producer consumer problem
 - handling too many messages
 - IPC message dropping
 - rejecting new messages
 - drop-oldest policy
 - reject policy
 - agent communication limits
 - what is backpressure in yaaf
stub: false
compiled_at: 2026-04-24T17:52:52.013Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/inProcessIPC.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

Backpressure is a flow control mechanism used within YAAF's [Inter-Agent Communication](../subsystems/inter-agent-communication.md) systems. Its purpose is to prevent a fast message-producing agent from overwhelming a slower message-consuming agent. [when](../apis/when.md) a receiving agent's message inbox reaches its capacity, backpressure strategies are applied to manage the overflow, ensuring system stability and preventing unbounded resource consumption.

## How It Works in YAAF

Backpressure is implemented as a core feature within plugins that provide the `IPCAdapter` capability, such as the `InProcessIPCPlugin` [Source 1]. The primary mechanism involves setting a maximum size for an agent's message inbox.

When an agent attempts to send a message to an inbox that is already full, one of two configurable policies is enacted [Source 1]:

*   **Drop-Oldest Policy**: The oldest message in the inbox is discarded to make room for the new incoming message.
*   **Reject Policy**: The new incoming message is rejected and not added to the inbox.

To support monitoring and operational awareness, the framework can emit [Observability Events](./observability-events.md), such as `ipc:backpressure`, when these limits are enforced [Source 1]. This allows other parts of the system or external monitoring [Tools](../subsystems/tools.md) to react to conditions of high message volume.

## Configuration

Backpressure is configured on the specific IPC adapter plugin being used. For example, in the `InProcessIPCPlugin`, a developer would configure the `maxInboxSize` property for agent inboxes and select the desired overflow policy (`drop-oldest` or `reject`) [Source 1]. The exact configuration method depends on the specific IPC plugin's implementation.

## Sources

[Source 1]: src/[Integrations](../subsystems/integrations.md)/inProcessIPC.ts