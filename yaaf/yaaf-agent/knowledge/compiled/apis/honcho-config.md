---
title: HonchoConfig
entity_type: api
summary: Configuration options for initializing the HonchoPlugin, including API keys and workspace settings.
export_name: HonchoConfig
source_file: src/integrations/honcho.ts
category: type
stub: false
compiled_at: 2026-04-16T14:21:39.883Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/integrations/honcho.ts
confidence: 1
---

## Overview
`HonchoConfig` is a configuration object used to initialize the `HonchoPlugin`. It defines the necessary credentials, workspace identifiers, and default behaviors for interacting with the Honcho API, which provides cloud-based memory, reasoning, and user modeling services.

## Signature / Constructor

```typescript
export type HonchoConfig = {
  apiKey: string;
  baseUrl?: string;
  workspaceId: string;
  timeoutMs?: number;
  defaultPeerId?: string;
  defaultSessionId?: string;
  contextTokens?: number;
};
```

## Methods & Properties

| Property | Type | Description |
| :--- | :--- | :--- |
| `apiKey` | `string` | The Honcho API key obtained from the Honcho dashboard (app.honcho.dev). |
| `baseUrl` | `string` | (Optional) The base URL for the Honcho API. Defaults to `https://api.honcho.dev`. |
| `workspaceId` | `string` | The top-level isolation unit for data within Honcho. |
| `timeoutMs` | `number` | (Optional) The request timeout in milliseconds. Defaults to `30_000`. |
| `defaultPeerId` | `string` | (Optional) The default peer ID used for memory operations when one is not explicitly provided. |
| `defaultSessionId` | `string` | (Optional) The default session ID for operations. |
| `contextTokens` | `number` | (Optional) The token budget for context injection. Defaults to `10_000`. |

## Examples

### Basic Configuration
This example demonstrates initializing the Honcho plugin with the minimum required configuration.

```typescript
import { PluginHost } from './plugin-host';
import { HonchoPlugin, HonchoConfig } from './integrations/honcho';

const config: HonchoConfig = {
  apiKey: process.env.HONCHO_API_KEY!,
  workspaceId: 'my-production-app',
  defaultPeerId: 'system-user'
};

const host = new PluginHost();
await host.register(new HonchoPlugin(config));
```

### Advanced Configuration
Configuration including custom timeouts and token budgets.

```typescript
const advancedConfig: HonchoConfig = {
  apiKey: 'hc_...',
  workspaceId: 'analytics-engine',
  baseUrl: 'https://custom.honcho.proxy',
  timeoutMs: 60000,
  contextTokens: 4096,
  defaultPeerId: 'default-user',
  defaultSessionId: 'global-session'
};
```

## See Also
- `HonchoPlugin`
- `MemoryAdapter`
- `ContextProvider`