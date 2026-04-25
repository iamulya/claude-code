---
summary: The pattern and mechanisms for different YAAF subsystems to communicate without tight coupling.
title: Inter-Subsystem Communication
entity_type: concept
related_subsystems:
 - Orchestrator
 - Task Manager
search_terms:
 - subsystem decoupling
 - event bus pattern
 - framework internal events
 - how do YAAF components talk
 - loose coupling in agents
 - publish-subscribe model
 - typed event emitter
 - agent lifecycle events
 - task status changes
 - communicating between orchestrator and task manager
 - YAAF eventing system
stub: false
compiled_at: 2026-04-24T17:56:21.218Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/eventBus.ts
compiled_from_quality: unknown
confidence: 0.85
---

## What It Is

Inter-Subsystem Communication refers to the design pattern and underlying mechanism used within YAAF to allow its various components, or subsystems, to interact and share information without being directly dependent on one another. This approach, known as loose coupling, is a core architectural principle of the framework.

The primary problem this pattern solves is the prevention of a monolithic and rigid architecture. Without a dedicated communication layer, subsystems would need direct references to each other, making the framework harder to maintain, extend, and test. By decoupling components, YAAF ensures that subsystems can evolve independently and that new functionality can be integrated with minimal impact on existing code. For example, the Orchestrator can signal agent lifecycle events without needing to know which other subsystems, such as a logger or a state manager, might be interested in those events [Source 1].

## How It Works in YAAF

YAAF implements inter-subsystem communication using a publish-subscribe pattern, facilitated by a generic, type-safe event bus [Source 1]. The central implementation is the `EventBus` class, located in `src/utils/eventBus.ts` [Source 1].

The mechanism operates as follows:
1.  **Publishing (Emitting):** A subsystem can "emit" a named event, broadcasting that a specific action has occurred. The event is accompanied by a data payload relevant to that event.
2.  **Subscribing (Listening):** Other subsystems can register "event handlers" (listener functions) for specific event names using an `on` method. [when](../apis/when.md) an event is emitted, the event bus invokes all registered handlers for that event name, passing them the event's data payload.

A key feature of YAAF's `EventBus` is its type safety. The framework defines a map of event names to their corresponding payload types. This allows the TypeScript compiler to verify that subsystems are emitting events with the correct data structure and that listeners are prepared to handle that structure, preventing a common class of runtime errors [Source 1].

For instance, the Task Manager might emit a `task:complete` event with a payload containing the task ID and result. The Orchestrator, or any other interested subsystem, can subscribe to this event to react to the task's completion without either component having a direct dependency on the other [Source 1].

The following example from the source code demonstrates the basic usage of the `EventBus`:

```typescript
// Example of the EventBus API
type AppEvents = {
  'user:login': { userId: string };
  'task:complete': { taskId: string; result: unknown };
};

const bus = new EventBus<AppEvents>();

// A subsystem subscribes to an event
bus.on('user:login', ({ userId }) => {
  console.log(`User ${userId} logged in`);
});

// Another subsystem emits an event
bus.emit('user:login', { userId: '42' });
```
[Source 1]

## Sources

[Source 1] src/utils/eventBus.ts