---
summary: Defines the signature for custom HTTP route handlers in the YAAF server.
export_name: RouteHandler
source_file: src/runtime/server.ts
category: type
title: RouteHandler
entity_type: api
search_terms:
 - custom server routes
 - add http endpoint
 - createServer routes
 - handle http requests
 - custom API endpoint
 - server routing
 - extend yaaf server
 - add new url to agent server
 - http handler function
 - IncomingMessage ServerResponse
 - custom server logic
stub: false
compiled_at: 2026-04-25T00:12:37.968Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/runtime/server.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `RouteHandler` type defines the function signature for creating custom HTTP endpoints in a YAAF agent server. It allows developers to extend the built-in server functionality created by [createServer](./create-server.md) with their own application-specific logic.

Handlers are registered in the `routes` property of the `ServerConfig` object passed to [createServer](./create-server.md). Each key in the `routes` object is a URL path (e.g., `/my-custom-endpoint`), and the value is a function that conforms to the `RouteHandler` signature.

The handler function receives the standard Node.js `IncomingMessage` and `ServerResponse` objects, along with the pre-parsed request body as a string. This gives developers full control to handle the request and formulate a response. The function can be either synchronous or asynchronous (returning a `Promise`).

## Signature

The `RouteHandler` is a function type with the following signature:

```typescript
import type { IncomingMessage, ServerResponse } from "node:http";

export type RouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  body: string,
) => void | Promise<void>;
```

**Parameters:**

*   `req`: `IncomingMessage` — The standard Node.js HTTP request object, providing access to headers, URL, method, and other request details.
*   `res`: `ServerResponse` — The standard Node.js HTTP response object, used to send headers, status codes, and the response body back to the client.
*   `body`: `string` — The raw request body, which the server reads and provides for convenience.

## Examples

The following example demonstrates how to add custom routes to a YAAF server. A synchronous `/status` endpoint and an asynchronous `/slow-data` endpoint are created.

```typescript
import { Agent } from 'yaaf';
import { createServer, RouteHandler } from 'yaaf/server';

// 1. Create a YAAF agent
const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
});

// 2. Define a synchronous route handler
const statusHandler: RouteHandler = (req, res, body) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  }));
};

// 3. Define an asynchronous route handler
const slowDataHandler: RouteHandler = async (req, res, body) => {
  // Simulate an async operation like a database call
  await new Promise(resolve => setTimeout(resolve, 500));
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ data: 'This data was loaded asynchronously.' }));
};

// 4. Create the server and register the routes
const server = createServer(agent, {
  port: 3000,
  routes: {
    // The key is the URL path, the value is the handler function
    '/status': statusHandler,
    '/slow-data': slowDataHandler,
  },
  onStart: (port) => {
    console.log(`Server running on http://localhost:${port}`);
    console.log('Try: curl http://localhost:3000/status');
    console.log('Try: curl http://localhost:3000/slow-data');
  }
});

// To gracefully shut down the server:
// server.close();
```

## See Also

*   [createServer](./create-server.md): The function that creates the HTTP server and uses `RouteHandler` functions.

## Sources

*   [Source 1]: src/runtime/server.ts