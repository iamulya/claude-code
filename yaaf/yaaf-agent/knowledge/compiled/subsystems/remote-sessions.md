---
title: Remote Sessions
entity_type: subsystem
summary: Opt-in subsystem for WebSocket-based agent sessions, isolated from the main framework export to minimize bundle size and attack surface.
primary_files:
  - src/remote.ts
exports:
  - RemoteSessionServer
  - startRemoteServer
stub: false
compiled_at: 2026-04-16T14:32:27.909Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/remote.ts
confidence: 0.95
---

## Purpose
The Remote Sessions subsystem provides the infrastructure required to run and manage LLM-powered agents over WebSocket connections. It is designed as an opt-in component, intentionally excluded from the primary `yaaf` barrel export. This isolation serves two architectural goals:
1.  **Bundle Optimization**: Minimizes the production bundle size for applications that do not require remote connectivity.
2.  **Security**: Reduces the attack surface by ensuring remote communication capabilities are only loaded when explicitly required by the developer.

## Architecture
The subsystem operates as a standalone entry point within the framework. It facilitates communication between a server-side agent and remote clients using the WebSocket protocol.

### Key Components
*   **RemoteSessionServer**: The core class responsible for orchestrating agent sessions, handling incoming WebSocket connections, and managing the lifecycle of remote interactions.
*   **startRemoteServer**: A convenience utility used to initialize and bootstrap the remote session environment.

## Integration Points
Because this subsystem is isolated, it must be imported via the `yaaf/remote` path rather than the standard framework root.

```ts
import { RemoteSessionServer, startRemoteServer } from 'yaaf/remote';
```

## Key APIs
The following APIs are exported by the `remote` module:

*   **RemoteSessionServer**: Manages the state and connectivity of active agent sessions.
*   **startRemoteServer**: A functional entry point to begin listening for remote session requests.

## Sources
* `src/remote.ts`