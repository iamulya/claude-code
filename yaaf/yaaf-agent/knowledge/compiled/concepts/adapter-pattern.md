---
summary: The design principle in YAAF of using well-defined interfaces to ensure swappable backends and testability across the framework.
title: Adapter Pattern
entity_type: concept
stub: false
compiled_at: 2026-04-16T14:32:00.374Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/plugin/types.ts
confidence: 0.9
---

---
title: Adapter Pattern
entity_type: concept
summary: The design principle in YAAF of using well-defined interfaces to ensure swappable backends and testability across the framework.
related_subsystems:
  - plugin
  - agents

## What It Is
The Adapter Pattern is a core architectural principle in YAAF used to decouple the framework's high-level logic from specific third-party integrations or low-level implementations. By defining strict interfaces for various capabilities—such as memory storage, web browsing, or LLM providers—YAAF ensures that developers can swap backends without rewriting agent logic.

This pattern solves several key problems in agent development:
- **Swappable Backends**: Allows switching from local file-based storage to cloud-hosted solutions (like Honcho) or from default truncation strategies to custom semantic compactors by simply registering a different plugin.
- **Composable Capabilities**: Enables the combination of multiple specialized adapters (e.g., a browser adapter plus a specific security guardrail) into a single agent.
- **Testability**: Facilitates unit testing by allowing developers to provide mock implementations of complex adapters.
- **Discoverability**: Provides a mechanism for the framework to automatically route requests to the appropriate implementation based on declared capabilities.

## How It Works in YAAF
The architecture centers around the `PluginHost`, which serves as a central registry and capability index. Every integration in YAAF must implement the base `Plugin` interface and one or more specific adapter interfaces.

### The PluginHost
The `PluginHost` maintains an index keyed by `PluginCapability`. This allows for O(1) lookups of specific adapters without scanning all registered plugins during an agent's execution turn.

### Adapter Interfaces
YAAF defines a wide array of specialized interfaces that plugins can implement:

| Interface | Capability | Purpose |
|-----------|------------|---------|
| `MemoryAdapter` | `memory` | Persistent memory (store, query, search) |
| `BrowserAdapter` | `browser` | Web automation (navigate, interact, scrape) |
| `FileSystemAdapter` | `filesystem` | Virtual filesystem for agent state |
| `ToolProvider` | `tool_provider` | Dynamically contributes tools to every agent turn |
| `ContextProvider` | `context_provider` | Injects context sections into the system prompt |
| `LLMAdapter` | `llm` | Full LLM backend (model, pricing, health checks) |
| `SecurityAdapter` | `security` | Pre/post-call guardrails (allow, block, modify) |
| `ObservabilityAdapter` | `observability` | Logs, metrics, and spans for events |
| `SessionAdapter` | `session` | Swappable conversation persistence (Redis, Postgres) |
| `CompactionAdapter` | `compaction` | Custom context compaction strategies |

### Implementation Mechanism
Every plugin must provide a `name`, `version`, and a list of `capabilities`. The `Plugin` interface also supports lifecycle methods:
- `initialize()`: For async setup like connecting to APIs or spawning processes.
- `destroy()`: For graceful shutdowns and flushing buffers.
- `healthCheck()`: For periodic monitoring by the `PluginHost`.

## Configuration
Developers configure the Adapter Pattern by passing an array of plugin instances to the `Agent.create` method. The framework then automatically wires these adapters into the agent's runtime.

```typescript
import { PluginHost, Agent } from 'yaaf'
import { HonchoPlugin } from 'yaaf/honcho'
import { CamoufoxPlugin } from 'yaaf/camoufox'

const agent = await Agent.create({
  model: 'gpt-4o',
  plugins: [
    new HonchoPlugin({ apiKey: process.env.HONCHO_KEY! }),
    new CamoufoxPlugin({ headless: true }),
  ],
})
```

## Sources
- `src/plugin/types.ts`