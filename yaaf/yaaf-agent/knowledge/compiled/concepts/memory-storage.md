---
summary: The mechanism and location where an agent's conversational history and other persistent data are stored.
title: Memory Storage
entity_type: concept
related_subsystems:
 - Memory
see_also:
 - "[Memory](./memory.md)"
 - "[Agent Project Structure](./agent-project-structure.md)"
search_terms:
 - agent memory location
 - where is conversation history stored
 - .yaaf/memory directory
 - persistent agent state
 - how does yaaf save memory
 - auto-managed storage
 - runtime data storage
 - session persistence location
 - agent data directory
 - YAAF file system storage
stub: false
compiled_at: 2026-04-25T00:21:15.828Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/getting-started.md
compiled_from_quality: documentation
confidence: 1
---

## What It Is

Memory Storage refers to the physical location and mechanism used by a YAAF agent to persist its [Memory](./memory.md). This allows an agent to maintain state, recall past interactions, and continue conversations across multiple runs or sessions. The storage is designed to be automatically managed by the framework, requiring no manual setup for basic use cases [Source 1].

## How It Works in YAAF

By default, YAAF implements memory storage using the local file system. When an agent is run for the first time and needs to persist data, the framework automatically creates a directory named `.yaaf/memory/` within the root of the agent's project directory [Source 1].

This directory serves as the default storage location for all auto-managed memory components, such as conversational history and other persistent state managed by the agent's [Memory](./memory.md) subsystem. The creation and management of this directory happen at runtime, abstracting the details of file I/O from the developer [Source 1].

## See Also

- [Memory](./memory.md): The core concept representing an agent's state and history, which is persisted in Memory Storage.
- [Agent Project Structure](./agent-project-structure.md): The standard layout of a YAAF project, which includes the default `.yaaf/memory/` directory.

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/getting-started.md