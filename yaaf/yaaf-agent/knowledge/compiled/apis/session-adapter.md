---
summary: An interface for plugins that provide custom session persistence, allowing YAAF to delegate session storage to external systems like Redis or Postgres.
export_name: SessionAdapter
source_file: src/plugin/types.js
category: interface
title: SessionAdapter
entity_type: api
search_terms:
 - custom session storage
 - persistent agent conversations
 - redis session store
 - postgres session backend
 - database session management
 - how to save agent state
 - distributed session persistence
 - pluggable session backend
 - scaling agent sessions
 - external session adapter
 - YAAF session plugin
 - implementing a session adapter
 - session persistence interface
stub: false
compiled_at: 2026-04-25T00:14:00.350Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/runtime/server.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/session.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `SessionAdapter` is an [adapter interface](../concepts/adapter-interfaces.md) that defines a contract for custom session persistence backends. By implementing this interface, a plugin can take over the responsibility of storing, retrieving, and managing agent conversation histories, decoupling [Session Management](../subsystems/session-management.md) from the default filesystem-based storage [Source 2].

This is essential for production and multi-instance deployments where a centralized, scalable, and durable session store is required. Instead of writing session data to local `.jsonl` files, YAAF can delegate all persistence operations to an external system like Redis, Postgres, or DynamoDB through a `SessionAdapter` implementation [Source 1, Source 2].

The adapter is consumed by the `createServer` runtime and the `Session` class. When an adapter is provided, all session operations, including creation, resumption, and listing, are routed through it [Source 1, Source 2].

## Signature

The `SessionAdapter` interface is not explicitly defined in the provided source material, but its methods can be inferred from its usage within the `Session` class, the `SessionLike` interface, and the `listSessions` function [Source 2]. A compliant implementation would need to provide methods for creating, reading, updating, deleting, and listing sessions.

```typescript
import type { ChatMessage } from "../agents/runner.js";

export interface SessionAdapter {
  /**
   * Retrieves all messages for a given session ID.
   * @param sessionId The unique identifier for the session.
   * @returns A promise that resolves to an array of ChatMessage objects or null if not found.
   */
  read(sessionId: string): Promise<{ messages: ChatMessage[], plan?: string, owner?: string } | null>;

  /**
   * Writes a full message history for a session.
   * @param sessionId The unique identifier for the session.
   * @param messages The array of ChatMessage objects to persist.
   * @returns A promise that resolves when the write is complete.
   */
  write(sessionId: string, messages: ChatMessage[]): Promise<void>;

  /**
   * Deletes a session and all its associated data.
   * @param sessionId The unique identifier for the session.
   * @returns A promise that resolves when the deletion is complete.
   */
  delete(sessionId: string): Promise<void>;

  /**
   * Returns a list of all available session IDs.
   * @returns A promise that resolves to an array of session ID strings.
   */
  list(): Promise<string[]>;

  /**
   * Binds a session to a specific user ID.
   * @param sessionId The session to bind.
   * @param userId The user ID to associate with the session.
   * @returns A promise that resolves when the binding is complete.
   */
  bind(sessionId: string, userId: string): Promise<void>;

  /**
   * Replaces the existing session history with a summary message and a subset of recent messages.
   * @param sessionId The session to compact.
   * @param summary The summary of the compacted conversation.
   * @param remainingMessages The messages to keep after compaction.
   * @returns A promise that resolves when compaction is complete.
   */
  compact(sessionId: string, summary: string, remainingMessages: ChatMessage[]): Promise<void>;

  /**
   * Persists a plan string for a session.
   * @param sessionId The session to update.
   * @param plan The plan string to save.
   * @returns A promise that resolves when the plan is saved.
   */
  setPlan(sessionId: string, plan: string): Promise<void>;
}
```

## Examples

### Using with `createServer`

A `SessionAdapter` can be passed to the `createServer` function to enable centralized session management for an agent exposed as an HTTP API. This is configured within the `sessions` property [Source 1].

```typescript
import { Agent, createServer } from 'yaaf';
import { MyRedisSessionAdapter } from './my-redis-adapter.js';

const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
});

// Assume pluginHost is configured and has a session adapter plugin.
const adapter = pluginHost.getSessionAdapter(); 
// Or instantiate directly: const adapter = new MyRedisSessionAdapter(...);

const server = createServer(agent, {
  port: 3000,
  sessions: {
    // Delegate all session persistence to the adapter
    adapter: adapter,
    ttlMs: 30 * 60_000, // 30 minutes
    maxPerUser: 10,
  },
});

console.log(`Server listening at ${server.url}`);
```

### Using with the `Session` Class

The `Session` class can also use an adapter directly, which is useful for non-server runtimes or for managing sessions programmatically [Source 2].

```typescript
import { Session } from 'yaaf';
import { MyPostgresSessionAdapter } from './my-pg-adapter.js';

const adapter = new MyPostgresSessionAdapter({ connectionString: process.env.DB_URL });

async function main() {
  // Create a new session managed by the adapter
  const session = await Session.create('user-123-conversation-456', undefined, adapter);
  console.log(`Created session with ID: ${session.id}`);

  await session.append([{ role: 'user', content: 'Hello, world!' }]);

  // Later, resume the session from the adapter
  const resumedSession = await Session.resume('user-123-conversation-456', undefined, adapter);
  console.log(`Resumed session with ${resumedSession.messageCount} messages.`);
}

main();
```

## See Also

*   [Session Management](../subsystems/session-management.md): The subsystem that utilizes `SessionAdapter`.
*   [Adapter Interfaces](../concepts/adapter-interfaces.md): The architectural concept for pluggable backends.
*   [createServer](./create-server.md): The server runtime that consumes a `SessionAdapter` for HTTP-based agents.
*   [Session](./session.md): The class responsible for managing an individual conversation's state.
*   [PluginHost](./plugin-host.md): The system used to discover and provide registered adapter plugins.

## Sources

*   [Source 1]: `src/runtime/server.ts`
*   [Source 2]: `src/session.ts`