---
summary: A YAAF plugin providing cloud-based memory persistence and retrieval via the Honcho API.
capabilities:
  - memory
title: Honcho Memory Strategy
entity_type: plugin
stub: false
compiled_at: 2026-04-16T14:09:12.427Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/memory.md
confidence: 0.9
---

---
title: Honcho Memory Strategy
entity_type: plugin
summary: "A YAAF plugin providing cloud-based memory persistence and retrieval via the Honcho API."
capabilities: ["memory"]
built_in: true

## Overview
The Honcho Memory Strategy is a cloud-integrated memory solution for YAAF agents. It leverages the Honcho platform to provide persistent memory that spans multiple sessions and includes advanced user modeling features. Unlike local file-based strategies, it offloads the storage and semantic processing of memories to a managed service, allowing for complex user profiles that include dialect, preferences, and engagement patterns.

## Installation
The Honcho strategy is provided as part of the core `yaaf` package. It requires an active Honcho account and API key.

```typescript
import { HonchoPlugin, honchoMemoryStrategy } from 'yaaf';
```

## Configuration
To use the strategy, a `HonchoPlugin` instance must be initialized with the appropriate credentials and then passed to the `honchoMemoryStrategy` factory function.

```typescript
import { HonchoPlugin, honchoMemoryStrategy, Agent } from 'yaaf';

// Initialize the Honcho Plugin
const honcho = new HonchoPlugin({
  apiKey:      process.env.HONCHO_API_KEY!,
  workspaceId: 'my-application-id',
  userId:      'user-123',
});

// Plugins must be initialized before use
await honcho.initialize();

const agent = new Agent({
  memoryStrategy: honchoMemoryStrategy(honcho),
  // ... additional agent configuration
});
```

### Parameters
| Parameter | Type | Description |
|---|---|---|
| `apiKey` | `string` | Your Honcho API key. |
| `workspaceId` | `string` | The identifier for the specific application or workspace. |
| `userId` | `string` | The unique identifier for the user whose memory is being managed. |

## Capabilities

### Memory
The Honcho Memory Strategy implements the full `MemoryStrategy` interface, handling both extraction and retrieval:

*   **Extraction**: The strategy processes the conversation per-turn, sending updates to the Honcho API to maintain the user's cloud-based memory profile.
*   **Retrieval**: During the prompt-building phase, the strategy retrieves relevant context from the cloud. The resulting system prompt injection includes:
    *   **Memory Entries**: Specific facts or historical data points retrieved from the store.
    *   **User Representation**: A generated paragraph describing the user's dialect, preferences, and engagement patterns, allowing the LLM to tailor its responses to the specific user.

## Limitations
*   **Network Dependency**: As a cloud-based service, this strategy requires an active internet connection and is subject to the latency of the Honcho API.
*   **External Service**: Usage is subject to Honcho's service availability and API rate limits.

## Sources
- Source 1: Memory Strategies (File: `/docs/memory.md`)