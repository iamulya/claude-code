---
summary: Factory function that initializes a new immutable state store with an initial state and optional change callback.
export_name: createStore
source_file: src/store/store.ts
category: function
title: createStore
entity_type: api
stub: false
compiled_at: 2026-04-16T14:36:33.217Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/store/store.ts
confidence: 0.98
---

## Overview
`createStore` is a factory function used to initialize an immutable state container. It is designed to provide a predictable state flow across agents, tools, and user interfaces without dependencies on specific UI frameworks like React. 

The resulting store supports immutable updates via updater functions and efficient notifications through selector-based subscriptions. This architecture ensures that subscribers are only notified when the specific slice of state they are interested in changes, minimizing unnecessary processing or re-renders.

## Signature / Constructor

```typescript
export function createStore<T>(
  initialState: T,
  onChange?: (args: any) => void
): Store<T>
```

### Parameters
*   **initialState**: The initial value of the state.
*   **onChange**: An optional callback function that fires after every state change.

## Methods & Properties

The `createStore` function returns a `Store<T>` object with the following interface:

### getState()
`getState(): T`
Returns the current snapshot of the state.

### setState()
`setState(updater: (prev: T) => T): void`
Updates the state using an updater function. The updater must return a new object to maintain immutability.

### subscribe()
The `subscribe` method is overloaded to support both global and slice-specific subscriptions. Both versions return an unsubscribe function.

*   **Full State Subscription**: `subscribe(listener: (state: T) => void): () => void`
    Fires the listener on every state change.
*   **Selector Subscription**: `subscribe<S>(selector: (state: T) => S, listener: (selected: S, state: T) => void): () => void`
    Fires the listener only when the value returned by the `selector` changes. Change detection is performed using `Object.is`.

## Examples

### Basic Usage and Subscriptions
```typescript
const store = createStore({ count: 0, name: 'agent-1' });

// Subscribe to a specific slice of state
const unsub = store.subscribe(
  s => s.count,
  (count) => console.log('Count changed:', count)
);

// Update state immutably
store.setState(prev => ({ ...prev, count: prev.count + 1 }));

// Clean up subscription
unsub();
```

### Using getState and Full Subscriptions
```typescript
const store = createStore({ status: 'idle' });

store.subscribe((state) => {
  console.log('New state:', state);
});

const current = store.getState();
console.log(current.status); // 'idle'
```