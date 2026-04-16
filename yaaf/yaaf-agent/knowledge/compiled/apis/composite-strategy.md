---
summary: A strategy that allows chaining multiple compaction strategies into a pipeline, attempting each until one succeeds.
export_name: CompositeStrategy
source_file: src/context/strategies.ts
category: class
title: CompositeStrategy
entity_type: api
stub: false
compiled_at: 2026-04-16T14:17:26.593Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/context/strategies.ts
confidence: 1
---

## Overview
The `CompositeStrategy` is a meta-strategy designed to orchestrate multiple context compaction strategies into a single execution pipeline. It allows developers to define a multi-tier approach to context management, typically starting with low-cost, non-destructive operations (such as micro-compaction) and falling back to more intensive methods (such as LLM-based summarization) only when necessary.

This is the recommended approach for production-grade agents, as it enables the framework to attempt "cheap" token-saving measures before resorting to expensive LLM calls.

## Signature / Constructor

```typescript
export class CompositeStrategy implements CompactionStrategy {
  constructor(
    strategies: CompactionStrategy[],
    config?: CompositeStrategyConfig
  )
}

export type CompositeStrategyConfig = {
  /**
   * If true, continue trying strategies even after a partial result
   * (isPartial: true). This allows micro-compact + summarize in one pass.
   * Default: false (stop at first result)
   */
  continueAfterPartial?: boolean
}
```

### Parameters
- `strategies`: An array of `CompactionStrategy` instances to be executed in order.
- `config`: Optional configuration to control the pipeline behavior, specifically whether to stop after the first successful compaction or continue through the chain.

## Methods & Properties

### name
`readonly name: string`
The unique identifier for the strategy, used for logging and debugging purposes.

### canApply
`canApply(ctx: CompactionContext): boolean | Promise<boolean>`
Checks if the composite strategy can handle the current context. It evaluates the child strategies to determine applicability.

### compact
`compact(ctx: CompactionContext): Promise<StrategyResult | null>`
Executes the compaction pipeline. It iterates through the configured strategies in order:
1. It checks if a strategy `canApply` to the current context.
2. It calls the `compact` method of the strategy.
3. If a strategy returns a `StrategyResult`, the composite strategy will either return that result immediately or, if `continueAfterPartial` is set to `true` and the result is marked as `isPartial`, it will continue to the next strategy in the chain.
4. If no strategies produce a result, it returns `null`.

## Examples

### Production Pipeline Configuration
This example demonstrates a multi-tier pipeline that first attempts to clear old tool results before falling back to a full conversation summary.

```typescript
import { 
  CompositeStrategy, 
  TimeBasedMicroCompactStrategy, 
  MicroCompactStrategy, 
  SummarizeStrategy 
} from 'yaaf/context';

const strategy = new CompositeStrategy([
  // 1. Try time-based micro-compact (if idle gap detected)
  new TimeBasedMicroCompactStrategy({ gapThresholdMinutes: 60 }),
  
  // 2. Try regular micro-compact (clear old tool results)
  new MicroCompactStrategy({ keepRecent: 5 }),
  
  // 3. Fall back to full LLM summarization
  new SummarizeStrategy(),
], {
  continueAfterPartial: true // Allow micro-compact + summarize in one pass
});
```

## See Also
- `CompactionStrategy`
- `SummarizeStrategy`
- `MicroCompactStrategy`
- `SessionMemoryStrategy`