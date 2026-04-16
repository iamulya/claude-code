---
title: RemoteSessionServer
entity_type: api
summary: The primary class for managing remote WebSocket connections to YAAF agents.
export_name: RemoteSessionServer
source_file: src/remote.ts
category: class
stub: false
compiled_at: 2026-04-16T14:32:33.426Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/remote.ts
confidence: 0.9
---

## Overview
`RemoteSessionServer` is the primary class used to manage remote WebSocket connections for LLM-powered agents within the YAAF framework. It serves as an opt-in entry point for developers who require remote session capabilities. 

By design, this class is not included in the main `yaaf` barrel export. This separation ensures that the core framework remains lightweight for users who do not need WebSocket-based remote connectivity. To use this class, it must be imported explicitly from the `yaaf/remote` module.

## Signature / Constructor
The `RemoteSessionServer` is exported from the `src/remote.ts` file. 

*(Note: Specific constructor parameters and property definitions are not provided in the current source material.)*

## Examples
To use the `RemoteSessionServer`, it must be imported from the specific remote module:

```ts
import { RemoteSessionServer, startRemoteServer } from 'yaaf/remote';
```

## See Also
* `startRemoteServer` (Function used in conjunction with this class)