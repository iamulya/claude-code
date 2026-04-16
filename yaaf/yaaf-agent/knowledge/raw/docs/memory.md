# Memory Strategies

YAAF provides a **pluggable memory strategy system** that decouples _when_ and _how_ an agent extracts knowledge from the conversation from _how_ that knowledge is retrieved at prompt-build time. The design is inspired directly by the multi-tier memory architecture in the Claude Code main repository.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Agent.run(query)                            │
└────────────────────────────┬────────────────────────────────────────┘
                             │
              ┌──────────────▼──────────────┐
              │      buildMemoryPrefix()     │
              │  (called before every turn)  │
              └──────────────┬──────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
  ┌──────▼──────┐    ┌───────▼───────┐    ┌─────▼──────┐
  │memoryStrategy│   │ memoryStrategy │    │legacy memory│
  │.shouldExtract│   │  .extract()    │    │ .buildPrompt│
  │ (threshold?) │   │ (LLM call or  │    │  (MemStore) │
  └──────┬───────┘   │  file write)  │    └─────┬───────┘
      yes│           └───────────────┘          │
         │                                       │
  ┌──────▼────────┐                              │
  │ memoryStrategy│                              │
  │  .retrieve()  │                              │
  │ (select facts)│                              │
  └──────┬────────┘                              │
         │                                       │
         └──────────────┬────────────────────────┘
                        │
              ┌─────────▼──────────┐
              │   memoryPrefix     │
              │  (system prompt    │
              │   injection)       │
              └─────────┬──────────┘
                        │
              ┌─────────▼──────────┐
              │   AgentRunner.run  │
              │  (LLM ↔ tool loop) │
              └────────────────────┘
```

**Two interfaces, one combined type:**

```
MemoryExtractionStrategy          MemoryRetrievalStrategy
─────────────────────────         ──────────────────────────
shouldExtract(ctx) → bool         retrieve(ctx) → RetrievalResult
extract(ctx) → ExtractionResult     .systemPromptSection: string
                                    .selectedMemories: [...]
                                    .tokenEstimate: number

         ┌────────────────────────────────┐
         │         MemoryStrategy         │
         │  (both interfaces combined)    │
         │  + optional initialize()       │
         │  + optional destroy()          │
         └────────────────────────────────┘
```

**`MemoryContext`** — what each strategy receives per turn:

| Field | Type | Description |
|---|---|---|
| `messages` | `ReadonlyArray<{role, content}>` | Current conversation |
| `currentQuery` | `string` | Latest user message |
| `totalTokens` | `number` | Estimated total tokens in context |
| `toolCallsSinceExtraction` | `number` | Tool calls since last extract |
| `recentTools` | `string[]` | Tool names used recently |
| `signal` | `AbortSignal?` | Cancellation signal |

---

## Built-in Strategies

| Strategy | Extraction trigger | Retrieval method | LLM call? | Persistence |
|---|---|---|---|---|
| `SessionMemoryExtractor` | Token + tool-call thresholds | Pass through notes | ✅ yes | File |
| `TopicFileExtractor` | Every N messages | File glob | ✅ yes | File (per topic) |
| `EphemeralBufferStrategy` | Ring buffer auto-evict | Recency | ❌ no | In-memory only |
| `LLMRetrievalStrategy` | Configurable threshold | Semantic LLM selection | ✅ yes | Delegates to store |
| `RecencyRetrievalStrategy` | Configurable threshold | Sort by last-updated | ❌ no | Delegates to store |
| `CompositeMemoryStrategy` | Delegates to extractor | Delegates to retriever | Depends | Depends |
| `HonchoMemoryStrategy` | Per-turn | User model via Honcho API | ✅ yes | Cloud (Honcho) |

---

### 1 — Session Memory Extractor

Mirrors the Claude Code `SessionMemory` system. Extracts structured notes from the conversation via an LLM call (triggered by token/tool-call thresholds). Notes are a structured markdown document that survives context compaction.

```typescript
import { sessionMemoryStrategy, DEFAULT_SESSION_MEMORY_TEMPLATE } from 'yaaf';

const agent = new Agent({
  memoryStrategy: sessionMemoryStrategy({
    // Your LLM call — same model or a smaller/cheaper one
    extractFn: async ({ messages, currentNotes, systemPrompt, signal }) => {
      return await myModel.complete({
        messages: [...messages, { role: 'user', content: systemPrompt }],
        signal,
      }).then(r => r.content ?? '');
    },
    storagePath: './.memory/session-notes.md',
    minimumTokensToInit: 10_000,       // cold-start threshold
    minimumTokensBetweenUpdate: 5_000, // re-extract every 5k new tokens
    toolCallsBetweenUpdates: 3,        // or every 3 tool calls
    template: DEFAULT_SESSION_MEMORY_TEMPLATE, // customizable structure
  }),
  // ... tools, systemPrompt, etc.
});
```

The default template has 9 sections matching the main repo:
`Current State`, `Task Specification`, `Files and Functions`, `Workflow`,
`Errors & Corrections`, `Codebase Documentation`, `Learnings`, `Key Results`, `Worklog`.

---

### 2 — Topic File Extractor

Writes individual topic files (with frontmatter metadata), one file per concept. Good for agents that accumulate knowledge across many sessions.

```typescript
import { topicMemoryStrategy } from 'yaaf';

