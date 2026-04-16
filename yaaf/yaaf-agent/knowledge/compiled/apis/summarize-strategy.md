---
summary: A compaction strategy that uses an LLM to generate a structured summary of the conversation history, replacing old messages.
export_name: SummarizeStrategy
source_file: src/context/strategies.ts
category: class
title: SummarizeStrategy
entity_type: api
stub: false
compiled_at: 2026-04-16T14:06:38.982Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/compaction.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/context/strategies.ts
confidence: 1
---

## Overview
`SummarizeStrategy` is a built-in context compaction strategy that leverages a Large Language Model (LLM) to condense conversation history. It is considered the "gold standard" for context preservation in YAAF, as it generates a structured summary rather than simply dropping messages.

When triggered by a `ContextManager`, the strategy sends the entire conversation to the LLM with a structured prompt. It replaces all existing messages with a single summary message. The default prompt generates a 9-section summary covering:
1. Primary request and intent
2. Key technical concepts
3. Files and code sections
4. Errors and fixes
5. Problem solving
6. All user messages
7. Pending tasks
8. Current work
9. Optional next steps

This strategy requires an LLM adapter to be configured on the `ContextManager`. While it provides high context preservation, it is slower than non-LLM strategies like `TruncateStrategy` or `SlidingWindowStrategy` due to the required inference call.

## Signature / Constructor

```typescript
export class SummarizeStrategy implements CompactionStrategy {
  constructor(config?: SummarizeStrategyConfig);
}

/**
 * Configuration for the SummarizeStrategy.
 */