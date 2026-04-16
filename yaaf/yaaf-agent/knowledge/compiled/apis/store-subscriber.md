---
summary: Type definition for store listeners, supporting both full-state and selector-based subscriptions with change detection.
export_name: StoreSubscriber
source_file: src/store/store.ts
category: type
title: StoreSubscriber
entity_type: api
stub: false
compiled_at: 2026-04-16T14:37:09.817Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/store/store.ts
confidence: 0.9
---

## Overview
`StoreSubscriber` is a TypeScript type definition used by the YAAF state management system to represent a subscription to an immutable state store. It defines the structure for listeners that respond to state changes, supporting both global notifications and optimized, selector-based updates. This pattern allows the framework to maintain predictable state flow across agents, tools, and the UI while minimizing unnecessary re-renders or notifications by only firing listeners when a specific slice of state has changed.

## Signature / Constructor
```typescript
export type StoreSubscriber<T> = {
  /** Called with the full new state on every change */
  listener: (state: T) => void
  /** Optional selector — when provided, listener only fires when selected value changes */
  selector?: (state: T) => unknown
  /** Previous selected value for change detection */
  _prevSelected?: unknown
}
```

## Methods & Properties
### Properties
- **listener**: A callback function invoked when the store state changes. According to the type definition, it receives the full state `T` as an argument.
- **selector**: An optional function that extracts a specific value from the state. When present, the store uses this to determine if the listener should be notified based on whether the selected value has changed (compared