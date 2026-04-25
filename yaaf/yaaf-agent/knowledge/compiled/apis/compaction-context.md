---
summary: Defines the context object provided to a compaction strategy during execution, containing current messages, token counts, and utility functions.
export_name: CompactionContext
source_file: src/context/strategies.ts
category: type
title: CompactionContext
entity_type: api
search_terms:
 - compaction strategy context
 - context object for compaction
 - what data does a strategy receive
 - how to access messages in a strategy
 - token limits during compaction
 - compaction execution environment
 - summarize function in strategy
 - accessing total tokens
 - effective context limit
 - aborting compaction
 - CompactionStrategy parameters
 - message history access
stub: false
compiled_at: 2026-04-24T16:55:58.040Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/context/strategies.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

`CompactionContext` is a TypeScript type that defines the object passed to a `CompactionStrategy` during execution. It serves as a dedicated data structure that provides a strategy with all the necessary information to perform its compaction logic, such as the current message history, token counts, and relevant limits [Source 1].

This object acts as an abstraction layer, giving strategies full access to the data they need without exposing the internal state of the `ContextManager`. This design preserves encapsulation while enabling powerful and flexible compaction logic [Source 1].

## Signature

`CompactionContext` is a type alias for an object with the following properties [Source 1]:

```typescript
export type CompactionContext = {
  /** Current messages in the conversation */
  messages: readonly Message[];

  /** Estimated total tokens across all messages + sections */
  totalTokens: number;

  /** The model's effective context limit (window - output - sections) */
  effectiveLimit: number;

  /** The auto-compact threshold that triggered compaction */
  autoCompactThreshold: number;

  /** Number of previous compactions in this session */
  compactionCount: number;

  /** Summarize function (calls the [[[[[[[[LLM]]]]]]]]) — may be undefined if no adapter */
  summarize?: (params: {
    messages: Message[];
    systemPrompt: string;
    signal?: AbortSignal;
  }) => Promise<string>;

  /** Token estimation function */
  estimateTokens: (text: string) => number;

  /** Abort signal for cancellation */
  signal?: AbortSignal;
};
```

### Properties

| Property               | Type                                                              | Description                                                                                             |
| ---------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `messages`             | `readonly Message[]`                                              | The current list of messages in the conversation history [Source 1].                                    |
| `totalTokens`          | `number`                                                          | The estimated total number of tokens for all current messages and other context sections [Source 1].    |
| `effectiveLimit`       | `number`                                                          | The effective token limit for the context, calculated as the model's window minus reserved output tokens and other sections [Source 1]. |
| `autoCompactThreshold` | `number`                                                          | The token threshold that triggered this compaction event [Source 1].                                    |
| `compactionCount`      | `number`                                                          | The number of times compaction has already occurred in the current session [Source 1].                  |
| `summarize`            | `((...) => Promise<string>) \| undefined`                         | An optional function to invoke an LLM for summarization. It may be undefined if no LLM adapter is configured [Source 1]. |
| `estimateTokens`       | `(text: string) => number`                                        | A utility function to estimate the number of tokens in a given string [Source 1].                       |
| `signal`               | `AbortSignal \| undefined`                                        | An optional `AbortSignal` that can be used to cancel long-running compaction operations [Source 1].     |

## Examples

The primary use of `CompactionContext` is as the sole parameter to the `compact` and `canApply` methods of a custom `CompactionStrategy`.

The following example shows a custom strategy that uses several properties from the `CompactionContext` to decide how to compact the message history.

```typescript
import {
  CompactionStrategy,
  CompactionContext,
  StrategyResult,
} from "yaaf";

class CustomTrimmingStrategy implements CompactionStrategy {
  readonly name = "custom-trimming-strategy";

  async compact(ctx: CompactionContext): Promise<StrategyResult | null> {
    const tokensOverLimit = ctx.totalTokens - ctx.effectiveLimit;

    // If we are not over the limit, do nothing.
    if (tokensOverLimit <= 0) {
      return null;
    }

    console.log(
      `Compaction #${ctx.compactionCount + 1}: Total tokens ${
        ctx.totalTokens
      } exceeds effective limit ${ctx.effectiveLimit}.`
    );

    let tokensToFree = tokensOverLimit;
    let messagesRemoved = 0;
    const newMessages = [...ctx.messages];

    // Remove messages from the beginning until we are under the limit
    while (tokensToFree > 0 && newMessages.length > 1) {
      const removedMessage = newMessages.shift();
      if (removedMessage) {
        const freed = ctx.estimateTokens(JSON.stringify(removedMessage));
        tokensToFree -= freed;
        messagesRemoved++;
      }
    }

    return {
      messages: newMessages,
      summary: `Removed ${messagesRemoved} oldest messages to free up tokens.`,
      messagesRemoved,
      tokensFreed: ctx.totalTokens - ctx.estimateTokens(JSON.stringify(newMessages)),
    };
  }
}
```

## See Also

- `CompactionStrategy`: The interface that all compaction strategies implement, which consumes the `CompactionContext`.
- `StrategyResult`: The object that a `CompactionStrategy` must return after processing the `CompactionContext`.
- `ContextManager`: The class responsible for creating and passing the `CompactionContext` to the configured strategy.

## Sources

[Source 1] src/context/strategies.ts