const agent = new Agent({
  memoryStrategy: topicMemoryStrategy({
    store: myMemoryStore,
    extractFn: async ({ messages }) => {
      // Return named topic → content pairs
      const result = await myModel.complete({ messages, /* ... */ });
      return JSON.parse(result.content ?? '[]');
    },
    extractEveryNMessages: 10,
  }),
});
```

---

### 3 — Ephemeral Buffer

Zero-persistence, zero-LLM. Keeps the last N facts in a ring buffer. Ideal for short-lived agents or when you want memory behaviour without external storage.

```typescript
import { ephemeralBufferStrategy } from 'yaaf';

const agent = new Agent({
  memoryStrategy: ephemeralBufferStrategy({
    maxEntries: 50,  // ring buffer size
    extractEvery: 5, // extract every 5 messages
  }),
});
```

---

### 4 — LLM Retrieval

Extract with any strategy, retrieve with the LLM. The LLM reads a list of memory headers and picks which ones are relevant to the current query.

```typescript
import { llmRetrievalStrategy } from 'yaaf';

const agent = new Agent({
  memoryStrategy: llmRetrievalStrategy({
    queryFn: async ({ query, memories }) => {
      const result = await myModel.complete({
        messages: [{ role: 'user', content:
          `Select relevant memories for: "${query}"\n\nMemories:\n${memories}` }],
      });
      return JSON.parse(result.content ?? '[]');
    },
    store: myMemoryStore,
    maxMemories: 10,
  }),
});
```

---

### 5 — Recency Retrieval

No LLM needed. Simply sorts by `updatedAt` and takes the most recent N memories.

```typescript
import { recencyRetrievalStrategy } from 'yaaf';

const agent = new Agent({
  memoryStrategy: recencyRetrievalStrategy({
    store: myMemoryStore,
    maxMemories: 5,
  }),
});
```

---

## Composing Strategies

Mix and match extraction and retrieval independently:

```typescript
import {
  CompositeMemoryStrategy,
  TopicFileExtractor,
  LLMRetrievalStrategy,
} from 'yaaf';

// Extract to topic files, retrieve with LLM selection
const agent = new Agent({
  memoryStrategy: new CompositeMemoryStrategy({
    extraction: new TopicFileExtractor({ store: myStore, extractFn }),
    retrieval:  new LLMRetrievalStrategy({ queryFn, store: myStore }),
  }),
});
```

**Common compositions:**

| Use case | Extraction | Retrieval |
|---|---|---|
| Long coding sessions | `SessionMemoryExtractor` | pass-through notes |
| Research/knowledge base | `TopicFileExtractor` | `LLMRetrievalStrategy` |
| Low-latency / no LLM budget | `EphemeralBufferStrategy` | `RecencyRetrievalStrategy` |
| Cloud + user modeling | `HonchoMemoryStrategy` | (built-in to Honcho) |
| Full control | Custom extractor | Custom retriever |

---

## Honcho Integration

[Honcho](https://honcho.dev) is a cloud memory service for LLM applications. YAAF wraps it as a first-class `MemoryStrategy`:

```typescript
import { HonchoPlugin, honchoMemoryStrategy } from 'yaaf';

const honcho = new HonchoPlugin({
  apiKey:      process.env.HONCHO_API_KEY!,
  workspaceId: 'my-app',
  userId:      'user-123',
});
await honcho.initialize();

const agent = new Agent({
  memoryStrategy: honchoMemoryStrategy(honcho),
  // ... tools, systemPrompt, etc.
});
```

Honcho provides user modeling (dialect, preferences, engagement patterns) in addition to raw memory storage — the retrieved section includes both memory entries and a user representation paragraph.

---

## Writing a Custom Strategy

Implement `MemoryStrategy` (combines extraction + retrieval):

```typescript
import type {
  MemoryStrategy,
  MemoryContext,
  ExtractionResult,
  RetrievalResult,
} from 'yaaf';

class RedisMemoryStrategy implements MemoryStrategy {
  readonly name = 'redis-memory';

  async initialize() { await this.redis.connect(); }

  shouldExtract(ctx: MemoryContext): boolean {
    return ctx.messages.length % 20 === 0;
  }

  async extract(ctx: MemoryContext): Promise<ExtractionResult> {
    const facts = await extractFacts(ctx.messages);
    await this.redis.set(`memory:${Date.now()}`, JSON.stringify(facts));
    return { extracted: true, factsExtracted: facts.length };
  }

  async retrieve(ctx: MemoryContext): Promise<RetrievalResult> {
    const keys  = await this.redis.keys('memory:*');
    const facts = await Promise.all(keys.slice(-10).map(k => this.redis.get(k)));
    const section = `## Memory\n${facts.filter(Boolean).join('\n')}`;
    return {
      systemPromptSection: section,
      selectedMemories: facts.map((f, i) => ({ name: keys[i]!, content: f! })),
      tokenEstimate: Math.ceil(section.length / 4),
    };
  }
}

const agent = new Agent({ memoryStrategy: new RedisMemoryStrategy(), /* ... */ });
```
