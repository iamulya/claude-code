---
summary: A framework-agnostic subsystem providing immutable state containers with selector-based subscriptions for predictable data flow across agents and UI.
primary_files:
  - src/store/store.ts
title: State Management
entity_type: subsystem
exports:
  - createStore
  - Store
  - StoreSubscriber
stub: false
compiled_at: 2026-04-16T14:36:30.372Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/store/store.ts
confidence: 0.95
---

## Purpose
The State Management subsystem provides a lightweight, predictable state container designed to coordinate data flow across agents, tools, and user interfaces. It is built to be framework-agnostic, specifically avoiding dependencies on UI libraries like React, while providing the performance benefits of selector-based subscriptions. 

The subsystem solves the problem of state synchronization in complex agentic workflows by ensuring that components or agents only react to the specific slices of data they require, thereby minimizing unnecessary processing or re-renders.

## Architecture
The subsystem is centered around an immutable state pattern. It avoids the complexity of larger state management libraries like Redux while maintaining a similar predictable flow.

### Key Components
- **Store**: The central object holding the state. It provides methods for reading, updating, and observing data.
- **Updater Functions**: State changes are performed by passing functions to the store that receive the previous state and return a new state object.
- **Selectors**: Functions that extract a specific "slice" of the state. The store uses these to determine if a subscriber needs to be notified based on whether the selected value has changed.
- **Subscribers**: Listeners that are notified of state changes. These can be global (firing on any change) or selector-based (firing only when a specific slice changes).

### Change Detection
The store uses `Object.is` to compare the results of selectors. If a selector is provided, the listener only fires if the value returned by the selector is different from the previously cached value.

## Key APIs

### createStore
The `createStore<T>(initialState, onChange?)` function initializes a new state container. It can optionally take an `onChange` callback that fires after every state change, which is useful for logging or persistence.

### Store<T> Interface
The `Store` object provides the following primary methods:

- **getState()**: Returns the current snapshot of the state.
- **setState(updater)**: Accepts a function `(prev: T) => T`. The updater must return a new object to maintain immutability.
- **subscribe(listener)**: Registers a callback that triggers on every state change. Returns an unsubscribe function.
- **subscribe(selector, listener)**: Registers a callback that only triggers when the value returned by the `selector` changes.

```typescript
const store = createStore({ count: 0, name: 'agent-1' });

// Subscribe to a specific slice
const unsub = store.subscribe(
  s => s.count,
  count => console.log('Count changed:', count)
);

// Update state immutably
store.setState(prev => ({ ...prev, count: prev.count + 1 }));
```

## Extension Points
While the core store is framework-agnostic, it is designed to be wrapped or integrated into various runtimes:
- **UI Integration**: Can be used to create hooks for React or other UI frameworks by wrapping the `subscribe` and `getState` methods.
- **Middleware**: The `onChange` callback in `createStore` allows for the implementation of middleware-like behavior, such as state persistence to local storage or external databases.

## Sources
- `src/store/store.ts`