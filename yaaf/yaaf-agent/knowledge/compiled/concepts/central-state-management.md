---
summary: The pattern of storing and accessing application-wide state in a single, observable location, such as YAAF's AppState.
title: Central State Management
entity_type: concept
search_terms:
 - single source of truth
 - global state
 - application state
 - shared state between components
 - how to observe state changes
 - AppState store
 - task management state
 - observable state pattern
 - decoupled components
 - centralized data store
 - YAAF state
stub: false
compiled_at: 2026-04-24T17:52:59.514Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/taskManager.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

Central State Management is a design pattern where the state for an entire application, or a significant cross-cutting concern, is stored in a single, centralized location. This "single source of truth" makes the state accessible and observable to any component within the application.

This pattern solves the problem of state synchronization and communication between decoupled components. Instead of components passing state directly to one another, they can read from and write to the central store. This simplifies the application architecture and makes state changes more predictable. In YAAF, this is crucial for coordinating activities between different parts of the agent system, such as tracking background tasks and updating a user interface [Source 1].

## How It Works in YAAF

YAAF employs Central State Management for features that require visibility across multiple components. A primary example is the `TaskManager`, which tracks the lifecycle of background work like agent runs, shell commands, and workflows [Source 1].

The `TaskManager` does not keep the state of these tasks private. Instead, it stores all task information in a central state store, specifically `AppState.tasks`. Each task is represented by a `TaskState` object containing its ID, type, status (`pending`, `running`, `completed`, etc.), and other metadata [Source 1].

By placing this information in a central location, any component in the YAAF application can observe the status of any task. For example, a UI component could monitor `AppState.tasks` to display a real-time list of active processes, or another agent could check the status of a dependency task before starting its own work. This design decouples the component that initiates a task from the components that need to react to its progress and completion [Source 1].

To maintain performance and cleanliness, the system also includes logic for managing the state's size. For instance, tasks that reach a terminal state (like `completed`, `failed`, or `killed`) are eventually evicted from the central store after a timeout [Source 1].

## Sources

[Source 1]: src/agents/taskManager.ts