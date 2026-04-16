---
title: EventBus
entity_type: api
summary: A generic, type-safe event bus used throughout the framework to decouple subsystems.
export_name: EventBus
source_file: src/utils/eventBus.ts
category: class
stub: false
compiled_at: 2026-04-16T14:39:21.401Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/utils/eventBus.ts
confidence: 0.95
---

## Overview
The `EventBus` is a type-safe event emitter designed for internal framework communication. It serves as a decoupling mechanism between various YAAF subsystems, allowing components to communicate without direct dependencies. Within the framework, it is utilized by the orchestrator for agent lifecycle events and by the task manager for tracking status changes.

## Signature / Constructor

### Class Signature
```typescript
export class EventBus<Events extends Record<string, unknown> = Record<string, unknown>> {
  // implementation details
}
```

### Associated Types
```typescript
export type EventHandler<T = unknown> = (data: T) => void;
```

## Methods & Properties

### on()
Registers a listener for a specific event.
```typescript
on<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): void
```

### emit()
Triggers all listeners associated with a specific event, passing the provided data.
```typescript
emit<K extends keyof Events>(event: K, data: Events[K]): void
```

## Examples

### Basic Usage
The following example demonstrates defining a custom event map and using the bus to emit and listen for events.

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

### Framework Context
In a production-grade agent scenario, the `EventBus` allows the core orchestrator to broadcast lifecycle changes that plugins or monitoring tools can consume:

```typescript
type LifecycleEvents = {
  'agent:start': { timestamp: number };
  'agent:stop': { reason: string };
};

const lifecycleBus = new EventBus<LifecycleEvents>();
```