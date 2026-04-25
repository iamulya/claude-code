---
summary: The object returned by `createServer`, providing control and information about the running HTTP server.
export_name: ServerHandle
source_file: src/runtime/server.ts
category: type
title: ServerHandle
entity_type: api
search_terms:
 - stop http server
 - get server port
 - server control object
 - createServer return value
 - graceful shutdown
 - programmatically close server
 - find server url
 - manage agent server
 - server lifecycle control
 - YAAF server handle
 - HTTP server management
stub: false
compiled_at: 2026-04-25T00:13:37.949Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/runtime/server.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `ServerHandle` type defines the object returned by the [createServer](./create-server.md) function. This handle provides a way to programmatically interact with the running HTTP server instance. Its primary purposes are to allow for graceful shutdown and to provide information about the server's listening address, such as the port and base URL.

This is particularly useful in scenarios like integration testing, where a server needs to be started and stopped automatically, or in applications that manage the server's lifecycle as part of a larger process.

## Signature

The `ServerHandle` is a TypeScript type definition for an object with the following properties [Source 1]:

```typescript
export type ServerHandle = {
  /** Close the server */
  close: () => Promise<void>;
  /** Port the server is listening on */
  port: number;
  /** Base URL */
  url: string;
};
```

## Methods & Properties

### `close()`

- **Signature**: `() => Promise<void>`
- **Description**: A function that gracefully shuts down the HTTP server. It stops accepting new connections and waits for existing ones to complete before closing. It returns a promise that resolves when the server has been fully stopped [Source 1].

### `port`

- **Type**: `number`
- **Description**: The port number the server is currently listening on. This is especially useful if the port was dynamically assigned by the operating system (e.g., by passing `port: 0` to [createServer](./create-server.md)) [Source 1].

### `url`

- **Type**: `string`
- **Description**: The base URL of the running server, including the protocol, host, and port (e.g., `http://localhost:3000`) [Source 1].

## Examples

### Basic Usage and Graceful Shutdown

This example demonstrates creating a server, accessing its URL, and setting up a signal handler for graceful shutdown using the `server.close()` method.

```typescript
import { Agent } from 'yaaf';
import { createServer, ServerHandle } from 'yaaf/server';

const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
});

let server: ServerHandle;

async function startServer() {
  server = await createServer(agent, {
    port: 3000,
  });

  console.log(`Server running at: ${server.url}`);
}

// Gracefully shut down the server on Ctrl+C
process.on('SIGINT', async () => {
  if (server) {
    console.log('\nShutting down server...');
    await server.close();
    console.log('Server closed.');
    process.exit(0);
  }
});

startServer();
```

## See Also

- [createServer](./create-server.md): The function that creates an HTTP server and returns a `ServerHandle`.

## Sources

- [Source 1]: `src/runtime/server.ts`