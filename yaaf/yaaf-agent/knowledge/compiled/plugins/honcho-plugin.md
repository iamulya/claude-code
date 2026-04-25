---
summary: A YAAF plugin that integrates with Honcho for cloud memory, reasoning, and user modeling, implementing MemoryAdapter and ContextProvider capabilities.
capabilities:
 - memory
 - context
title: Honcho Plugin
entity_type: plugin
search_terms:
 - Honcho integration
 - cloud memory for agents
 - user modeling plugin
 - long-term memory for YAAF
 - how to add memory to an agent
 - context provider plugin
 - persistent agent memory
 - Honcho API key
 - workspaceId configuration
 - peerId for memory
 - agent reasoning service
 - automatic context injection
stub: false
compiled_at: 2026-04-24T18:08:36.500Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/honcho.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The Honcho Plugin integrates YAAF with the Honcho platform, providing cloud-based [Memory](../concepts/memory.md), reasoning, and user modeling services [Source 1]. It is a single-class integration that implements two standard YAAF capabilities: `[[[[[[[[MemoryAdapter]]]]]]]]` for framework-level memory management and `[[[[[[[[ContextProvider]]]]]]]]` for automatic context injection into agent prompts. In addition to these standard interfaces, the plugin instance also exposes Honcho-specific APIs directly, such as `chat`, `search`, and [Session Management](../subsystems/session-management.md) [Source 1].

## Installation

The source material does not specify a package name or installation command. The plugin is imported from the project's integration files [Source 1].

```typescript
import { HonchoPlugin } from 'path/to/yaaf/Integrations/honcho.js';
```

## Configuration

The `HonchoPlugin` is configured via a `HonchoConfig` object passed to its constructor. The available configuration options are detailed below [Source 1].

*   `apiKey` (string, required): The Honcho API key, which can be obtained from `app.honcho.dev`.
*   `workspaceId` (string, required): The top-level isolation unit for data within Honcho.
*   `baseUrl` (string, optional): The base URL for the Honcho API. Defaults to `https://api.honcho.dev`.
*   `timeoutMs` (number, optional): The request timeout in milliseconds. Defaults to `30000`.
*   `defaultPeerId` (string, optional): The default peer identifier to use for memory operations [when](../apis/when.md) one is not otherwise specified.
*   `defaultSessionId` (string, optional): The default session identifier.
*   `contextTokens` (number, optional): The [Token Budget](../concepts/token-budget.md) to use for context. Defaults to `10000`.

### Example

The following example demonstrates how to register the `HonchoPlugin` with a `PluginHost` and access its capabilities [Source 1].

```typescript
import { PluginHost } from 'path/to/yaaf/plugin/host.js';
import { HonchoPlugin } from 'path/to/yaaf/Integrations/honcho.js';
import { MemoryAdapter } from 'path/to/yaaf/plugin/memory.js';

const host = new PluginHost();
await host.register(new HonchoPlugin({
  apiKey: process.env.HONCHO_API_KEY!,
  workspaceId: 'my-app',
  defaultPeerId: 'alice',
}));

// Access the standard memory adapter interface
const memory = host.getAdapter<MemoryAdapter>('memory')!;
await memory.save({ 
  peerId: 'alice',
  content: 'User prefers dark mode',
  role: 'system',
});

// Access Honcho-specific features directly from the plugin
const honcho = host.getPlugin<HonchoPlugin>('honcho')!;
const insight = await honcho.chat('alice', 'What motivates this user?');
```

## Capabilities

The Honcho Plugin implements two standard YAAF capabilities and provides direct access to its own methods [Source 1].

### MemoryAdapter

As a `MemoryAdapter`, the plugin provides a standardized interface for the agent framework to save and retrieve memories. All memory operations are persisted to the Honcho cloud platform, enabling long-term, cross-session memory for agents.

### ContextProvider

As a `ContextProvider`, the plugin facilitates automatic context injection. This allows the framework to enrich agent prompts with relevant information from Honcho's user models and memory stores, tailored to the current interaction.

### Direct API Access

Beyond the standard [Adapter Interfaces](../concepts/adapter-interfaces.md), the `HonchoPlugin` instance can be retrieved from the `PluginHost` to access platform-specific features. These include methods for chat-based reasoning (`chat`), semantic search over memories (`search`), and session management [Source 1].

## Sources

[Source 1] src/[Integrations](../subsystems/integrations.md)/honcho.ts