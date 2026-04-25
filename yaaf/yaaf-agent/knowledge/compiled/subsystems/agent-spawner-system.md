---
title: Agent Spawner System
entity_type: subsystem
summary: Facilitates multi-agent orchestration with mailbox-based inter-process communication (IPC) in YAAF.
primary_files:
 - src/index.ts
search_terms:
 - multi-agent systems
 - agent communication
 - inter-process communication for agents
 - IPC
 - mailbox communication
 - how to make agents talk to each other
 - orchestrating multiple agents
 - spawning new agents
 - agent swarm
 - collaborative agents
 - YAAF multi-agent
 - agent orchestration
stub: false
compiled_at: 2026-04-24T18:09:37.536Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/index.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The Agent Spawner System is one of the core subsystems in the YAAF framework [Source 1]. Its primary purpose is to enable and manage [Multi-Agent Systems](../concepts/multi-agent-systems.md). It solves the problem of coordinating multiple distinct agents, allowing them to work together on complex tasks by providing a mechanism for communication and orchestration [Source 1].

## Architecture

The architectural foundation of the Agent Spawner System is a mailbox-based model for [Inter-Process Communication](../concepts/inter-process-communication.md) (IPC) [Source 1]. This approach allows agents to communicate asynchronously by sending messages to each other's designated mailboxes. This decouples the agents, meaning they do not need to be directly aware of each other's internal state or be active at the same time to exchange information.

## Key APIs

The specific public APIs for the Agent Spawner System are not detailed in the provided source material.

## Sources

[Source 1]: src/index.ts