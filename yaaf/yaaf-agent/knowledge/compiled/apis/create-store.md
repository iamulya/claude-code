---
summary: A factory function to create a new immutable state store instance with an initial state and optional change callback.
export_name: createStore
source_file: src/store/store.ts
category: function
title: createStore
entity_type: api
search_terms:
 - state management
 - immutable state container
 - global state
 - agent state
 - subscribe to state changes
 - selector-based subscription
 - how to create a store
 - YAAF state
 - getState
 - setState
 - framework-agnostic state
 - predictable state flow
 - vanilla JS state
stub: false
compiled_at: 2026-04-24T16:59:59.247Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/store/store.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `createStore` function is a factory that creates a simple, immutable state container. This store is designed to be framework-agnostic, meaning it has no dependencies on React or any other UI library [Source 1].

The primary purpose of the store is to provide a predictable and centralized state management solution for the entire YAAF system. It allows different components, such as agents, [Tools](../subsystems/tools.md), and UI elements, to share and react to state changes efficiently. Key features include [Source 1]:

-   **Immutable Updates**: State is updated by providing an updater function that returns a new state object, ensuring predictability.
-   **Selector-based Subscriptions**: Consumers can subscribe to specific slices of the state. Listeners are only notified [when](./when.md) the value of their selected slice changes, which minimizes unnecessary computations or re-renders.

This pattern is intended to offer the benefits of a predictable state flow, similar to Redux, but with a much simpler API [Source 1].

## Signature / Constructor

`createStore` is a generic function that takes an initial state and an optional callback.

```typescript
export function createStore<T>(
  initialState: T,
  onChange?: (args: { /* ... */ })
): Store<T>;
```

**Parameters:**

-   `initialState` (`T`): The initial value of the state.
-   `onChange` (`(args: { ... }) => void`, optional): A callback function that is fired after every state change [Source 1].

**Return Value:**

The function returns a `Store<T>` object, which provides the API for interacting with the state. The `Store<T>` type is defined as [Source 1]:

```typescript
export type Store<T> = {
  getState(): T;
  setState(updater: (prev: T) => T): void;
  subscribe(listener: (state: T) => void): () => void;
  subscribe<S>(
    selector: (state: T) => S,
    listener: (selected: S, state: T) => void
  ): () => void;
};
```

## Methods & Properties

The `Store` object returned by `createStore` has the following methods:

### getState()

Returns a snapshot of the current state.

**Signature:**
```typescript
getState(): T;
```

### setState()

Updates the state immutably. It accepts an updater function that receives the previous state and must return a new state object.

**Signature:**
```typescript
setState(updater: (prev: T) => T): void;
```

### subscribe()

Subscribes a listener function to state changes. It has two overloads:

1.  **Subscribe to the entire state:** The listener is called on every state change.
    **Signature:**
    ```typescript
    subscribe(listener: (state: T) => void): () => void;
    ```

2.  **Subscribe to a state slice:** The listener is only called when the value returned by the `selector` function changes. The comparison is performed using `Object.is`.
    **Signature:**
    ```typescript
    subscribe<S>(
      selector: (state: T) => S,
      listener: (selected: S, state: T) => void
    ): () => void;
    ```

In both cases, the `subscribe` method returns an `unsubscribe` function that, when called, removes the subscription [Source 1].

## Examples

The following example demonstrates creating a store, subscribing to a slice of the state, and updating the state [Source 1].

```typescript
// 1. Create a store with an initial state
const store = createStore({ count: 0, name: 'agent-1' });

// 2. Subscribe to a slice of the state (the 'count' property)
const unsubscribe = store.subscribe(
  // Selector function
  state => state.count,
  // Listener function, only called when `count` changes
  count => console.log('Count changed:', count)
);

// 3. Update the state immutably
store.setState(previousState => ({ ...previousState, count: previousState.count + 1 }));
// Console output: "Count changed: 1"

// 4. Update a different part of the state
store.setState(previousState => ({ ...previousState, name: 'agent-alpha' }));
// No console output, because the 'count' slice did not change.

// 5. Unsubscribe the listener
unsubscribe();
```

## Sources

[Source 1]: src/store/store.ts