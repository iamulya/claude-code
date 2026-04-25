---
summary: A generic, type-safe event emitter class used throughout YAAF for framework-internal communication and subsystem decoupling.
export_name: EventBus
source_file: src/utils/eventBus.ts
category: class
title: EventBus
entity_type: api
search_terms:
 - event emitter
 - publish subscribe pattern
 - pub/sub
 - decoupling components
 - framework internal events
 - type-safe events
 - how to listen for agent events
 - custom event handling
 - message bus
 - event listener
 - emit event
 - on event
stub: false
compiled_at: 2026-04-24T17:05:13.507Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/eventBus.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `EventBus` is a generic, type-safe event emitter class. It provides a publish-subscribe mechanism for communication within the YAAF framework, enabling different subsystems to interact without being directly coupled to one another [Source 1].

This class is used extensively for framework-internal communication. For example, the orchestrator might use it to emit agent lifecycle events, and a task manager could use it to broadcast status changes [Source 1]. By using a generic type parameter, `EventBus` ensures that event names and their corresponding payload shapes are known at compile time, preventing common runtime errors.

## Signature / Constructor

The `EventBus` class is generic and accepts a type parameter that defines the mapping of event names to their payload types [Source 1].

```typescript
export class EventBus<Events extends Record<string, unknown> = Record<string, unknown>> {
  // constructor and methods
}
```

The `Events` type parameter is a record where keys are string literals representing event names, and values are the types of the data payload for each event.

A related type, `EventHandler`, defines the signature for functions that can listen to events:

```typescript
export type EventHandler<T = unknown> = (data: T) => void;
```

## Methods & Properties

While the full implementation is not detailed in the source, the following public methods can be inferred from its usage examples [Source 1].

### on()

Registers an event handler for a given event type. The handler function will be called every time the event is emitted.

**Signature:**
```typescript
on<K extends keyof Events>(eventName: K, handler: EventHandler<Events[K]>): void;
```

- **`eventName`**: The name of the event to listen for.
- **`handler`**: A callback function that receives the event payload.

### emit()

Dispatches an event, calling all registered handlers for that event type with the provided data payload.

**Signature:**
```typescript
emit<K extends keyof Events>(eventName: K, data: Events[K]): void;
```

- **`eventName`**: The name of the event to emit.
- **`data`**: The payload to pass to the event handlers.

## Examples

The following example demonstrates how to define an event map, create an `EventBus` instance, register a listener, and emit an event [Source 1].

```typescript
// 1. Define the event map with event names and payload types
type AppEvents = {
  'user:login': { userId: string };
  'task:complete': { taskId: string; result: unknown };
};

// 2. Create a new EventBus instance with the AppEvents type
const bus = new EventBus<AppEvents>();

// 3. Register a listener for the 'user:login' event
bus.on('user:login', ({ userId }) => {
  console.log(`User ${userId} logged in`);
});

// 4. Emit the 'user:login' event with the correct payload
bus.emit('user:login', { userId: '42' });
// Output: User 42 logged in
```

## Sources

[Source 1]: src/utils/eventBus.ts