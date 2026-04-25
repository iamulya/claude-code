---
title: State Store System
entity_type: subsystem
summary: Provides immutable, selector-based reactive state management for YAAF agents.
primary_files:
 - src/index.ts
search_terms:
 - agent state management
 - immutable state
 - reactive data flow
 - selector pattern
 - how to get agent data
 - redux-like state for agents
 - application state in YAAF
 - data store for agents
 - state synchronization
 - managing agent memory
 - agent data access
 - state change notifications
stub: false
compiled_at: 2026-04-24T18:19:57.068Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/index.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The State Store system is a core component of the YAAF framework responsible for managing an agent's internal state. It provides a centralized, predictable, and efficient mechanism for state management based on three key principles: immutability, selector-based access, and reactivity [Source 1].

This subsystem solves the problem of tracking and accessing agent data throughout its lifecycle, preventing common issues like race conditions and unexpected side effects by ensuring that state is never modified in place.

## Architecture

The State Store is architecturally designed as a system for "immutable, selector-based [Reactive State Management](../concepts/reactive-state-management.md)" [Source 1].

-   **Immutability**: The state managed by the store is immutable. [when](../apis/when.md) a change occurs, a new state object is created rather than modifying the existing one. This provides a clear history of state changes and simplifies debugging.
-   **Selector-based**: Data is retrieved from the store using selectors. Selectors are functions that can compute derived data from the state, allowing for efficient and memoized access to specific pieces of information.
-   **Reactive**: Other parts of the agent can subscribe to state changes. When the state is updated, subscribed components are notified, allowing them to react accordingly.

The specific classes and internal implementation details are not described in the provided source material.

## Key APIs

The provided source material does not detail the public API surface for the State Store system.

## Sources

[Source 1]: src/index.ts