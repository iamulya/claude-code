---
title: startRemoteServer
entity_type: api
summary: A factory function to initialize and start a remote session server instance.
export_name: startRemoteServer
source_file: src/remote.ts
category: function
stub: false
compiled_at: 2026-04-16T14:32:38.926Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/remote.ts
confidence: 0.9
---

## Overview
`startRemoteServer` is a factory function used to initialize and launch a remote session server. It serves as the primary opt-in entry point for enabling WebSocket-based communication with agents within the YAAF framework.

By design, this function and its associated utilities are excluded from the main `yaaf` barrel export to keep the core library lightweight. It must be imported explicitly from the `yaaf/remote` module when remote session capabilities are required.

## Signature / Constructor
```typescript
export function startRemoteServer(config: any): Promise<RemoteSessionServer>;
```

## Examples
### Importing and Starting the Server
Because the remote session utilities are not part of the default package export, they must be referenced via the `yaaf/remote` subpath.

```typescript
import { RemoteSessionServer, startRemoteServer } from 'yaaf/remote';

async function initializeRemote() {
  const server = await startRemoteServer({
    // Configuration options for the WebSocket server
  });
  
  return server;
}
```

## See Also
* [Source: src/remote.ts]