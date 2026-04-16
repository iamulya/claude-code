---
title: Observability & Cost Management
entity_type: subsystem
summary: The subsystem responsible for monitoring agent performance, token usage, and financial costs.
primary_files:
  - src/utils/costTracker.ts
  - src/utils/logger.ts
exports:
  - CostTracker
  - Logger
  - UsageRecord
  - ModelUsage
  - CostSnapshot
stub: false
compiled_at: 2026-04-16T14:39:10.609Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/utils/costTracker.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/utils/logger.ts
confidence: 0.9
---

## Purpose
The Observability & Cost Management subsystem provides the necessary infrastructure for monitoring the operational health and financial impact of LLM-powered agents. It addresses the need for granular token accounting, real-time cost estimation, and structured logging that can be integrated with external monitoring platforms.

## Architecture
The subsystem is composed of two primary components: the `CostTracker` and the `Logger`.

### CostTracker
The `CostTracker` manages per-model token accounting and USD cost estimation. It tracks several metrics across different models:
- **Token Usage**: Input, output, cache read, and cache write tokens.
- **Financials**: USD cost calculation based on configurable price tables.
- **Session Management**: The state can be captured as a `CostSnapshot`, allowing usage data to be persisted and restored across session boundaries.

### Logger
The `Logger` is a structured, level-based utility that supports namespaces and metadata. It provides standard logging levels: `debug`, `info`, `warn`, and `error`. It is designed to be the central point for agent activity visibility.

## Integration Points
This subsystem integrates closely with the framework's plugin architecture:
- **LLMAdapter Integration**: The `CostTracker` can ingest pricing declarations from registered `LLMAdapter` plugins via a `PluginHost`. This ensures that cost calculations remain accurate as new models are added without requiring hardcoded updates to the core framework.
- **ObservabilityAdapter Integration**: The `Logger` can be linked to a `PluginHost`. When configured, all log entries are fanned out to every registered `ObservabilityAdapter` plugin, enabling integration with external logging services while maintaining local console output.

## Key APIs

### CostTracker
- `record(model: string, usage: UsageRecord)`: Records token usage for a specific model.
- `save()`: Returns a `CostSnapshot` of the current usage state.
- `restore(snapshot: CostSnapshot)`: Static method to recreate a tracker from a saved state.
- `formatSummary()`: Generates a human-readable string breakdown of usage and costs.

### Logger
- `info(message: string, metadata?: object)`: Logs an informational message.
- `error(message: string, metadata?: object)`: Logs an error message.
- `setMinLevel(level: LogLevel)`: Static method to globally configure the minimum logging threshold.
- `setPluginHost(host: PluginHost)`: Static method to register a host for fanning out logs to observability plugins.

## Configuration
The subsystem is configured through both static methods and plugin registration:
- **Log Levels**: Developers can control verbosity using `Logger.setMinLevel()`.
- **Pricing Tables**: Pricing is dynamically updated by passing a `PluginHost` to the `CostTracker` constructor, which aggregates pricing data from all active LLM providers.

## Extension Points
The subsystem is extended primarily through the plugin system:
- **Pricing Strategies**: By implementing `LLMAdapter` plugins, developers can introduce new models and their associated costs.
- **Log Sinks**: By implementing `ObservabilityAdapter` plugins, developers can direct log streams to third-party platforms (e.g., Datadog, Sentry, or custom ELK stacks).