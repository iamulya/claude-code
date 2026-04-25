---
summary: Configuration options for the Honcho Plugin.
export_name: HonchoConfig
source_file: src/integrations/honcho.ts
category: type
title: HonchoConfig
entity_type: api
search_terms:
 - Honcho plugin setup
 - configure Honcho integration
 - Honcho API key
 - Honcho workspace ID
 - cloud memory configuration
 - user modeling settings
 - Honcho default peer
 - Honcho API URL
 - set Honcho timeout
 - context token budget
 - HonchoPlugin options
stub: false
compiled_at: 2026-04-24T17:11:35.077Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/honcho.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`HonchoConfig` is a TypeScript type alias that defines the configuration object required to instantiate the `HonchoPlugin`. This object provides the necessary credentials and settings to connect to the Honcho cloud service, which offers features like cloud [Memory](../concepts/memory.md), reasoning, and user modeling [Source 1].

This configuration is passed to the `HonchoPlugin` constructor to configure its behavior, including API access, default identifiers for operations, and request timeouts [Source 1].

## Signature

`HonchoConfig` is a type alias for an object with the following properties [Source 1]:

```typescript
export type HonchoConfig = {
  /** Honcho API key from app.honcho.dev */
  apiKey: string;

  /** Base URL for the Honcho API (default: https://api.honcho.dev) */
  baseUrl?: string;

  /** Workspace ID — top-level isolation unit */
  workspaceId: string;

  /** Request timeout in ms (default: 30_000) */
  timeoutMs?: number;

  /** Default peer ID for memory operations */
  defaultPeerId?: string;

  /** Default session ID */
  defaultSessionId?: string;

  /** Context [[[[[[[[Token Budget]]]]]]]] (default: 10_000) */
  contextTokens?: number;
};
```

### Properties

| Property         | Type     | Description                                                  |
| ---------------- | -------- | ------------------------------------------------------------ |
| `apiKey`         | `string` | **Required.** The Honcho API key obtained from `app.honcho.dev`. |
| `baseUrl`        | `string` | Optional. The base URL for the Honcho API. Defaults to `https://api.honcho.dev`. |
| `workspaceId`    | `string` | **Required.** The workspace ID, which acts as a top-level isolation unit in Honcho. |
| `timeoutMs`      | `number` | Optional. The request timeout in milliseconds. Defaults to `30_000`. |
| `defaultPeerId`  | `string` | Optional. A default peer ID to use for memory operations [when](./when.md) one is not explicitly provided. |
| `defaultSessionId`| `string` | Optional. A default session ID to use for operations.      |
| `contextTokens`  | `number` | Optional. The Token Budget for context provided by the plugin. Defaults to `10_000`. |

## Examples

### Basic Configuration

This example shows the minimum required configuration to initialize the `HonchoPlugin` [Source 1].

```typescript
import { PluginHost } from 'yaaf';
import { HonchoPlugin, HonchoConfig } from 'yaaf/honcho';

const config: HonchoConfig = {
  apiKey: process.env.HONCHO_API_KEY!,
  workspaceId: 'my-application-workspace',
};

const host = new PluginHost();
await host.register(new HonchoPlugin(config));
```

### Advanced Configuration

This example demonstrates using optional properties to customize the plugin's behavior, such as setting a default user (peer) and increasing the request timeout [Source 1].

```typescript
import { PluginHost } from 'yaaf';
import { HonchoPlugin, HonchoConfig } from 'yaaf/honcho';

const config: HonchoConfig = {
  apiKey: process.env.HONCHO_API_KEY!,
  workspaceId: 'my-application-workspace',
  defaultPeerId: 'default-user-123',
  timeoutMs: 60000, // 60 seconds
  baseUrl: 'https://api.us.honcho.dev', // Use a different region
};

const host = new PluginHost();
await host.register(new HonchoPlugin(config));
```

## See Also

- `HonchoPlugin`: The plugin that uses this configuration object for initialization.

## Sources

[Source 1] `src/integrations/honcho.ts`