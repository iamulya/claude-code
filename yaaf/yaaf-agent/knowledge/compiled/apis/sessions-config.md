---
summary: Configuration options for server-side session management within the YAAF HTTP server.
export_name: SessionsConfig
source_file: src/runtime/server.ts
category: type
title: SessionsConfig
entity_type: api
search_terms:
 - server session configuration
 - how to configure sessions
 - session persistence
 - session TTL
 - max user sessions
 - session adapter
 - encrypting session data
 - session storage directory
 - stateful agent server
 - yaaf server sessions
 - SessionAdapter plugin
 - session encryptionKey
 - persistent conversations
stub: false
compiled_at: 2026-04-25T00:14:08.354Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/runtime/server.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`SessionsConfig` is a type that defines the configuration options for enabling and customizing server-side session management in a YAAF agent server created with `[[createServer]]` [Source 1]. It is used within the `ServerConfig` object passed to `[[createServer]]`.

When session management is enabled, the server can maintain conversational state across multiple requests. It automatically creates and resumes sessions based on a `session_id` provided in the request body, persisting session data between calls. This allows for stateful, multi-turn interactions with an agent over a stateless protocol like HTTP [Source 1].

Using `SessionsConfig` allows for fine-grained control over session behavior, including storage location, time-to-live (TTL), user limits, persistence logic, and at-rest encryption [Source 1]. For basic session management with default settings, the `sessions` property in `ServerConfig` can be set to `true`. For custom behavior, an object matching the `SessionsConfig` type is required [Source 1].

When combined with an `[[IdentityProvider]]`, sessions are securely bound to the authenticated user, preventing one user from accessing another's session data [Source 1].

## Signature

`SessionsConfig` is a TypeScript type alias with the following structure:

```typescript
export type SessionsConfig = {
  /** Directory for session files (default: .yaaf/sessions/) */
  dir?: string;

  /** Auto-prune sessions older than this (default: no pruning) */
  ttlMs?: number;

  /** Max sessions per user (default: unlimited) */
  maxPerUser?: number;

  /**
   * Optional SessionAdapter plugin — delegates all persistence to the adapter
   * (Redis, Postgres, DynamoDB, etc.) instead of the local filesystem.
   * When set, `dir` is ignored.
   */
  adapter?: SessionAdapter;

  /**
   * S1-A: AES-256-GCM encryption key for session files at rest.
   * Accepts either a 64-character hex string or a plain password.
   * Strongly recommended whenever `identityProvider` is configured.
   */
  encryptionKey?: string;
};
```

### Properties

*   **`dir?: string`**
    The local filesystem directory where session files are stored. Defaults to `.yaaf/sessions/` in the current working directory. This property is ignored if an `adapter` is provided [Source 1].

*   **`ttlMs?: number`**
    The time-to-live for sessions, in milliseconds. Sessions older than this value may be automatically pruned. If not set, sessions do not expire and are not pruned by default [Source 1].

*   **`maxPerUser?: number`**
    The maximum number of active sessions a single user can have. This requires an `[[IdentityProvider]]` to be configured to identify users. If not set, the number of sessions per user is unlimited [Source 1].

*   **`adapter?: SessionAdapter`**
    An optional plugin that provides a custom persistence layer for sessions, such as a Redis, Postgres, or DynamoDB database. When an adapter is provided, it handles all session storage and retrieval, and the `dir` property is ignored. This is the recommended approach for multi-instance or production deployments [Source 1].

*   **`encryptionKey?: string`**
    A key for AES-256-GCM encryption of session data at rest. This is a critical security feature, especially when sessions contain sensitive information or are associated with user identities. The key can be either a 64-character hex string (representing 32 raw bytes) or a plain password from which a key will be derived using scrypt. When enabled, each line in the session's JSONL file is encrypted independently. This is **strongly recommended** when an `[[IdentityProvider]]` is used [Source 1].

    A secure key can be generated with the command:
    `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
    This key should be stored securely, for example, in a secrets manager like AWS SSM, GCP Secret Manager, or HashiCorp Vault [Source 1].

## Examples

### Basic Session Configuration

This example enables sessions that are stored on the local filesystem, expire after 30 minutes, and limits each user to a maximum of 5 concurrent sessions.

```typescript
import { Agent } from 'yaaf';
import { createServer } from 'yaaf/server';
import { MyJwtProvider } from './my-jwt-provider'; // Example IdentityProvider

const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
});

const server = createServer(agent, {
  port: 3000,
  identityProvider: new MyJwtProvider(),
  sessions: {
    ttlMs: 30 * 60 * 1000, // 30 minutes
    maxPerUser: 5,
  },
});

console.log(`Server running at ${server.url}`);
```

### Secure Session Configuration with Encryption

This example configures sessions with at-rest encryption using a key loaded from environment variables. This is a recommended pattern for production environments.

```typescript
import { Agent } from 'yaaf';
import { createServer, SessionsConfig } from 'yaaf/server';
import { MyJwtProvider } from './my-jwt-provider';

const agent = new Agent({
  systemPrompt: 'You are a secure assistant.',
});

// Load the encryption key from a secure source (e.g., environment variable)
const sessionEncryptionKey = process.env.SESSION_ENCRYPTION_KEY;

if (!sessionEncryptionKey) {
  throw new Error('SESSION_ENCRYPTION_KEY is not set.');
}

const sessionsConfig: SessionsConfig = {
  encryptionKey: sessionEncryptionKey,
  ttlMs: 24 * 60 * 60 * 1000, // 24 hours
};

const server = createServer(agent, {
  port: 3000,
  identityProvider: new MyJwtProvider(),
  sessions: sessionsConfig,
});

console.log(`Server running at ${server.url}`);
```

## See Also

*   [createServer](./create-server.md): The factory function that uses `SessionsConfig`.
*   [Session Management](../subsystems/session-management.md): The subsystem responsible for handling agent state.
*   [IdentityProvider](./identity-provider.md): Used to associate sessions with specific users.
*   `ServerConfig`: The main configuration object for `createServer`.
*   `SessionAdapter`: The plugin interface for custom session persistence.