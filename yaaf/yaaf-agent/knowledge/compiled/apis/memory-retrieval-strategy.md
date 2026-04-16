---
summary: Interface for logic that selects and formats stored memories for inclusion in the system prompt.
export_name: MemoryRetrievalStrategy
source_file: src/memory/strategies.ts
category: interface
title: MemoryRetrievalStrategy
entity_type: api
stub: false
compiled_at: 2026-04-16T14:30:31.182Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/memory/strategies.ts
confidence: 1
---

## Overview
`MemoryRetrievalStrategy` is a core interface in the YAAF memory system. It defines how an agent selects relevant information from persistent storage to inject into the system prompt during the prompt-building phase of the agent loop. 

Unlike extraction strategies which handle writing data, retrieval strategies focus on reading and formatting data to fit within the LLM's context window and token budget. This interface is often implemented as part of a larger `MemoryStrategy` which combines both extraction and retrieval logic.

The framework provides several concrete implementations of this interface:
*   **LLMRetrievalStrategy**: Uses an LLM-powered relevance engine to select memories based on the current query.
*   **RecencyRetrievalStrategy**: Selects the most recently updated memories without requiring an LLM call.
*   **EphemeralBufferStrategy**: Retrieves facts from an in-memory rolling buffer.
*   **SessionMemoryExtractor**: A unified strategy that retrieves structured session notes.

## Signature / Constructor

```typescript
export interface MemoryRetrievalStrategy {
  /** Strategy name for logging */
  readonly name: string

  /**
   * Build the memory section for the current turn's system prompt.
   * Should be token-aware — stay within budget.
   */
  retrieve