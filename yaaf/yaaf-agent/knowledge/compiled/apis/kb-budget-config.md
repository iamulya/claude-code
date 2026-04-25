---
summary: Configuration options related to the token budget for knowledge base operations.
export_name: KBBudgetConfig
source_file: src/knowledge/ontology/index.ts
category: type
title: KBBudgetConfig
entity_type: api
search_terms:
 - knowledge base token limit
 - configure KB context size
 - LLM context window management
 - token budget for retrieval
 - knowledge base memory constraints
 - how to limit KB tokens
 - context stuffing configuration
 - retrieval token budget
 - KB prompt engineering
 - ontology token management
 - YAAF knowledge base config
stub: false
compiled_at: 2026-04-24T17:15:49.604Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/index.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

The `KBBudgetConfig` type is used to define configuration options related to the [Token Budget](../concepts/token-budget.md) for operations involving the YAAF knowledge base [Source 1]. This configuration is crucial for managing how much information from the knowledge base is used in prompts, ensuring that the total token count remains within the [Context Window](../concepts/context-window.md) limits of a given Large Language Model ([LLM](../concepts/llm.md)).

## Signature

The `KBBudgetConfig` type is exported as part of the public API for the [Ontology](../concepts/ontology.md) layer [Source 1]. The specific fields and their types within this configuration object are not detailed in the provided source material.

```typescript
// The detailed definition is not available in the provided source.
export type KBBudgetConfig;
```

## Examples

No usage examples are available in the provided source material.

## Sources

[Source 1]: src/knowledge/ontology/index.ts