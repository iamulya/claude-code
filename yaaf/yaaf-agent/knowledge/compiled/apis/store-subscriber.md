---
summary: A type definition for a store subscriber, including a listener function, an optional selector, and internal state for change detection.
export_name: StoreSubscriber
source_file: src/store/store.ts
category: type
title: StoreSubscriber
entity_type: api
search_terms:
 - state management subscription
 - store listener type
 - how to subscribe to state changes
 - selector function for store
 - change detection in store
 - subscribe to state slice
 - YAAF store internals
 - listener function signature
 - state update notification
 - createStore subscriber object
 - selective state subscription
stub: false
compiled_at: 2026-04-24T17:40:47.594Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/store/store.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`StoreSubscriber<T>` is a TypeScript type that defines the internal structure of a subscription object within a YAAF `Store`. It is not typically instantiated directly by users but is created internally [when](./when.md) `store.subscribe()` is called [Source 1].

This type encapsulates all the necessary information for a single subscription: a listener function to be executed on state changes, an optional selector function to subscribe to a specific slice of the state, and an internal property to track the previously selected state for efficient change detection [Source 1].

When a selector is provided, the associated listener function is only invoked if the value returned by the selector has changed since the last state update, using `Object.is` for comparison. This allows for performance optimizations by preventing notifications for irrelevant state changes [Source 1].

## Signature

The `StoreSubscriber<T>` type is defined as an object with the following properties [Source 1]:

```typescript
export type StoreSubscriber<T> = {
  /** Called with the full new state on every change */
  listener: (state: T) => void;
  /** Optional selector — when provided, listener only fires when selected value changes */
  selector?: (state: T) => unknown;
  /** Previous selected value for change detection */
  _prevSelected?: unknown;
};
```

## Properties

- **`listener: (state: T) => void`**
  The function to be called when a state change occurs. If no `selector` is provided, this function is called on every state update with the complete new state object [Source 1].

- **`selector?: (state: T) => unknown`**
  An optional function that receives the full state and returns a specific slice or derived value. If a `selector` is present, the `listener` will only be called when the value returned by this function changes between state updates [Source 1].

- **`_prevSelected?: unknown`**
  An internal property used by the `Store` to cache the previously selected value. This is used for change detection to determine if the `listener` should be notified [Source 1]. This property should not be manipulated by user code.

## Examples

While `StoreSubscriber` is used internally, its properties are determined by the arguments passed to the `store.subscribe` method. The following examples demonstrate how subscriptions are created, which in turn create `StoreSubscriber` objects within the store's internal state.

### Subscribing to the Entire State

This subscription creates an internal `StoreSubscriber` object without a `selector`. The listener will be called on every state change.

```typescript
import { createStore } from 'yaaf';

const store = createStore({ count: 0, name: 'agent-1' });

// This creates a StoreSubscriber internally where `selector` is undefined.
const unsubscribe = store.subscribe(
  (newState) => console.log('State changed:', newState)
);

store.setState(prev => ({ ...prev, count: 1 }));
// Logs: State changed: { count: 1, name: 'agent-1' }

unsubscribe();
```

### Subscribing to a State Slice

This subscription creates an internal `StoreSubscriber` object that includes a `selector` function. The listener will only be called when the `count` property changes.

```typescript
import { createStore } from 'yaaf';

const store = createStore({ count: 0, name: 'agent-1' });

// This creates a StoreSubscriber internally with a `selector` for `s.count`.
const unsubscribe = store.subscribe(
  s => s.count,
  (count) => console.log('Count changed:', count)
);

// This update will trigger the listener
store.setState(prev => ({ ...prev, count: prev.count + 1 }));
// Logs: Count changed: 1

// This update will NOT trigger the listener, as the selected slice (count) is unchanged
store.setState(prev => ({ ...prev, name: 'agent-2' }));
// (No output)

unsubscribe();
```

## See Also

- `createStore`: The factory function for creating a state store.
- `Store`: The type definition for the state store instance.

## Sources

[Source 1] src/store/store.ts