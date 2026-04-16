---
title: HonchoPlugin
entity_type: api
summary: The main class for the Honcho integration, implementing memory and context provider interfaces.
export_name: HonchoPlugin
source_file: src/integrations/honcho.ts
category: class
stub: false
compiled_at: 2026-04-16T14:21:35.458Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/integrations/honcho.ts
confidence: 1
---

## Overview
`HonchoPlugin` is a single-class integration for Honcho, providing cloud-based memory, reasoning, and user modeling capabilities. It serves as a bridge between the YAAF framework and the Honcho API, implementing both the `MemoryAdapter` and `ContextProvider` interfaces. This allows it to handle framework-level memory operations and automatic context injection into LLM prompts.

The plugin supports features such as session management, semantic search across messages, and direct interaction with Honcho's reasoning engine.

## Signature / Constructor

```typescript
export class HonchoPlugin extends PluginBase implements MemoryAdapter, ContextProvider {
  constructor(config: HonchoConfig);
}
```

### HonchoConfig
The constructor accepts a configuration object with the following properties:

| Property | Type | Description |
| :--- | :--- | :--- |
| `apiKey` | `string` | **Required.** Honcho API key obtained from app.honcho.dev. |
| `workspaceId` | `string` | **Required.** The top-level isolation unit for data. |
| `baseUrl` | `string` | *Optional.* Base URL for the Honcho API (default: `https://api.honcho.dev`). |
| `timeoutMs` | `number` | *Optional.* Request timeout in milliseconds (default: `30_000`). |
| `defaultPeerId` | `string` | *Optional.* Default peer ID used for memory operations. |
| `defaultSessionId` | `string` | *Optional.* Default session ID for operations. |
| `contextTokens` | `number` | *Optional.* Token budget for context injection (default: `10_000`). |

## Methods & Properties

### Framework Interfaces
As an implementation of `MemoryAdapter` and `ContextProvider`, `HonchoPlugin` provides standard methods for saving/retrieving memory and generating context for LLM requests.

### Honcho-Specific APIs
The plugin exposes direct access to Honcho features:

*   **chat**: Interacts with Honcho's reasoning capabilities (e.g., generating insights about a user).
*   **search**: Performs semantic search across stored messages and representations.
*   **sessions**: Provides access to session management via `HonchoSession` objects.

## Examples

### Basic Registration and Usage
This example demonstrates how to register the plugin and use it via the framework's adapter system.

```typescript
import { PluginHost } from 'yaaf';
import { HonchoPlugin } from 'yaaf/integrations/honcho';

const host = new PluginHost();

await host.register(new HonchoPlugin({
  apiKey: process.env.HONCHO_API_KEY!,
  workspaceId: 'my-app',
  defaultPeerId: 'alice',
}));

// Access via MemoryAdapter interface
const memory = host.getAdapter<MemoryAdapter>('memory')!;
await memory.save({ 
  name: 'User preference', 
  content: 'User prefers dark mode' 
});
```

### Direct Plugin Access
You can also access Honcho-specific features by retrieving the plugin instance directly.

```typescript
const honcho = host.getPlugin<HonchoPlugin>('honcho')!;

// Use Honcho's reasoning to get insights
const insight = await honcho.chat('alice', 'What motivates this user?');

// Perform a search
const results = await honcho.search('dark mode preferences');
```

## See Also
*   `HonchoSession`
*   `HonchoConfig`
*   `HonchoMessage`