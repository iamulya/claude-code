---
summary: Converts an `AgentThread` object into a JSON string, with optional HMAC signing for data integrity.
export_name: serializeThread
source_file: src/agents/thread.ts
category: function
title: serializeThread
entity_type: api
search_terms:
 - save agent state
 - persist agent thread
 - convert thread to JSON
 - store agent conversation
 - thread serialization
 - HMAC signing for threads
 - data integrity for agent state
 - how to save a thread
 - thread to string
 - securely store agent thread
 - stateless agent execution
 - agent state management
stub: false
compiled_at: 2026-04-25T00:13:26.041Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/thread.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `serializeThread` function converts an `AgentThread` object into a JSON string representation [Source 1]. This is a core utility for persisting agent state, enabling stateless execution patterns where an agent's conversation can be saved and resumed later, potentially in a different process or on a different machine [Source 1].

A key feature of `serializeThread` is its optional support for data integrity verification. By providing an `hmacSecret`, the function appends an HMAC-SHA256 signature to the serialized output. This allows the corresponding `deserializeThread` function to verify that the thread data has not been tampered with during storage or transit [Source 1].

This function is essential for use cases such as:
- Saving agent conversations to a database (e.g., DynamoDB, Redis).
- Passing agent state between serverless function invocations.
- Implementing "save/load" functionality in agent-based applications.

## Signature

```typescript
export function serializeThread(thread: AgentThread, hmacSecret?: string): string;
```

### Parameters

| Name         | Type          | Description                                                                                                                                                           |
|--------------|---------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `thread`     | `AgentThread` | The agent thread object to be serialized.                                                                                                                             |
| `hmacSecret` | `string` (optional) | If provided, this secret key is used to generate an HMAC-SHA256 signature that is appended to the JSON output for integrity verification upon deserialization [Source 1]. |

### Returns

A JSON string representing the `AgentThread`. If an `hmacSecret` was provided, the string will include the HMAC signature.

## Examples

### Basic Serialization

This example shows how to convert an `AgentThread` into a simple JSON string for storage.

```typescript
import { createThread, serializeThread } from 'yaaf';

// First, create a sample thread
const thread = createThread("Hello, agent!");

// Serialize the thread to a JSON string
const jsonString = serializeThread(thread);

console.log(jsonString);
// Output will be a JSON string like:
// '{"id":"...","createdAt":"...","updatedAt":"...","step":0,"messages":[{"role":"user","content":"Hello, agent!"}],"done":false}'
```

### Serialization with HMAC Signing

This example demonstrates how to add an HMAC signature to the serialized thread to ensure its integrity.

```typescript
import { createThread, serializeThread, deserializeThread } from 'yaaf';
import { randomBytes } from 'crypto';

// It's critical to use a secure, persistent secret in a real application
const myHmacSecret = randomBytes(32).toString('hex');

const thread = createThread("What is the capital of France?");

// Serialize the thread and sign it with the secret
const signedJsonString = serializeThread(thread, myHmacSecret);

console.log(signedJsonString);
// Output will be a JSON string with an appended signature, e.g.:
// '{"id":...}::sha256::a1b2c3d4...'

// The signature can be verified upon deserialization
try {
  const verifiedThread = deserializeThread(signedJsonString, myHmacSecret);
  console.log('Thread verified successfully:', verifiedThread.id);
} catch (error) {
  console.error('Verification failed:', error);
}
```

## See Also

- `deserializeThread`: The corresponding function to parse and validate a serialized thread string.
- `createThread`: A factory function to create a new `AgentThread`.
- `forkThread`: A function to create a new branch of a thread's history.

## Sources

[Source 1]: src/agents/thread.ts