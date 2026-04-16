---
title: EventHandler
entity_type: api
summary: A generic type definition for callback functions handled by the EventBus.
export_name: EventHandler
source_file: src/utils/eventBus.ts
category: type
stub: false
compiled_at: 2026-04-16T14:39:28.628Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/utils/eventBus.ts
confidence: 0.9
---

## Overview
`EventHandler` is a generic TypeScript type used to define the signature of callback functions that listen for events emitted by the `EventBus`. It ensures that the data passed to a listener is correctly typed according to the event's payload definition, facilitating type-safe internal communication between subsystems such as the orchestrator and the task manager.

## Signature
```typescript
export type EventHandler<T = unknown> = (data: T) => void
```

### Type Parameters
| Parameter | Description | Default |
| :--- | :--- | :--- |
| `T` | The type of the data payload passed to the handler function. | `unknown` |

## Examples

### Basic Usage
Defining a handler for a specific interface to ensure type safety when processing event data.

```typescript
import { EventHandler } from './src/utils/eventBus';

interface AgentMessage {
  sender: string;
  content: string;
}

const handleMessage: EventHandler<AgentMessage> = (data) => {
  console.log(`${data.sender} sent: ${data.content}`);
};
```

### Usage with EventBus
The `EventHandler` is typically used implicitly when registering listeners on an `EventBus` instance.

```typescript
type AppEvents = {
  'user:login': { userId: string };
};

// The callback passed to bus.on matches the EventHandler signature
bus.on('user:login', ({ userId }) => {
  console.log(`User ${userId} logged in`);
});
```

## See Also
- `EventBus`