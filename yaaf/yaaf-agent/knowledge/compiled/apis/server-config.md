---
summary: Configuration options for the YAAF HTTP server, including CORS, rate limiting, and Dev UI settings.
export_name: ServerConfig
source_file: src/runtime/server.ts
category: type
title: ServerConfig
entity_type: api
stub: false
compiled_at: 2026-04-16T14:33:01.398Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/runtime/server.ts
confidence: 1
---

## Overview
`ServerConfig` is the configuration object used to customize the behavior of the YAAF HTTP server runtime. It defines network settings, security policies (such as CORS and rate limiting), lifecycle hooks for request processing, and metadata exposure for the agent. It is passed as the second argument to the `createServer` function.

## Signature
```typescript
export type ServerConfig = {
  port?: number
  host?: string
  cors?: boolean
  corsOrigin?: string
  name?: string
  version?: string
  maxBodySize?: number
  rateLimit?: number
  beforeRun?: (input: string, req: IncomingMessage) => string | Promise<string>
  afterRun?: (input: string, response: string, req: IncomingMessage) => void | Promise<void>
  routes?: Record<string, RouteHandler>
  onStart?: (port: number) => void
  timeout?: number
  devUi?: boolean
  model?: string
  systemPrompt?: string
  multiTurn?: boolean
}
```

## Methods & Properties

| Property | Type | Description |
| :--- | :--- | :--- |
| `port` | `number` | The port the server listens on. Defaults to `3000`. |
| `host` | `string` | The hostname to bind to. Defaults to `'0.0.0.0'`. |
| `cors` | `boolean` | Whether to enable CORS headers. Defaults to `true`. |
| `corsOrigin` | `string` | Allowed origins for CORS. Defaults to `'*'`. |
| `name` | `string` | The agent's display name, exposed via the `/info` endpoint. |
| `version` | `string` | The agent's version string, exposed via the `/info` endpoint. |
| `maxBodySize` | `number` | Maximum request body size in bytes. Defaults to `1048576` (1MB). |
| `rateLimit` | `number` | Basic rate limiting defining the maximum requests per minute per IP address. Defaults to `60`. |
| `beforeRun` | `Function` | A hook called before the agent processes input. It receives the raw input and the `IncomingMessage`, and must return the (potentially modified) input string. |
| `afterRun` | `Function` | A hook called after the agent generates a response. It receives the input, the response, and the `IncomingMessage`. |
| `routes` | `Record<string, RouteHandler>` | A map of custom route handlers to extend the server's functionality. |
| `onStart` | `Function` | A callback function executed when the server successfully starts. |
| `timeout` | `number` | Request timeout in milliseconds. Defaults to `120000` (2 minutes). |
| `devUi` | `boolean` | If `true`, serves a built-in chat interface at the root (`/`) path for local testing. Defaults to `false`. |
| `model` | `string` | A model identifier (e.g., 'claude-3-5-sonnet') exposed in the UI inspector and `/info` endpoint. |
| `systemPrompt` | `string` | If provided, exposes the agent's system prompt via the `/info` endpoint and the Dev UI settings. |
| `multiTurn` | `boolean` | If `true`, the server accepts a `history` array in request bodies and prepends it to the agent's input for multi-turn conversation context. Defaults to `false`. |

## Examples

### Basic Configuration
```typescript
import { Agent } from 'yaaf';
import { createServer } from 'yaaf/server';

const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
});

const server = createServer(agent, {
  port: 8080,
  name: 'AssistantService',
  version: '1.0.0',
  devUi: true,
  cors: true
});
```

### Advanced Configuration with Hooks
```typescript
const server = createServer(agent, {
  multiTurn: true,
  model: 'gpt-4o',
  beforeRun: (input, req) => {
    console.log(`Request from ${req.socket.remoteAddress}`);
    return input.trim();
  },
  afterRun: (input, response) => {
    console.log('Agent successfully responded to query.');
  },
  onStart: (port) => {
    console.log(`Agent server is live on port ${port}`);
  }
});
```

## See Also
* `createServer`
* `ServerHandle`
* `RouteHandler`