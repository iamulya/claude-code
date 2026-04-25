---
summary: The YAAF State Management System provides an immutable, selector-based state store for managing application state across agents, tools, and UI components.
primary_files:
 - src/store/store.ts
title: State Management System
entity_type: subsystem
exports:
 - createStore
 - Store
search_terms:
 - immutable state management
 - state container
 - selector-based subscriptions
 - how to share state between agents
 - global state in YAAF
 - redux alternative for agents
 - managing UI state
 - predictable state flow
 - createStore function
 - subscribe to state changes
 - getState API
 - setState API
 - framework-agnostic state
stub: false
compiled_at: 2026-04-24T18:19:59.531Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/store/store.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Purpose

The State Management System provides a centralized, immutable state container for the entire YAAF application [Source 1]. Its primary purpose is to enable a predictable state flow across different parts of the system, including agents, [Tools](./tools.md), and user interface components. The design aims to be a lightweight alternative to more complex libraries like Redux, while still ensuring that components only re-render or re-process [when](../apis/when.md) relevant data changes. This is achieved through a selector-based subscription model that minimizes unnecessary updates [Source 1]. The system is intentionally decoupled from any UI framework, such as React, making it a general-purpose utility [Source 1].

## Architecture

The core of the system is the `Store`, an object that holds the application state. The state is designed to be immutable; modifications are not made directly to the state object. Instead, updates are performed by providing an updater function to the `setState` method. This function receives the previous state and must return a new state object, ensuring that the state reference changes on every update [Source 1].

Subscriptions are managed via a list of `StoreSubscriber` objects. A subscriber can listen to all state changes or, more efficiently, subscribe to a specific "slice" of the state using a `selector` function. When a selector is provided, the system stores the previously selected value. After a state update, it re-runs the selector and compares the new value with the previous one using `Object.is`. The subscriber's listener function is only invoked if the selected value has changed, preventing notifications for irrelevant state updates [Source 1].

## Integration Points

The State Management System is designed to be a central hub for state, used by various other subsystems [Source 1].
- **Agents**: Agents can subscribe to the store to react to global state changes or use `setState` to report their status or results.
- **Tools**: Tools can access shared state, such as configuration or user data, from the store.
- **UI Components**: User interface components can subscribe to slices of the state to display data and trigger updates based on user interactions, ensuring minimal re-renders [Source 1].

## Key APIs

The public API of the State Management System is exposed through the `Store` object, which is created by the `createStore` function [Source 1].

### `createStore<T>(initialState, onChange?)`
This factory function initializes and returns a new store instance. It takes the initial state of the application as its primary argument [Source 1].

### `store.getState(): T`
Returns a snapshot of the current state object held within the store [Source 1].

### `store.setState(updater: (prev: T) => T): void`
Updates the state. It accepts an updater function that receives the previous state and must return a new, updated state object. This enforces immutability [Source 1].

```typescript
// Example of an immutable update
store.setState(prevState => ({ ...prevState, count: prevState.count + 1 }));
```

### `store.subscribe(listener)`
Subscribes a listener function that will be called on every single state change. It returns an unsubscribe function to remove the listener [Source 1].

### `store.subscribe<S>(selector, listener)`
Subscribes a listener to a specific slice of the state, defined by the `selector` function. The `listener` is only invoked when the value returned by the selector changes between updates. This is the preferred method for performance-sensitive subscriptions. It also returns an unsubscribe function [Source 1].

```typescript
// Example of subscribing to a state slice
const unsubscribe = store.subscribe(
  state => state.count,
  count => console.log('Count changed:', count)
);
```

## Configuration

The primary configuration for the State Management System occurs during instantiation via the `createStore` function. Developers must provide an `initialState` object, which defines the shape and default values of the application state. An optional `onChange` callback can also be passed to `createStore` to be executed after every state change [Source 1].

## Sources
[Source 1]: src/store/store.ts