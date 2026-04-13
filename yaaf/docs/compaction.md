# Context Compaction

As conversations grow, the token count approaches the model's context limit. YAAF's `ContextManager` monitors the token budget and triggers **compaction** automatically when usage exceeds a configurable threshold. The compaction algorithm is **fully pluggable**.

---

## Architecture

```
  conversation messages (growing)
  ─────────────────────────────────────────────────────────────────►
  │ sys │ u │ a │ u │ a │ tool │ a │ u │ a │ tool │ a │ u │ a │ ...
  └─────────────────────────────────────────────────────────────────

                    ContextManager token budget
  ┌─────────────────────────────────────────────────────────────────┐
  │  system sections  │      messages         │  output reserve     │
  │  (static prompt)  │  ← auto-compact at X% │  (maxOutputTokens)  │
  └─────────────────────────────────────────────────────────────────┘
                              ↑
                    when messages cross threshold:
                    CompactionStrategy fires

                    CompactionStrategy.compact(ctx)
                    ┌──────────────────────────────┐
                    │  receives CompactionContext:  │
                    │  • messages                  │
                    │  • totalTokens               │
                    │  • effectiveLimit            │
                    │  • compactionCount           │
                    │  • summarize() (LLM call)    │
                    └──────────────┬───────────────┘
                                   │
            ┌──────────────────────┼──────────────────────┐
            │                      │                      │
    ┌───────▼───────┐    ┌─────────▼──────┐    ┌─────────▼──────┐
    │ isPartial:true│    │  full replace   │    │   null: skip   │
    │ (micro-compact│    │  (summarize /   │    │                │
    │  continues)   │    │ session-memory) │    │                │
    └───────────────┘    └────────────────┘    └────────────────┘
```

**ContextManager configuration:**

```typescript
import { ContextManager, SummarizeStrategy } from 'yaaf';

const ctx = new ContextManager({
  contextWindowTokens: 200_000,  // model's hard limit
  maxOutputTokens:      16_384,  // output token reserve
  autoCompactThreshold:    0.85, // compact when 85% full (default)
  strategy: new SummarizeStrategy(),
  llmAdapter: myModel,           // needed by Summarize and SessionMemory strategies
});
```

---

## Built-in Strategies

| Strategy | LLM required | Speed | Context preserved | Best for |
|---|---|---|---|---|
| `SummarizeStrategy` | ✅ yes | Slow | High (structured summary) | General purpose fallback |
| `TruncateStrategy` | ❌ no | Instant | Low (oldest messages lost) | Hard budget cap, stateless agents |
| `SlidingWindowStrategy` | ❌ no | Instant | Medium (recency bias) | Agents where recent context matters most |
| `MicroCompactStrategy` | ❌ no | Instant | High (structure preserved) | First-pass, no info loss |
| `TimeBasedMicroCompactStrategy` | ❌ no | Instant | High | Idle resume (cache already expired) |
| `SessionMemoryStrategy` | ✅ yes | Medium | Very high (facts + recent) | Long-running task agents |
| `CompositeStrategy` | Depends | Depends | Best-effort from chain | Production (recommended) |

---

### 1 — Summarize

Full LLM summarization. Replaces all messages with a structured 9-section summary. Mirrors the main repo's `compactConversation()`.

```typescript
import { SummarizeStrategy } from 'yaaf';

new SummarizeStrategy({
  additionalInstructions: 'Focus on TypeScript changes and file paths.',
  onExtractFacts: async (messages) => {
    return messages
      .filter(m => m.role === 'assistant')
      .map(m => m.content as string)
      .slice(-5);
  },
});
```

The default prompt covers:
1. Primary request and intent
2. Key technical concepts
3. Files and code sections
4. Errors and fixes
5. Problem solving
6. All user messages
7. Pending tasks
8. Current work
9. Optional next step

---

### 2 — Truncate

Drops the oldest N% of messages. No LLM call. Use as a cheap emergency valve.

```typescript
import { TruncateStrategy } from 'yaaf';

new TruncateStrategy({ dropRatio: 0.5 }); // drop oldest 50%
```

---

### 3 — Sliding Window

Walks backwards from the newest message, keeping those that fit within a fraction of the token budget. Better than truncate — always retains the most recent context.

```typescript
import { SlidingWindowStrategy } from 'yaaf';

new SlidingWindowStrategy({ targetFraction: 0.6 }); // keep newest 60% of budget
```

---

### 4 — Micro-Compact

Content-clears old tool result messages (replaces verbose output with a placeholder), leaving message _structure_ intact. The LLM can still see which tools were called but not their full output. Modeled after the main repo's `microCompact`.

