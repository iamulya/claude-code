---
summary: A generic type definition for event handler functions used with the YAAF EventBus.
export_name: EventHandler
source_file: src/utils/eventBus.ts
category: type
title: EventHandler
entity_type: api
search_terms:
 - event listener type
 - event callback function
 - EventBus handler signature
 - generic event handler
 - type for event callbacks
 - YAAF event system
 - how to define an event listener
 - event bus callback
 - function signature for events
 - handling framework events
 - "(data: T) => void type"
stub: false
compiled_at: 2026-04-24T17:05:17.081Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/eventBus.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`EventHandler` is a generic TypeScript type alias that defines the signature for functions used as event listeners with the `EventBus` class [Source 1]. It represents a function that accepts a single argument, the event payload, and does not return a value (`void`).

This type is fundamental to the type-safe event system in YAAF. By using a generic parameter `T` for the payload data, it allows the `EventBus` to enforce that handlers receive the correct data type for the specific event they are subscribed to.

## Signature

The `EventHandler` type is defined as a generic function type [Source 1].

```typescript
export type EventHandler<T = unknown> = (data: T) => void;
```

### Parameters

-   **`T`**: A generic type parameter representing the type of the event's payload. It defaults to `unknown` if not specified.
-   **`data`**: The single argument passed to the handler function, containing the event payload of type `T`.

## Examples

The most common use of `EventHandler` is to define a listener function that will be registered with an `EventBus` instance.

```typescript
import { EventBus, EventHandler } from 'yaaf';

// 1. Define the events and their corresponding payload types
type AppEvents = {
  'user:created': { userId: string; email: string };
  'task:completed': { taskId: string };
};

// 2. Create an EventBus instance typed with AppEvents
const appBus = new EventBus<AppEvents>();

// 3. Define a handler function that conforms to the EventHandler signature
//    for the 'user:created' event.
const onUserCreated: EventHandler<{ userId: string; email: string }> = (data) => {
  console.log(`New user created: ID=${data.userId}, Email=${data.email}`);
};

// 4. Register the handler with the event bus
appBus.on('user:created', onUserCreated);

// 5. Emit an event to trigger the handler
appBus.emit('user:created', { userId: 'u-123', email: 'test@example.com' });
// Expected output: New user created: ID=u-123, Email=test@example.com
```

## See Also

-   `EventBus`: The type-safe event emitter class that uses `EventHandler` to manage listeners.

## Sources

[Source 1]: src/utils/eventBus.ts