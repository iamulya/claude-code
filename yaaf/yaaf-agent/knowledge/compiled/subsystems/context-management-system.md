---
title: Context Management System
entity_type: subsystem
summary: Handles token-budget-aware context window management for YAAF agents.
primary_files:
 - src/index.ts
search_terms:
 - what is context window
 - how to manage LLM context
 - token budget management
 - context length limit
 - LLM prompt size
 - YAAF context manager
 - agent prompt construction
 - managing conversation history
 - preventing context overflow
 - token-aware context
 - context window strategy
 - prompt engineering framework
stub: false
compiled_at: 2026-04-24T18:11:34.328Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/index.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The [Context Management](./context-management.md) System is a core subsystem within the YAAF framework responsible for managing the content sent to a Large Language Model ([LLM](../concepts/llm.md)) [Source 1]. Its primary function is to construct prompts that adhere to the token limits of the target model's [Context Window](../concepts/context-window.md). This involves selecting and arranging information such as system instructions, user queries, conversation history, and tool definitions in a way that respects the available "[Token Budget](../concepts/token-budget.md)" [Source 1].

## Architecture

The provided source material identifies the Context Manager as one of the six core subsystems of YAAF but does not detail its internal architecture, key classes, or their specific roles [Source 1].

## Key APIs

The provided source material does not specify the public APIs exported by the Context Management System [Source 1].

## Sources

[Source 1]: src/index.ts