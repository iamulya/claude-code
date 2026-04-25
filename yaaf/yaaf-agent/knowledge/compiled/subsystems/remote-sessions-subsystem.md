---
summary: Provides an opt-in entry point for WebSocket-based agent sessions, separate from the main YAAF bundle.
primary_files:
 - src/remote.ts
title: Remote Sessions Subsystem
entity_type: subsystem
exports:
 - RemoteSessionServer
 - startRemoteServer
search_terms:
 - WebSocket agent sessions
 - how to use WebSockets with YAAF
 - remote agent control
 - yaaf/remote import
 - startRemoteServer function
 - RemoteSessionServer class
 - real-time agent communication
 - separate bundle for remote sessions
 - opt-in features
 - connecting to agents over network
stub: false
compiled_at: 2026-04-24T18:18:25.358Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/remote.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The Remote Sessions Subsystem provides functionality for creating and managing agent sessions over WebSockets [Source 1]. This feature is designed as an opt-in module and is not included in the main `yaaf` barrel export. This intentional separation ensures that applications not requiring remote connectivity do not incur the bundle size or dependency overhead associated with it. Developers must explicitly import from the `yaaf/remote` entry point to use this functionality [Source 1].

## Architecture

The subsystem is exposed as a distinct module, identified as `remote` in the source code [Source 1]. While the provided source material is a signature-only extract without implementation details, it indicates that the primary architectural components are the exported `RemoteSessionServer` and `startRemoteServer` entities [Source 1]. These components form the public-facing interface for establishing a WebSocket-based server for agent interactions.

## Key APIs

The primary APIs for this subsystem are exposed via the `yaaf/remote` module path.

-   `RemoteSessionServer`: A key entity, likely a class, for managing the server-side logic of remote sessions.
-   `startRemoteServer`: A function, likely a convenience wrapper, to initialize and start the remote session server.

Developers import these APIs directly as shown in the following example [Source 1]:

```ts
import { RemoteSessionServer, startRemoteServer } from 'yaaf/remote';
```

## Sources

[Source 1]: src/remote.ts