```typescript
import { MicroCompactStrategy } from 'yaaf';

new MicroCompactStrategy({
  keepRecent: 5,                         // keep the 5 most-recent tool results intact
  compactableTools: new Set(['search']), // only compact these (default: all)
  clearedMessage: '[Tool output cleared to save context]',
});
```

Unlike full compaction, `MicroCompactStrategy` sets `isPartial: true` so a `CompositeStrategy` continues trying the next strategy in the chain in the same pass.

---

### 5 — Time-Based Micro-Compact

Same as Micro-Compact but only fires when the gap since the last assistant message exceeds a threshold. Rationale: after 60+ minutes idle, the LLM's server-side prompt cache has expired anyway, so clearing old tool results before the next request reduces what gets re-tokenized.

```typescript
import { TimeBasedMicroCompactStrategy } from 'yaaf';

new TimeBasedMicroCompactStrategy({
  gapThresholdMinutes: 60, // trigger after 60 min idle
  keepRecent: 5,
});
```

---

### 6 — Session Memory

Extracts structured facts from the conversation, then keeps only the most recent N messages verbatim. Best of both worlds: LLM-quality fact extraction with recent-context preservation. Modeled after the main repo's `sessionMemoryCompact`.

```typescript
import { SessionMemoryStrategy } from 'yaaf';

new SessionMemoryStrategy({
  extractMemory: async (messages) => {
    const result = await myModel.complete({
      messages: [
        ...messages,
        { role: 'user', content: 'Extract key facts and decisions from this conversation.' },
      ],
    });
    return result.content ?? '';
  },
  minTokens:            10_000, // min tokens to keep in recent messages
  minTextBlockMessages: 5,      // min user/assistant messages to keep
  maxTokens:            40_000, // hard cap on kept recent messages
});
```

---

## Production Pipeline

The recommended production setup mirrors the main repo's multi-tier approach:

```
Request N arrives
       │
       ▼
TimeBasedMicroCompact  ──── gap < threshold? ──── skip
       │ gap ≥ threshold
       ▼
  MicroCompact  ──── no old tool results? ──── skip
       │ cleared some
       ▼ (isPartial=true, continueAfterPartial=true)
  SessionMemory  ──── or ──── Summarize (fallback)
       │
       ▼
  Messages replaced, token count drops
```

```typescript
import {
  ContextManager,
  CompositeStrategy,
  TimeBasedMicroCompactStrategy,
  MicroCompactStrategy,
  SessionMemoryStrategy,
  SummarizeStrategy,
  defaultCompactionPipeline,
} from 'yaaf';

// Option A: battery-included factory (recommended)
const ctx = new ContextManager({
  contextWindowTokens: 200_000,
  maxOutputTokens: 16_384,
  llmAdapter: myModel,
  strategy: defaultCompactionPipeline({
    summarizeInstructions: 'Always preserve TypeScript type signatures.',
    onExtractFacts: async (messages) => extractFacts(messages),
  }),
});

// Option B: full manual composition
const strategy = new CompositeStrategy([
  new TimeBasedMicroCompactStrategy({ gapThresholdMinutes: 60 }),
  new MicroCompactStrategy({ keepRecent: 5 }),
  new SessionMemoryStrategy({ extractMemory: myExtractor }),
  new SummarizeStrategy({ additionalInstructions: '...' }), // final fallback
], { continueAfterPartial: true }); // micro + session in one pass
```

---

## Writing a Custom Strategy

Implement `CompactionStrategy`:

```typescript
import type {
  CompactionStrategy,
  CompactionContext,
  StrategyResult,
} from 'yaaf';

class KeyMessageStrategy implements CompactionStrategy {
  readonly name = 'key-message';

  canApply(ctx: CompactionContext): boolean {
    return ctx.messages.length > 20;
  }

  async compact(ctx: CompactionContext): Promise<StrategyResult | null> {
    // Keep only messages containing code blocks or tool calls
    const keyMessages = ctx.messages.filter(m =>
      (typeof m.content === 'string' && m.content.includes('```')) ||
      m.role === 'tool_result'
    );

    if (keyMessages.length >= ctx.messages.length) return null;

    const removed = ctx.messages.length - keyMessages.length;
    const postTokens = keyMessages.reduce(
      (sum, m) => sum + ctx.estimateTokens(
        typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
      ),
      0,
    );

    return {
      messages: keyMessages,
      summary: `[Key-message: ${removed} context messages removed]`,
      messagesRemoved: removed,
      tokensFreed: ctx.totalTokens - postTokens,
    };
  }
}
```
