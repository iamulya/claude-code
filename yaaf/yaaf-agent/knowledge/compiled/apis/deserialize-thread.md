---
summary: Parses a JSON string back into an `AgentThread` object, including validation, system message stripping, and optional HMAC verification.
export_name: deserializeThread
source_file: src/agents/thread.ts
category: function
title: deserializeThread
entity_type: api
search_terms:
 - load agent thread
 - parse thread from JSON
 - restore agent state
 - thread integrity verification
 - HMAC thread signature
 - prevent thread tampering
 - system prompt injection from thread
 - securely load agent conversation
 - rehydrate agent thread
 - thread deserialization
 - validate agent thread
 - stateless agent resume
stub: false
compiled_at: 2026-04-25T00:06:19.074Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/thread.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `deserializeThread` function rehydrates an `AgentThread` object from its JSON string representation. It is the counterpart to `serializeThread` and is essential for restoring agent state from storage, enabling stateless agent execution patterns [Source 1].

This function incorporates several security measures to protect against attacks using tampered thread data [Source 1]:

1.  **Size Limit**: It enforces a maximum size of 50MB for the input JSON to prevent Denial of Service (DoS) attacks via oversized payloads [Source 1].
2.  **[System Prompt](../concepts/system-prompt.md) Stripping**: It automatically removes any messages with the `system` role from the deserialized thread. This is a critical defense against [Prompt Injection](../concepts/prompt-injection.md), as system prompts should only be defined by the agent's configuration and injected by the runner at execution time, never from an external, potentially untrusted thread source [Source 1].
3.  **HMAC Verification**: If an `hmacSecret` is provided, the function verifies an HMAC-SHA256 signature appended to the JSON string. This ensures the thread's integrity and authenticity, rejecting any data that has been tampered with since it was serialized [Source 1].

Use `deserializeThread` whenever you need to load a previously saved agent conversation to resume its execution.

## Signature

```typescript
export function deserializeThread(json: string, hmacSecret?: string): AgentThread;
```

### Parameters

| Name         | Type     | Description                                                                                                                                                                                          |
| :----------- | :------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `json`       | `string` | The JSON string representing the serialized `AgentThread`.                                                                                                                                           |
| `hmacSecret` | `string` | **Optional**. A secret key used to verify the HMAC-SHA256 signature of the thread. If provided, the function will throw an error if the signature is missing, invalid, or does not match the payload. |

### Returns

An `AgentThread` object parsed from the JSON string.

## Examples

### Basic Deserialization

This example shows the basic flow of serializing a thread to a string and then deserializing it back into an object.

```typescript
import { createThread, serializeThread, deserializeThread } from 'yaaf';

// 1. Create a new thread
const originalThread = createThread("Hello, agent!");

// 2. Serialize it for storage
const jsonString = serializeThread(originalThread);
console.log('Serialized:', jsonString);

// 3. Later, deserialize it from storage
const restoredThread = deserializeThread(jsonString);

console.log('Restored Thread ID:', restoredThread.id);
// Expected output: Restored Thread ID: (matches originalThread.id)
```

### Deserialization with HMAC Verification

This example demonstrates using a secret key to ensure the thread has not been tampered with between serialization and deserialization.

```typescript
import { createThread, serializeThread, deserializeThread } from 'yaaf';

const hmacSecret = 'your-super-secret-key-32-bytes-long';

// 1. Create and serialize a thread with an HMAC signature
const originalThread = createThread("This is a secure message.");
const signedJsonString = serializeThread(originalThread, hmacSecret);

// 2. Deserialize with the correct secret to verify integrity
try {
  const verifiedThread = deserializeThread(signedJsonString, hmacSecret);
  console.log('Successfully verified and deserialized thread:', verifiedThread.id);
} catch (error) {
  console.error('Verification failed:', error.message);
}

// 3. Attempt to deserialize with the wrong secret (will throw an error)
try {
  deserializeThread(signedJsonString, 'wrong-secret-key');
} catch (error) {
  console.error('Verification with wrong key failed as expected:', error.message);
}

// 4. Attempt to deserialize tampered data (will throw an error)
const tamperedJsonString = signedJsonString.replace('secure', 'insecure');
try {
  deserializeThread(tamperedJsonString, hmacSecret);
} catch (error) {
  console.error('Verification of tampered data failed as expected:', error.message);
}
```

## See Also

-   [serializeThread](./serialize-thread.md): The function used to create the JSON string that this function consumes.
-   [AgentThread](./agent-thread.md): The type of object returned by this function.
-   [Agent](./agent.md): The primary class that uses threads to manage conversation state.
-   [Prompt Injection](../concepts/prompt-injection.md): A security vulnerability that `deserializeThread` helps mitigate.

## Sources

-   [Source 1]: `src/agents/thread.ts`