---
title: Honcho Plugin
entity_type: plugin
summary: A YAAF plugin providing cloud-based memory, reasoning, and user modeling via the Honcho platform.
capabilities:
  - memory
  - context
stub: false
compiled_at: 2026-04-16T14:21:39.204Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/integrations/honcho.ts
confidence: 1
---

## Overview
The Honcho Plugin integrates the Honcho platform into the YAAF ecosystem, providing cloud-hosted memory, reasoning capabilities, and sophisticated user modeling. It functions as a bridge between the framework and Honcho's API, enabling agents to maintain persistent state, perform semantic searches across interactions, and generate insights about users.

The plugin implements two primary framework interfaces: `MemoryAdapter` for standardized memory operations and `ContextProvider` for automated context injection into LLM prompts.

## Installation
The Honcho Plugin is provided as an integration within the YAAF framework. It requires the core YAAF package as a peer dependency.

```bash
npm install @yaaf/core
```

The plugin can be imported from the integrations path:

```typescript
import { HonchoPlugin } from '@yaaf/core/integrations/honcho';
```

## Configuration
The `HonchoPlugin` is configured via the `HonchoConfig` object during instantiation.

| Property | Type | Description |
| :--- | :--- | :--- |
| `apiKey` | `string` | Honcho API key obtained from app.honcho.dev. |
| `workspaceId` | `string` | The top-level isolation unit for the application. |
| `baseUrl` | `string` | Optional. Base URL for the Honcho API (defaults to `https://api.honcho.dev`). |
| `timeoutMs` | `number` | Optional. Request timeout in milliseconds (defaults to `30_000`). |
| `defaultPeerId` | `string` | Optional. Default identifier for the user or entity in memory operations. |
| `defaultSessionId` | `string` | Optional. Default session identifier. |
| `contextTokens` | `number` | Optional. Token budget for context injection (defaults to `10_000`). |

### Example
```typescript
import { PluginHost } from '@yaaf/core';
import { HonchoPlugin } from '@yaaf/core/integrations/honcho';

const host = new PluginHost();

await host.register(new HonchoPlugin({
  apiKey: process.env.HONCHO_API_KEY!,
  workspaceId: 'production-workspace',
  defaultPeerId: 'user-123',
  contextTokens: 4000
}));

// Accessing via framework adapters
const memory = host.getAdapter<MemoryAdapter>('memory')!;

// Accessing Honcho-specific features directly
const honcho = host.getPlugin<HonchoPlugin>('honcho')!;
```

## Capabilities

### MemoryAdapter
The plugin implements the `MemoryAdapter` interface, allowing the framework to use Honcho as a centralized, cloud-based storage for agent memory. This enables persistence across different runtimes and sessions.

### ContextProvider
As a `ContextProvider`, the plugin automatically manages the retrieval and formatting of relevant information for LLM prompts. It supports:
*   **Token Budgeting**: Ensuring the injected context stays within the configured `contextTokens` limit.
*   **Formatting**: Providing context in either `openai` message format or `raw` strings.
*   **Summarization**: Optional summary-based context retrieval.

### Direct API Features
Beyond the standard framework interfaces, the `HonchoPlugin` exposes native Honcho functionality:
*   **Reasoning (Chat)**: Querying Honcho's reasoning engine about specific peers (e.g., "What are this user's preferences?").
*   **Semantic Search**: Searching through stored messages and representations with relevance scoring.
*   **Session Management**: Managing `HonchoSession` objects for granular interaction tracking.
*   **User Modeling**: Handling `HonchoRepresentation` objects which represent synthesized knowledge about a peer or session.

## Sources
* `src/integrations/honcho.ts`