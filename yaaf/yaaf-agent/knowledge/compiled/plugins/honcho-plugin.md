---
title: HonchoPlugin
entity_type: plugin
summary: A plugin providing cloud-based memory and user modeling via the Honcho service.
capabilities:
  - memory
  - context
stub: false
compiled_at: 2026-04-16T14:10:20.540Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/plugins.md
confidence: 0.95
---

---
title: "HonchoPlugin"
entity_type: "plugin"
summary: "A plugin providing cloud-based memory and user modeling via the Honcho service."
capabilities: ["memory", "context"]
built_in: true

## Overview
The `HonchoPlugin` is a built-in YAAF plugin that integrates with the Honcho service to provide persistent cloud-based memory and automated user modeling. It implements the `MemoryAdapter` and `ContextProvider` interfaces, allowing agents to store information, perform semantic searches, and retrieve synthesized user context for prompt construction.

## Installation
The `HonchoPlugin` is included in the core `yaaf` package. It can be imported directly alongside other framework components.

```typescript
import { HonchoPlugin } from 'yaaf';
```

## Configuration
The plugin requires a Honcho API key and a workspace identifier. It can optionally be scoped to specific users and sessions.

### Constructor Parameters
| Parameter | Type | Description |
|---|---|---|
| `apiKey` | `string` | The API key for the Honcho service. |
| `workspaceId` | `string` | The identifier for the Honcho workspace. |
| `userId` | `string` | (Optional) The user identifier. Defaults to `'default'`. |
| `sessionId` | `string` | (Optional) The session identifier. Auto-generated if omitted. |

### Example
```typescript
import { HonchoPlugin } from 'yaaf';

const honcho = new HonchoPlugin({
  apiKey:      process.env.HONCHO_API_KEY!,
  workspaceId: 'my-workspace',
  userId:      'user-123',
  sessionId:   'session-abc',
});

await honcho.initialize();
```

## Capabilities

### Memory (MemoryAdapter)
As a `MemoryAdapter`, the plugin provides methods to persist and retrieve data. It supports semantic search, which returns relevant memory entries along with a generated user representation paragraph synthesized by the Honcho service.

Key methods implemented:
- `save(entry)`: Persists a `MemoryEntry` to the cloud.
- `get(id)`: Retrieves a specific entry by ID.
- `search(query)`: Performs a semantic search for relevant memories.
- `buildPrompt(entries)`: Formats retrieved entries into a string suitable for LLM prompts.

### Context (ContextProvider)
As a `ContextProvider`, the plugin participates in the framework's context gathering phase. When the `PluginHost` calls `gatherContext()`, the `HonchoPlugin` retrieves relevant user models and historical data to inject into the prompt assembly process.

## Limitations
- **External Dependency**: Requires an active internet connection and a valid Honcho service account.
- **Latency**: As a cloud-based provider, operations are subject to network latency compared to local memory implementations.