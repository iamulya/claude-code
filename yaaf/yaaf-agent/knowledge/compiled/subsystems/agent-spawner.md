---
summary: Multi-agent orchestration with mailbox-based IPC.
primary_files:
  - src/index.ts
title: Agent Spawner
entity_type: subsystem
stub: false
compiled_at: 2026-04-16T14:20:20.128Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/index.ts
confidence: 0.95
---

## Purpose
The Agent Spawner is a core subsystem of the YAAF framework dedicated to multi-agent orchestration. Its primary role is to manage the lifecycle and coordination of multiple autonomous agents, enabling them to work together on complex tasks.

## Architecture
The subsystem is built around a mailbox-based Inter-Process Communication (IPC) model. This architectural pattern allows agents to communicate asynchronously by sending and receiving messages through dedicated mailboxes, ensuring decoupled interactions between different agent instances.

## Key APIs
The Agent Spawner is integrated into the main `yaaf` module. It provides the necessary interfaces for:
*   Orchestrating multiple agent instances.
*   Managing mailbox-based communication channels between agents.

## Sources
* `src/index.ts` — Framework entry point and subsystem definitions.