---
summary: A design pattern where state is managed via immutable updates and selector-based notifications to ensure predictable data flow and efficient change detection.
tags:
  - architecture
  - state-management
  - immutability
title: Immutable State Store
entity_type: concept
stub: false
compiled_at: 2026-04-16T14:36:31.370Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/store/store.ts
confidence: 0.9
---

---
title: Immutable State Store
entity_type: concept
summary: A design pattern where state is managed via immutable updates and selector-based notifications to ensure predictable data flow and efficient change detection.
related_subsystems: ["store"]

## What It Is
The Immutable State Store is a core architectural pattern in YAAF used to manage the internal state of agents, tools, and the broader system. It provides a framework-agnostic container that ensures state transitions are predictable and observable. 

By enforcing immutability, the framework avoids the side effects associated with direct state mutation. This pattern is designed to provide the benefits of centralized state management (similar to Redux) without the associated boilerplate, making it suitable for production-grade agentic workflows where state must be synchronized across disparate components like LLM providers, tool executors, and user interfaces.

## How It Works in YAAF
The state store is implemented via the `createStore` function, which initializes a `Store<T>` object. The mechanism relies on three primary operations:

1.  **Immutable Updates**: State is never modified directly. Instead, the `setState` method accepts an updater function that receives the previous state and must return a new state object.
2.  **Selector-Based Subscriptions**: To prevent unnecessary processing, the store allows subscribers to provide a "selector" function. The store tracks the result of this selector and only triggers the listener if the specific slice of state has changed, determined via `Object.is` comparison.
3.  **Snapshot Retrieval**: The `getState` method provides a synchronous read of the current state at any point in time.

The store is designed to be lightweight and has no dependencies on UI frameworks like React, though its selector-based notification system is optimized to support efficient UI re-renders.

## Configuration
Developers initialize a store by providing an initial state object. Updates are typically performed using the spread operator to maintain immutability.

```typescript
import { createStore } from './store';

// Initialize the store
const store = createStore({ 
  count: 0, 
  status: 'idle' 
});

// Subscribe to a specific slice of state
const unsubscribe = store.subscribe(
  (state) => state.status,
  (status) => console.log('Status changed to:', status)
);

// Update state immutably
store.setState((prev) => ({
  ...prev,
  count: prev.count + 1,
  status: 'active'
}));

// Access current state
const current = store.getState();
```

### Store Interface
The `Store<T>` interface defines the following contract:
- `getState()`: Returns the current state snapshot.
- `setState(updater)`: Accepts a function `(prev: T) => T` to transition state.
- `subscribe(listener)`: Subscribes to all changes.
- `subscribe(selector, listener)`: Subscribes to changes in a specific slice of state.

## Sources
- `src/store/store.ts`