---
title: RemoteSessionHandle
entity_type: api
summary: A handle returned by `startRemoteServer` to manage the lifecycle of a remote session server, including stopping it.
export_name: RemoteSessionHandle
source_file: src/remote/sessions.ts
category: type
search_terms:
 - stop remote server
 - close websocket server
 - manage agent server lifecycle
 - startRemoteServer return value
 - how to shut down yaaf server
 - remote session management
 - server handle
 - agent server control
 - graceful shutdown
 - close server connection
stub: false
compiled_at: 2026-04-25T00:11:56.916Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/remote/sessions.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

The `RemoteSessionHandle` is a type representing the object returned by the [startRemoteServer](./start-remote-server.md) function [Source 1]. Its primary purpose is to provide a mechanism for controlling the lifecycle of the running remote session server instance. This handle allows for a graceful shutdown of the server, ensuring that all connections are closed and resources are released properly [Source 1].

You would use this handle when you need to programmatically stop the agent server, for example, during application shutdown, in response to a command, or in a testing environment.

## Signature

While `RemoteSessionHandle` is not explicitly exported as a standalone type definition in the source, its structure is implied by its usage. It is an object containing methods to manage the server instance.

```typescript
export type RemoteSessionHandle = {
  /**
   * Stops the remote session server and closes all active connections.
   * @returns A promise that resolves when the server has fully shut down.
   */
  close: () => Promise<void>;
};
```

## Methods & Properties

### close()

Stops the remote session server, closes the underlying HTTP and WebSocket servers, and terminates all active client connections.

**Signature:**
```typescript
close(): Promise<void>;
```

**Returns:**
- `Promise<void>`: A promise that resolves once the server has completed its shutdown process.

## Examples

The most common use case is to start a server and then use the returned handle to stop it later.

```typescript
import { Agent } from 'yaaf';
import { startRemoteServer, RemoteSessionHandle } from 'yaaf/remote';

const myAgent = new Agent({ systemPrompt: 'You are a helpful assistant.' });
let serverHandle: RemoteSessionHandle | undefined;

async function main() {
  try {
    // Start the server and get the handle
    serverHandle = await startRemoteServer(myAgent, { port: 8080 });
    console.log('Server is running. It will be stopped in 10 seconds.');

    // In a real application, you might wait for a signal like SIGINT
    // to trigger the shutdown.
    await new Promise(resolve => setTimeout(resolve, 10000));

  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    // Use the handle to gracefully shut down the server
    if (serverHandle) {
      console.log('Stopping server...');
      await serverHandle.close();
      console.log('Server stopped.');
    }
  }
}

main();
```
[Source 1]

## See Also

- [startRemoteServer](./start-remote-server.md): The function that creates the remote server and returns a `RemoteSessionHandle`.

## Sources

[Source 1]: src/remote/sessions.ts