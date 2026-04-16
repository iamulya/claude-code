---
summary: A strategy that reduces token usage by clearing the content of old tool results while preserving the overall message structure.
export_name: MicroCompactStrategy
source_file: src/context/strategies.ts
category: class
title: MicroCompactStrategy
entity_type: api
stub: false
compiled_at: 2026-04-16T14:06:47.650Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/compaction.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/context/strategies.ts
confidence: 1
---

## Overview
`MicroCompactStrategy` is a context compaction strategy that reduces token usage by clearing the content of older tool result messages. Unlike full summarization, this strategy preserves the conversation's message structure, allowing the LLM to see which tools were called and in what order, while replacing verbose tool outputs with a placeholder sentinel.

This strategy is typically used as a "first-pass" or "tier-1" compaction method because it is computationally inexpensive (requiring no LLM calls) and maintains high structural fidelity. It returns a result with `isPartial: true`, which allows a `CompositeStrategy` to continue executing subsequent strategies in the same compaction pass if the token budget is still exceeded.

## Signature / Constructor

```typescript
export class MicroCompactStrategy implements CompactionStrategy {
  constructor(config?: MicroCompactStrategyConfig);
}

export type MicroCompactStrategyConfig = {
  /** 
   * Number of most-recent tool results to keep intact. 
   * @default 5 
   */
  keepRecent?: number;
  /**
   * Set of tool names eligible for micro-compaction.
   * @default all tool_result messages are eligible.
   */