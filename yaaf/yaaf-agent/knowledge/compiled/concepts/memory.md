---
title: Memory
entity_type: concept
summary: A core concept in YAAF for providing agents with long-term, persistent information that extends beyond a single conversation or context window.
related_subsystems:
 - "[Memory System](../subsystems/memory-system.md)"
see_also:
 - "[Persistent Memory](./persistent-memory.md)"
 - "[Semantic Memory](./semantic-memory.md)"
 - "[Memory Relevance](./memory-relevance.md)"
 - "[Context Window Management](./context-window-management.md)"
 - "[MemoryStore](../apis/memory-store.md)"
 - "[MemoryRelevanceEngine](../apis/memory-relevance-engine.md)"
 - "[MemoryAdapter](./memory-adapter.md)"
search_terms:
 - long term agent memory
 - how to give agent memory
 - persistent agent state
 - YAAF memory store
 - agent knowledge retention
 - semantic memory search
 - vector memory store
 - memory relevance engine
 - context injection from memory
 - file-based memory
 - memory taxonomy
 - user preferences memory
stub: false
compiled_at: 2026-04-25T00:21:28.475Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/prompts.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/honcho.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/memoryStore.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/relevance.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/vectorMemory.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/prompt/systemPrompt.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/auditLog.ts
compiled_from_quality: unknown
confidence: 1
---

## What It Is

Memory in YAAF is the mechanism that enables agents to retain and recall information across multiple conversations, sessions, and invocations. It addresses the inherent statelessness of Large Language Models (LLMs) by providing a persistent store for facts, user preferences, project context, and other crucial information that extends beyond the immediate [Context Window](./context-window.md).

YAAF's [Memory System](../subsystems/memory-system.md) is designed to be flexible and supports multiple strategies for storing and retrieving information, primarily categorized into:

1.  **Persistent, Structured Memory**: A file-based system for storing explicit facts and knowledge with a defined taxonomy. This is ideal for information like user preferences, project goals, or specific feedback [Source 3].
2.  **Semantic Memory**: A vector-based system for retrieving information based on conceptual similarity rather than exact keywords. This is used for searching large corpora of documents or unstructured data [Source 5].

The core purpose of the memory system is to provide relevant, long-term context to the agent just-in-time, without overwhelming its token budget [Source 4].

## How It Works in YAAF

The memory system in YAAF is a multi-component architecture involving storage, retrieval, and context injection.

### Storage Mechanisms

YAAF offers two primary, built-in storage mechanisms, which can be extended by plugins.

**1. File-Based Persistent Memory (`MemoryStore`)**

The `MemoryStore` class provides a persistent, file-based memory system that organizes information into a closed four-type taxonomy [Source 3]:

| Type | Scope | Description |
|---|---|---|
| `user` | Private | User's role, goals, preferences, and knowledge. |
| `feedback` | Flexible | Corrections and confirmations of the agent's approach. |
| `project` | Team | Ongoing work, goals, deadlines, and key decisions. |
| `reference` | Team | Pointers to external systems, documentation, and resources. |

Each memory is stored as an individual Markdown file with YAML frontmatter. This design intentionally excludes information that is derivable from the current state of a codebase (like code patterns or git history) to prevent the memory from becoming a stale cache [Source 3].

A central `MEMORY.md` file acts as a table of contents, providing a high-level summary of all memories that is loaded into every conversation context [Source 3, Source 4].

**2. Vector-Based Semantic Memory (`VectorStoreAdapter`)**

For [Semantic Memory](./semantic-memory.md), YAAF defines a `VectorStoreAdapter` plugin capability. The framework includes a default in-process implementation, `VectorMemoryPlugin`, which uses TF-IDF and cosine similarity for semantic retrieval. This is suitable for up to ~10,000 documents. For larger-scale applications, this default implementation can be replaced by more robust, production-grade vector databases (e.g., Chroma, Qdrant, Pgvector) through community or custom plugins that adhere to the same interface [Source 5].

### Retrieval and Context Injection

Storing memory is only half the problem; it must be retrieved efficiently and injected into the agent's prompt at the right time.

The `MemoryRelevanceEngine` is responsible for this process. Instead of loading all memories into the context, which would be inefficient and costly, it uses a multi-step approach [Source 4]:

1.  The `MEMORY.md` index is always loaded into the [System Prompt](./system-prompt.md).
2.  The engine scans the frontmatter (name and description) of all individual memory files.
3.  It uses a fast, cost-effective [LLM](./llm.md) (e.g., Claude Sonnet) to select a small number (e.g., ≤5) of the most relevant memories based on the current user query.
4.  Only the content of these selected memories is injected as context for the current [Agent Turn](./agent-turn.md).

This process keeps the prompt lean while giving the agent access to a potentially vast store of long-term memories [Source 4].

The retrieved memory content is typically added to the `SystemPromptBuilder` as a dynamic section. This ensures the memory is re-evaluated on every turn, preventing prompt-caching issues and keeping the context fresh [Source 1, Source 6].

### Extensibility via Adapters

YAAF's memory system is provider-agnostic. The `MemoryAdapter` interface allows plugins to provide alternative memory backends. For example, the `HonchoPlugin` implements `MemoryAdapter` to offer cloud-based memory, reasoning, and user modeling services, replacing the local file-based storage [Source 2].

## Configuration

Developers interact with and configure the memory system at several levels.

**Configuring the `MemoryStore`:**

The file-based `MemoryStore` is instantiated with paths to private and team-scoped memory directories.

```typescript
import { MemoryStore } from 'yaaf';

const memStore = new MemoryStore({
  privateDir: '/home/user/.agent/memory',
  teamDir: '/home/user/.agent/memory/team',
});

await memStore.save({
  name: 'User prefers terse output',
  description: 'Skip summaries, let diffs speak',
  type: 'feedback',
  content: 'No trailing summaries.\n**Why:** "I can read the diff"',
  scope: 'private',
});
```
[Source 3]

**Configuring the `MemoryRelevanceEngine`:**

The relevance engine requires a function to call an LLM for the selection step.

```typescript
import { MemoryRelevanceEngine } from 'yaaf';

// Assume callSonnet is a function that interacts with an LLM
const relevanceEngine = new MemoryRelevanceEngine(async ({ system, userMessage, maxTokens }) => {
  const response = await callSonnet({ system, messages: [{ role: 'user', content: userMessage }], maxTokens });
  return response.text;
});

// Find relevant memories for a query
const relevantMemories = await relevanceEngine.findRelevant(
  'How do I configure the build system?',
  allMemoryHeaders,
);
```
[Source 4]

**Injecting Memory into the System Prompt:**

Memory is added to the prompt builder as a dynamic section to ensure it is re-evaluated for each turn.

```typescript
import { SystemPromptBuilder } from 'yaaf';

const builder = new SystemPromptBuilder()
  // ... other sections
  .addDynamic('memory', () => memStore.buildPrompt(), 'memory is updated per turn');

const systemPrompt = await builder.build();
```
[Source 6]

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/prompts.md
[Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/honcho.ts
[Source 3]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/memoryStore.ts
[Source 4]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/relevance.ts
[Source 5]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/vectorMemory.ts
[Source 6]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/prompt/systemPrompt.ts