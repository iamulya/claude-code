---
summary: Provides fundamental utility classes and functions used across the YAAF framework.
primary_files:
 - src/utils/eventBus.ts
title: Core Utilities
entity_type: subsystem
exports:
 - EventBus
 - EventHandler
search_terms:
 - event emitter
 - pub/sub system
 - framework communication
 - decoupling components
 - internal messaging
 - type-safe events
 - how to listen for agent events
 - agent lifecycle notifications
 - task status updates
 - generic event bus
 - publish-subscribe pattern
 - framework helpers
stub: false
compiled_at: 2026-04-24T18:11:49.456Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/eventBus.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Purpose

The Core [Utilities](./utilities.md) subsystem provides a collection of foundational, cross-cutting classes and functions that are used throughout the YAAF framework. Its primary purpose is to offer reusable, generic components that support other major subsystems, promoting code reuse and loose coupling. A key component within this subsystem is the `EventBus`, which facilitates communication between different parts of the framework without creating direct dependencies [Source 1].

## Architecture

The central architectural pattern demonstrated by the utilities in this subsystem is the provision of generic, type-safe components. The `EventBus` is a prime example of this design philosophy [Source 1].

It is implemented as a generic, type-safe event emitter that follows the publish-subscribe pattern. It allows different parts of the system to subscribe to named events and other parts to publish (or emit) those events. The use of TypeScript generics ensures that event payloads are strongly typed, preventing common errors and improving developer experience [Source 1].

The key components are:
- **`EventBus<Events>`**: A generic class that manages event listeners and dispatches events. The `Events` type parameter is a record mapping event names (strings) to their corresponding payload types.
- **`EventHandler<T>`**: A type alias for the function signature of an event listener, which accepts a single argument `data` of type `T` [Source 1].

## Integration Points

The Core Utilities, particularly the `EventBus`, serve as a crucial integration point for decoupling major YAAF subsystems. Other components use the `EventBus` to broadcast significant state changes or lifecycle events to any interested listeners.

For example, the framework's orchestrator might use the event bus to announce agent lifecycle events, while the task manager could emit events for task status changes. This allows other components, including plugins or monitoring [Tools](./tools.md), to react to these events without being tightly coupled to the orchestrator or task manager's implementation [Source 1].

## Key APIs

The primary public API provided by this subsystem is the `EventBus` class and its associated types [Source 1].

### `EventBus<Events>`

A generic, type-safe event emitter class. It is instantiated with a type that defines the available events and their payload shapes.

**Example Usage:**

```typescript
// Define the event map for the application
type AppEvents = {
  'user:login': { userId: string };
  'task:complete': { taskId: string; result: unknown };
};

// Create a new EventBus instance
const bus = new EventBus<AppEvents>();

// Register a listener for the 'user:login' event
bus.on('user:login', ({ userId }) => {
  console.log(`User ${userId} logged in`);
});

// Emit the 'user:login' event with a typed payload
bus.emit('user:login', { userId: '42' });
```
[Source 1]

### `EventHandler<T>`

A type alias representing the function that handles an event.
`type EventHandler<T = unknown> = (data: T) => void;` [Source 1]

## Sources

[Source 1]: src/utils/eventBus.ts