---
title: Internal Communication
entity_type: subsystem
summary: The messaging infrastructure that decouples YAAF subsystems using a type-safe event bus.
primary_files:
  - src/utils/eventBus.ts
exports:
  - EventBus
  - EventHandler
stub: false
compiled_at: 2026-04-16T14:39:31.319Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/utils/eventBus.ts
confidence: 0.85
---

## Purpose
The Internal Communication subsystem provides a centralized, type-safe messaging infrastructure designed to decouple various components within the YAAF framework. By utilizing an event-driven architecture, subsystems can communicate state changes and lifecycle events without maintaining direct dependencies on one another. This ensures that the framework remains modular and extensible.

## Architecture
The subsystem is built around a generic event emitter pattern. It allows for the definition of strictly typed event maps, ensuring that event names and their associated payloads are validated at compile-time.

### Key Components
- **EventBus**: The central class responsible for managing event subscriptions and dispatching. It is generic, accepting a type record that maps event names to their respective data structures.
- **EventHandler**: A functional type definition for callbacks that process event data.

## Integration Points
The framework utilizes the `EventBus` across several core areas to maintain loose coupling:
- **Orchestrator**: Emits agent lifecycle events to notify other subsystems of state transitions.
- **Task Manager**: Emits events related to task status changes, allowing for reactive updates across the framework.

## Key APIs
### EventBus
The `EventBus` class is the primary interface for internal messaging. It requires a type definition that maps event keys to their payload types.

```typescript
type AppEvents = {
  'user:login': { userId: string };
  'task:complete': { taskId: string; result: unknown };
};

const bus = new EventBus<AppEvents>();

bus.on('user:login', ({ userId }) => {
  console.log(`User ${userId} logged in`);
});

bus.emit('user:login', { userId: '42' });
```

#### Methods
- `on(event, handler)`: Registers a listener for a specific event type.
- `emit(event, data)`: Synchronously invokes all handlers registered for the given event with the provided payload.

## Extension Points
Developers can extend the internal communication capabilities by defining custom event maps when instantiating the `EventBus`. This allows plugins or specialized agent implementations to maintain type safety while introducing new event types to the framework's ecosystem. Since the `EventBus` is generic, it can be used to create isolated communication channels for specific subsystems or plugins.