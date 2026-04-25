---
summary: An interface defining the common contract for session objects, satisfied by both the core `Session` class and `SessionAdapter` implementations.
export_name: SessionLike
source_file: src/session.ts
category: interface
title: SessionLike
entity_type: api
search_terms:
 - session interface
 - session contract
 - Session vs SessionAdapter
 - polymorphic session handling
 - session object properties
 - how to mock a session
 - session-like object
 - conversation history API
 - agent state management
 - session persistence contract
 - getMessages from session
 - append messages to session
 - agent plan persistence
stub: false
compiled_at: 2026-04-24T17:37:25.344Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/session.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `SessionLike` interface defines a shared contract for session objects within YAAF. It ensures that different session implementations—such as the default filesystem-based `Session` class and sessions managed by a `SessionAdapter` plugin—can be used interchangeably throughout the framework.

This interface provides a consistent API for managing an agent's conversation history, including appending messages, retrieving them, managing ownership, and handling persistence operations like compaction and deletion. By programming against `SessionLike`, utility functions and agent logic can operate on session data without needing to know the specifics of the underlying storage mechanism.

## Signature

```typescript
export interface SessionLike {
  readonly id: string;
  readonly filePath: string;
  readonly messageCount: number;
  readonly owner: string | undefined;
  bind(userId: string): void;
  canAccess(userId: string): boolean;
  getMessages(): readonly ChatMessage[];
  append(messages: ChatMessage[]): Promise<void>;
  compact(summary: string): Promise<void>;
  delete(): Promise<void>;
  setPlan(plan: string): Promise<void>;
  getPlan(): string | null;
}
```

## Methods & Properties

### Properties

*   **`id: string`** (readonly)
    The unique identifier for the session.

*   **`filePath: string`** (readonly)
    The absolute path to the session's `.jsonl` file. This is primarily relevant for the default filesystem backend.

*   **`messageCount: number`** (readonly)
    The total number of messages currently in the session's history.

*   **`owner: string | undefined`** (readonly)
    The ID of the user who "owns" or is bound to this session. Returns `undefined` if the session has not been bound.

### Methods

*   **`bind(userId: string): void`**
    Associates the session with a specific user ID, marking them as the owner.

*   **`canAccess(userId: string): boolean`**
    Checks if a given user ID has permission to access this session. An unbound session is accessible to anyone, while a bound session is only accessible to its owner.

*   **`getMessages(): readonly ChatMessage[]`**
    Returns the complete, ordered history of chat messages in the session as a read-only array.

*   **`append(messages: ChatMessage[]): Promise<void>`**
    Appends one or more `ChatMessage` objects to the end of the session's history and persists the changes.

*   **`compact(summary: string): Promise<void>`**
    Reduces the session's message history to a single summary message to save space and [Context Window](../concepts/context-window.md) tokens. The original history is typically moved to an archive file.

*   **`delete(): Promise<void>`**
    Permanently deletes the session and its associated data from the storage backend.

*   **`setPlan(plan: string): Promise<void>`**
    Saves a plan string to the session, ensuring it survives compaction and restarts. Subsequent calls overwrite the previously stored plan. This is useful for multi-step agent execution where the plan is generated in one turn and executed in subsequent turns.

*   **`getPlan(): string | null`**
    Retrieves the plan previously stored with `setPlan()`. Returns `null` if no plan has been set.

## Examples

### Type Hinting a Utility Function

This example shows a function that can accept any object implementing `SessionLike`, whether it's a standard `Session` or one from a plugin.

```typescript
import { SessionLike, ChatMessage } from 'yaaf';

function logSessionActivity(session: SessionLike): void {
  console.log(`Session ID: ${session.id}`);
  console.log(`Message Count: ${session.messageCount}`);
  if (session.owner) {
    console.log(`Owned by: ${session.owner}`);
  }
}

// This function can now be used with any session object.
// For example, after creating or resuming a session:
// const mySession = await Session.resume('my-agent-session');
// logSessionActivity(mySession);
```

## See Also

*   `Session`: The primary class that implements the `SessionLike` interface for filesystem-based persistence.
*   `SessionAdapter`: The plugin interface for creating custom session storage backends (e.g., Redis, Postgres) that also conform to the `SessionLike` contract.

## Sources

[Source 1]: src/session.ts