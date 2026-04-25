---
title: LLMAdapter Capability
summary: A plugin capability that allows plugins to declare LLM model pricing information for integration with the CostTracker.
entity_type: concept
related_subsystems:
 - CostTracker
 - PluginHost
search_terms:
 - plugin model pricing
 - how to add model costs
 - CostTracker plugin integration
 - LLMAdapter pricing
 - dynamic model price table
 - avoid hardcoding model prices
 - token cost estimation
 - YAAF cost tracking
 - plugin declares model cost
 - LLMAdapter plugin
 - automatic price updates
 - extensible cost tracking
stub: false
compiled_at: 2026-04-24T17:57:42.705Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/costTracker.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

The [[]]Adapter]] Capability is a design pattern in YAAF that allows plugins to provide pricing information for the Large Language Models ([LLM](./llm.md)s) they manage. This capability enables the framework's `CostTracker` subsystem to dynamically build a comprehensive price table for various models without requiring developers to hardcode this information centrally [Source 1].

The primary problem this solves is extensibility. By delegating the responsibility of declaring model costs to the plugins that provide those models, YAAF's cost tracking remains accurate and up-to-date even [when](../apis/when.md) new models are introduced via new or updated plugins. This decouples the core cost tracking logic from the specifics of any particular LLM provider or model [Source 1].

## How It Works in YAAF

The integration is facilitated by the interaction between the `PluginHost` and the `CostTracker` subsystems. The `CostTracker` class can be initialized with a reference to a `PluginHost` instance [Source 1].

When a `PluginHost` is provided, the `CostTracker` automatically queries it to find all registered plugins that are of the `LLMAdapter` type. It then extracts pricing declarations from each of these plugins and merges them into its internal price table. This process ensures that any model provided by a registered `LLMAdapter` plugin will have its token usage and associated costs tracked accurately [Source 1].

This mechanism allows the `CostTracker` to maintain a complete and current pricing list by aggregating data directly from the source of each model—the plugin itself [Source 1].

## Sources

[Source 1]: src/utils/costTracker.ts