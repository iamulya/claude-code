---
summary: Immutable, selector-based reactive state management for YAAF agents.
primary_files:
  - src/index.ts
title: State Store
entity_type: subsystem
stub: false
compiled_at: 2026-04-16T14:20:18.990Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/index.ts
confidence: 0.95
---

## Purpose
The State Store is a core subsystem of the YAAF framework responsible for managing the internal state of autonomous agents. It provides a centralized, predictable mechanism for handling operational data, ensuring that state transitions are consistent and traceable throughout an agent's lifecycle. The subsystem is designed to solve the challenges of state synchronization in complex, asynchronous LLM-powered workflows.

## Architecture
The State Store is built on a reactive architecture that emphasizes data integrity and efficient retrieval. Its internal structure is defined by three primary characteristics:

*   **Immutability**: The state is maintained as an immutable data structure. Modifications are not performed in-place; instead, state updates produce new versions of the state, which prevents side effects and facilitates debugging.
*   **Selector-based Access**: The subsystem utilizes a selector pattern for data retrieval. Selectors allow components to query specific slices of the state, decoupling the underlying state structure from the logic that consumes it.
*   **Reactivity**: The store is reactive, meaning it can notify observers or trigger logic automatically when specific parts of the state change.

## Key APIs
The State Store provides a functional API surface for managing agent data:

*   **State Selectors**: Mechanisms for extracting specific data points or derived values from the global agent state.
*   **Reactive Updates**: Interfaces for transitioning the state in an immutable fashion while triggering necessary reactive updates across the framework.

## Sources
*   Source 1: `src/index.ts`