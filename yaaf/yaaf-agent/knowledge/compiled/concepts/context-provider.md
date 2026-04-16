---
title: Context Provider
entity_type: concept
summary: A design pattern for dynamically injecting external data or state into an agent's LLM context window.
related_subsystems:
  - Plugins
  - LLM Context
stub: false
compiled_at: 2026-04-16T14:21:18.863Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/integrations/agentfs.ts
confidence: 0.9
---

## What It Is
A Context Provider is a design pattern and interface in YAAF used to augment a Large Language Model (LLM) context window with dynamic, external data. It solves the problem of maintaining environmental awareness for an agent—such as the state of a filesystem, active tool registries, or session metadata—by automatically injecting relevant information into the prompt before it is sent to the provider.

By using Context Providers, developers can ensure that agents have a "grounded" view of their operating environment without requiring manual prompt engineering for every interaction.

## How It Works in YAAF
In YAAF, the `ContextProvider` is an interface that plugins can implement to participate in the prompt construction lifecycle. When an agent prepares a request, the framework queries registered plugins that fulfill the `ContextProvider` role to gather state data.

A primary implementation of this concept is found in the `AgentFSPlugin`. This plugin serves multiple roles, including acting as a `ContextProvider` to inject a virtual filesystem tree into the LLM context. This allows the agent to understand the directory structure and available files (represented as `TreeEntry` objects) before executing tools.

The mechanism typically follows these steps:
1. **Registration**: A plugin implementing `ContextProvider` is registered with the `PluginHost`.
2. **State Retrieval**: The framework invokes the provider to retrieve current state (e.g., a directory listing or file metadata).
3. **Injection**: The retrieved data is formatted and appended to the LLM's context, providing the model with the necessary background to make informed decisions.

## Configuration
Context Providers are typically configured through the settings of the plugin that implements them. For example, the `AgentFSPlugin` allows developers to define limits on the data that might be injected into the context to manage token budgets and performance.

```typescript
import { PluginHost } from '../plugin/host.js';
import { AgentFSPlugin } from '../integrations/agentfs.js';

const host = new PluginHost();

// Configure the AgentFSPlugin, which acts as a ContextProvider
const agentFS = new AgentFSPlugin({
  maxFileSize: 1048576, // 1MB limit for context injection
  trackChanges: true    // Enable change tracking for context updates
});

await host.register(agentFS);
```

## Sources
- `src/integrations/agentfs.ts`