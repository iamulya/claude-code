---
summary: A type definition for the immutable state store in YAAF, providing methods for getting state, updating state, and subscribing to changes.
export_name: Store
source_file: src/store/store.ts
category: type
title: Store
entity_type: api
search_terms:
 - state management
 - immutable state container
 - subscribe to state changes
 - selector-based subscription
 - get current state
 - update agent state
 - predictable state flow
 - redux alternative
 - state container for agents
 - getState method
 - setState method
 - subscribe method
 - framework-agnostic state
stub: false
compiled_at: 2026-04-24T17:40:40.301Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/store/store.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `Store<T>` type defines the interface for YAAF's immutable state container. It is a lightweight, framework-agnostic utility for managing state across the entire system, including agents, [Tools](../subsystems/tools.md), and UI components [Source 1].

The design provides a predictable state flow through immutable updates. It features selector-based subscriptions, which ensure that components or listeners are only notified [when](./when.md) a specific slice of the state they care about has changed. This minimizes unnecessary re-renders or computations and avoids the complexity of larger state management libraries like Redux [Source 1].

A `Store` instance is created using the `createStore` factory function.

## Signature / Constructor

`Store<T>` is a TypeScript type definition, not a class. It defines the shape of a store object.

```typescript
export type Store<T> = {
  /** Get the current state snapshot */
  getState(): T;

  /** Update state via an updater function — must return a new object */
  setState(updater: (prev: T) => T): void;

  /** Subscribe to all state changes. Returns an unsubscribe function. */
  subscribe(listener: (state: T) => void): () => void;

  /**
   * Subscribe to a slice of state. The listener only fires when the
   * selected value changes (compared via Object.is).
   * Returns an unsubscribe function.
   */
  subscribe<S>(
    selector: (state: T) => S,
    listener: (selected: S, state: T) => void
  ): () => void;
};
```

A store is instantiated using the `createStore` function, which is not part of the `Store` type itself but is the standard way to create a compatible object.

```typescript
export function createStore<T>(
  initialState: T,
  onChange?: (args: { /* ... */ })
): Store<T>;
```

## Methods & Properties

The `Store<T>` type specifies the following methods:

### getState()

Returns the current state object. This is a snapshot of the state at the time of the call.

**Signature:**
```typescript
getState(): T
```

### setState()

Updates the state. It accepts an updater function that receives the previous state and must return a new state object. The update is immutable; the original state object is not modified.

**Signature:**
```typescript
setState(updater: (prev: T) => T): void
```
- **`updater`**: A function that takes the previous state `prev` and returns the next state.

### subscribe()

Subscribes a listener function to state changes. It returns an `unsubscribe` function that, when called, removes the subscription. This method is overloaded.

**Signature 1: Subscribe to all changes**
Listens for any change to the state object. The listener is called with the full new state after every update.

```typescript
subscribe(listener: (state: T) => void): () => void
```
- **`listener`**: A function that receives the entire new state object on every change.

**Signature 2: Subscribe to a state slice**
Listens for changes to a specific part of the state, determined by a selector function. The listener is only invoked when the value returned by the selector changes, compared to its previous value using `Object.is`.

```typescript
subscribe<S>(
  selector: (state: T) => S,
  listener: (selected: S, state: T) => void
): () => void
```
- **`selector`**: A function that takes the full state and returns a slice or derived value.
- **`listener`**: A function that is called only when the selected value changes. It receives the new selected value and the full state object.

## Examples

The following example demonstrates creating a store, subscribing to a slice of the state, and updating the state immutably.

```typescript
// The createStore function is used to create an object of type Store
const store = createStore({ count: 0, name: 'agent-1' });

// Subscribe to a slice of the state (the 'count' property)
const unsubscribe = store.subscribe(
  // Selector function
  state => state.count,
  // Listener function, only called when count changes
  count => console.log('Count changed:', count)
);

// Update the state immutably
store.setState(previousState => ({ ...previousState, count: previousState.count + 1 }));
// Console output: 'Count changed: 1'

// Update a different part of the state
store.setState(previousState => ({ ...previousState, name: 'agent-alpha' }));
// No console output, because the selected 'count' value did not change.

// Unsubscribe the listener
unsubscribe();
```

## Sources

[Source 1] src/store/store.ts