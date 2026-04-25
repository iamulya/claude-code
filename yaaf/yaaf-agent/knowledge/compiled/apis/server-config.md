---
summary: Configuration options for the YAAF HTTP server created by `createServer`.
export_name: ServerConfig
source_file: src/runtime/server.ts
category: type
title: ServerConfig
entity_type: api
search_terms:
 - HTTP server configuration
 - createServer options
 - YAAF server settings
 - configure CORS
 - set server port
 - enable dev UI
 - server rate limiting
 - trust proxy header
 - multi-turn conversation server
 - session management config
 - identity provider setup
 - server custom routes
 - agent API server
stub: false
compiled_at: 2026-04-25T00:13:35.975Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/runtime/server.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`ServerConfig` is a type alias for the configuration object passed to the [createServer](./create-server.md) function. It allows for detailed customization of the production-ready HTTP server that wraps a YAAF [Agent](./agent.md).

This configuration covers a wide range of functionalities including network settings (port, host), security features (CORS, rate limiting, proxy trust), identity and [Session Management](../subsystems/session-management.md), custom routing, lifecycle hooks, and development-time features like the Dev UI [Source 1].

## Signature

`ServerConfig` is a TypeScript type with the following structure [Source 1]:

```typescript
export type ServerConfig = {
  /** Port to listen on. Default: 3000 */
  port?: number;
  /** Hostname to bind to. Default: '0.0.0.0' */
  host?: string;
  /** Enable CORS headers. Default: true */
  cors?: boolean;
  /** Allowed origins for CORS. Default: '*' */
  corsOrigin?: string;
  /** Agent display name (shown in /info) */
  name?: string;
  /** Agent version (shown in /info) */
  version?: string;
  /** Max request body size in bytes. Default: 1MB */
  maxBodySize?: number;
  /** Request timeout in ms. Default: 120000 */
  timeout?: number;
  /**
   * Serve a built-in Dev UI at GET /.
   * Shows a chat interface for testing — ideal for local development.
   * Disable (or omit) in production.
   * Default: false
   */
  devUi?: boolean;
  /**
   * Model identifier exposed in the UI inspector and GET /info.
   * Example: 'gemini-2.0-flash', 'claude-3-5-sonnet'.
   */
  model?: string;
  /**
   * Optionally expose the agent's system prompt via GET /info.
   * Shown read-only in the Dev UI Settings drawer.
   * Default: undefined (not exposed).
   */
  systemPrompt?: string;
  /**
   * When true, the server accepts a `history` array in the request body
   * and prepends it to the agent's input for multi-turn context.
   * Default: false.
   */
  multiTurn?: boolean;

  // --- Rate Limiting ---
  /** Basic rate limiting: max requests per minute per IP. Default: 60 */
  rateLimit?: number;
  /**
   * External rate limit store for multi-instance deployments.
   * When provided, rate limit state is delegated to this store instead of
   * process memory.
   */
  rateLimitStore?: RateLimitStore;
  /**
   * Trust proxy configuration for rate limiting.
   * Controls whether the server trusts `X-Forwarded-For` headers.
   * - `false` (default): Only uses `req.socket.remoteAddress`.
   * - `true`: Trusts the first value in `X-Forwarded-For`.
   * - `number`: Number of trusted proxy hops.
   * **Security:** Only set this when the server is behind a known reverse proxy.
   * @default false
   */
  trustProxy?: boolean | number;

  // --- Hooks & Routes ---
  /** Called before the agent runs. Return modified input. */
  beforeRun?: (input: string, req: IncomingMessage) => string | Promise<string>;
  /** Called after the agent responds. */
  afterRun?: (input: string, response: string, req: IncomingMessage) => void | Promise<void>;
  /** Custom route handlers. */
  routes?: Record<string, RouteHandler>;
  /** Called on server start. */
  onStart?: (port: number) => void;

  // --- Identity & Sessions ---
  /**
   * Identity provider — resolves UserContext from incoming HTTP requests.
   * When set, every /chat request is authenticated before the agent runs.
   */
  identityProvider?: IdentityProvider;
  /**
   * Enable server-side session management.
   * Can be a boolean or a configuration object.
   */
  sessions?: boolean | SessionsConfig;
};

// --- Nested Types ---

/** Configuration for server-side sessions */
export type SessionsConfig = {
  /** Directory for session files (default: .yaaf/sessions/) */
  dir?: string;
  /** Auto-prune sessions older than this (default: no pruning) */
  ttlMs?: number;
  /** Max sessions per user (default: unlimited) */
  maxPerUser?: number;
  /**
   * Optional SessionAdapter plugin — delegates all persistence to an adapter
   * (e.g., Redis, Postgres) instead of the local filesystem.
   */
  adapter?: SessionAdapter;
  /**
   * AES-256-GCM encryption key for session files at rest.
   * Accepts a 64-character hex string or a plain password.
   * Strongly recommended when `identityProvider` is configured.
   */
  encryptionKey?: string;
};

/** Interface for distributed rate limiting */
export interface RateLimitStore {
  checkAndIncrement(key: string, max: number, windowMs: number): Promise<boolean>;
}

/** Type for custom route handlers */
export type RouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  body: string,
) => void | Promise<void>;
```

## Examples

### Basic Configuration

A minimal server configuration specifying the port and enabling the development UI.

```typescript
import { Agent } from 'yaaf';
import { createServer, ServerConfig } from 'yaaf/server';

const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
});

const config: ServerConfig = {
  port: 8080,
  devUi: true,
  name: 'My Assistant',
  version: '1.0.0',
};

const server = createServer(agent, config);

server.then(handle => {
  console.log(`Server running at ${handle.url}`);
});
```

### Advanced Configuration

This example demonstrates a more complex setup with rate limiting, an identity provider for authentication, and persistent, encrypted sessions.

```typescript
import { Agent } from 'yaaf';
import { createServer, ServerConfig } from 'yaaf/server';
import { MyJwtIdentityProvider } from './identity-provider'; // Custom implementation

const agent = new Agent({
  systemPrompt: 'You are a secure corporate assistant.',
});

// Assume this is loaded securely, e.g., from a secrets manager
const SESSION_ENCRYPTION_KEY = process.env.SESSION_KEY;

const config: ServerConfig = {
  port: 3000,
  cors: true,
  corsOrigin: 'https://app.example.com',
  rateLimit: 100, // 100 requests per minute per IP
  trustProxy: 1, // Trust one level of proxy (e.g., an ALB or Nginx)
  identityProvider: new MyJwtIdentityProvider({
    jwksUri: 'https://auth.example.com/.well-known/jwks.json',
  }),
  sessions: {
    ttlMs: 24 * 60 * 60 * 1000, // 24-hour session lifetime
    maxPerUser: 5,
    encryptionKey: SESSION_ENCRYPTION_KEY,
  },
  onStart: (port) => {
    console.log(`Production server started on port ${port}`);
  }
};

const server = createServer(agent, config);
```

## See Also

*   [createServer](./create-server.md): The function that consumes this configuration object to create an HTTP server.
*   [IdentityProvider](./identity-provider.md): The interface for implementing authentication strategies.
*   [Session Management](../subsystems/session-management.md): The subsystem responsible for handling user sessions.
*   [Rate Limiting](../subsystems/rate-limiting.md): The subsystem for controlling request frequency.

## Sources

[Source 1]: src/runtime/server.ts