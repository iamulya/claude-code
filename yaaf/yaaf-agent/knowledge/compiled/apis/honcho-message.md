---
summary: Represents a message structure used by the Honcho Plugin.
export_name: HonchoMessage
source_file: src/integrations/honcho.ts
category: type
title: HonchoMessage
entity_type: api
search_terms:
 - Honcho plugin message format
 - user assistant message type
 - Honcho chat message structure
 - peerId in Honcho
 - message role type
 - Honcho message metadata
 - how to structure a message for Honcho
 - Honcho integration types
 - YAAF Honcho plugin
 - message object for cloud memory
stub: false
compiled_at: 2026-04-24T17:11:50.665Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/honcho.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `HonchoMessage` type defines the standard structure for a message object used within the Honcho integration. It is the primary data format for representing communications to and from users or assistants [when](./when.md) interacting with the Honcho service for [Memory](../concepts/memory.md), reasoning, and user modeling [Source 1].

This type is used by various methods within the `HonchoPlugin` to ensure that message data is consistently formatted.

## Signature

The `HonchoMessage` type is defined as follows [Source 1]:

```typescript
export type HonchoMessage = {
  peerId: string;
  role: "user" | "assistant";
  content: string;
  metadata?: Record<string, unknown>;
};
```

### Fields

- **`peerId`**: `string`
  - A unique identifier for the user or entity associated with the message.

- **`role`**: `"user" | "assistant"`
  - Specifies the sender of the message. It must be either `"user"` or `"assistant"`.

- **`content`**: `string`
  - The textual content of the message.

- **`metadata`**: `Record<string, unknown>` (optional)
  - An optional object for attaching arbitrary, unstructured data to the message. This can be used for storing contextual information, timestamps, or other application-specific data.

## Examples

### Basic User Message

This example shows how to create a simple message from a user.

```typescript
import type { HonchoMessage } from 'yaaf';

const userMessage: HonchoMessage = {
  peerId: 'user-123',
  role: 'user',
  content: 'What is the weather like today?',
};
```

### Assistant Message with Metadata

This example demonstrates an assistant's response that includes additional metadata.

```typescript
import type { HonchoMessage } from 'yaaf';

const assistantResponse: HonchoMessage = {
  peerId: 'user-123',
  role: 'assistant',
  content: 'The weather is sunny with a high of 75°F.',
  metadata: {
    source: 'weather-api',
    confidence: 0.98,
    timestamp: '2023-10-27T10:00:00Z',
  },
};
```

## See Also

- `HonchoPlugin`: The main class for integrating with the Honcho service.
- `HonchoConfig`: The configuration object for the `HonchoPlugin`.

## Sources

[Source 1]: src/[Integrations](../subsystems/integrations.md)/honcho.ts