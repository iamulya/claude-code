---
title: Cost Management
summary: Manages token usage accounting and USD cost estimation across LLM interactions, supporting session persistence and dynamic pricing via plugins.
primary_files:
 - src/utils/costTracker.ts
entity_type: subsystem
exports:
 - CostTracker
 - UsageRecord
 - ModelUsage
 - CostSnapshot
search_terms:
 - LLM cost tracking
 - token usage accounting
 - estimate API costs
 - how to track OpenAI costs
 - YAAF cost tracker
 - session cost persistence
 - LLM adapter pricing
 - model usage summary
 - calculate token cost
 - agent cost management
 - USD cost estimation
 - save and restore usage
stub: false
compiled_at: 2026-04-24T18:12:03.003Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/costTracker.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The Cost Management subsystem provides a centralized mechanism for tracking token consumption and estimating the associated monetary (USD) cost of interactions with Large Language Models ([LLM](../concepts/llm.md)s) [Source 1]. Its primary purpose is to offer detailed, per-model accounting for input, output, and cached tokens. This allows developers to monitor and manage the operational costs of an agent. The subsystem is designed to support [Session Persistence](../concepts/session-persistence.md), enabling usage data to be saved and restored across application restarts or different execution contexts [Source 1]. It also generates formatted summaries suitable for logging or display in user interfaces.

## Architecture

The core of the subsystem is the `CostTracker` class, which maintains the state of token usage and costs for all models used during an agent's session [Source 1]. Internally, it stores a collection of `ModelUsage` objects, each keyed by a model identifier (e.g., 'gpt-4o'). A `ModelUsage` object aggregates the total input tokens, output tokens, cache-related tokens, number of API calls, and the cumulative `costUSD` for a single model [Source 1].

Cost calculation is based on a configurable price table that maps models to their per-token costs. The subsystem supports a snapshot-based persistence model. The `save()` method serializes the entire state into a `CostSnapshot` object, which includes detailed usage for all models, total costs, and timestamps. A new `CostTracker` instance can be rehydrated from this snapshot using the static `restore()` method [Source 1].

## Integration Points

The Cost Management subsystem integrates with the [Plugin System](./plugin-system.md) to dynamically update its pricing information. If a `PluginHost` instance is provided to the `CostTracker` constructor, the subsystem will automatically merge pricing declarations from all registered `LLMAdapter` plugins [Source 1]. This design decouples the cost tracker from specific model providers and ensures that the pricing table remains accurate as new models are added via plugins, without requiring manual updates to a central configuration file.

## Key APIs

- **`CostTracker`**: The primary class for instantiating and managing a cost tracking session [Source 1].
- **`CostTracker.record(model: string, usage: UsageRecord)`**: Records a new token usage event for a specified model. The `UsageRecord` includes counts for input, output, and optional cache tokens [Source 1].
- **`CostTracker.save(): CostSnapshot`**: Creates a serializable snapshot of the current usage and cost data, suitable for session persistence [Source 1].
- **`CostTracker.restore(snapshot: CostSnapshot): CostTracker`**: A static method that creates a new `CostTracker` instance from a previously saved snapshot [Source 1].
- **`CostTracker.formatSummary(): string`**: Returns a formatted, human-readable string summarizing the usage and cost breakdown per model [Source 1].
- **`CostTracker.totalCostUSD: number`**: A property that provides the total estimated USD cost accumulated during the session [Source 1].

## Extension Points

The primary extension mechanism for the Cost Management subsystem is through the YAAF plugin architecture. Developers can implement `LLMAdapter` plugins that, in addition to providing an interface to an LLM, also declare the pricing for the models they support. [when](../apis/when.md) the `CostTracker` is initialized with a `PluginHost`, it automatically discovers and incorporates this pricing information, allowing the system to be extended with new models and their associated costs without modifying the core framework [Source 1].

## Sources

[Source 1]: src/utils/costTracker.ts