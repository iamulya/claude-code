---
title: Tool System
entity_type: subsystem
summary: Manages schema-validated tool definitions with permission layers for YAAF agents.
primary_files:
 - src/index.ts
search_terms:
 - agent tools
 - LLM function calling
 - tool use in agents
 - how to define tools for an agent
 - tool schema validation
 - agent tool permissions
 - secure tool execution
 - YAAF tools
 - connecting agents to external APIs
 - agent capabilities
 - defining agent actions
stub: false
compiled_at: 2026-04-24T18:20:44.414Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/index.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The Tool System is a core subsystem of the YAAF framework responsible for managing the [Tools](./tools.md) and capabilities available to an agent. Its primary functions are to handle tool definitions, validate them against a schema, and enforce [Permission Layers](../concepts/permission-layers.md) for their use [Source 1]. This ensures that agents can be equipped with external functionalities in a structured, secure, and predictable manner.

## Architecture

The provided source material does not detail the internal architecture of the Tool System, such as its key classes or their interactions. Based on its stated purpose, the architecture likely includes components for schema definition, a validation engine to check tool definitions against that schema, and a [Permission Management](./permission-management.md) layer to control access [Source 1].

## Key APIs

The provided source material is a signature-only extract and does not contain information on the specific public APIs exposed by the Tool System.

## Sources

[Source 1]: src/index.ts