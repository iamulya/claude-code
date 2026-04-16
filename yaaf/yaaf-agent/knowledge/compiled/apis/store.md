---
summary: Interface representing the immutable state container, providing methods for state access, updates, and subscriptions.
export_name: Store
source_file: src/store/store.ts
category: type
title: Store
entity_type: api
stub: false
compiled_at: 2026-04-16T14:36:38.664Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/store/store.ts
confidence: 0.98
---

## Overview
The `Store` is an immutable state container designed to provide predictable state flow across agents, tools, and user interfaces within the YAAF framework. It facilitates state management without dependencies on specific UI frameworks like React, though it supports selector-based subscriptions to ensure minimal re-notifications when only specific slices of state change.

The design rationale for `Store` is to provide the benefits of centralized state management—similar to patterns found in Redux—while avoiding high boilerplate and complexity.

## Signature / Constructor

### Store Type
```typescript
export type Store<T> = {
  getState(): T
  setState(updater: (prev: T) => T): void
  subscribe(listener: (state: T) => void): () => void
  subscribe<S>(
    selector: (state: T) => S,
    listener: (selected: S, state: T) => void,
  ): () => void
}
```

### Factory Function
Stores are typically instantiated using the `createStore` factory function.

```typescript
export function createStore<T>(
  initialState: T,
  onChange?: (args: { state: T }) => void
): Store<T>
```

## Methods & Properties

### getState()
Returns the current state snapshot. This is a synchronous call that provides the most recent version of the state object.

### setState(updater)
Updates the state using an updater function. The updater receives the current state as its argument and must return a new object representing the next state. This method enforces immutable update patterns.

### subscribe(listener)
Registers a callback that fires whenever the state changes. It returns an unsubscribe function to stop listening to updates.

### subscribe(selector, listener)
Registers a callback that only fires when a specific slice of the state changes. The `selector` function extracts a value from the state, and the `listener` is only invoked if the selected value has changed (compared using `Object.is`). This is the primary mechanism for optimizing performance in subscribers.

## Examples

### Basic Usage and Subscriptions
```typescript
const store = createStore({ count: 0, name: 'agent-1' });

// Subscribe to a specific slice (count)
const unsub = store.subscribe(
  s => s.count,
  (count) => console.log('Count changed:', count)
);

// Update state immutably
store.setState(prev => ({ 
  ...prev, 
  count: prev.count + 1 
}));

// Clean up subscription
unsub();
```

### Global State Access
```typescript
const currentState = store.getState();
console.log('Current name:', currentState.name);
```