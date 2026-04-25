---
summary: A mechanism in YAAF for combining multiple independent Knowledge Base instances into a single, unified searchable entity for agents.
title: Cross-KB Federation
entity_type: concept
related_subsystems:
 - knowledge
see_also:
 - "[docId](./doc-id.md)"
 - "[Knowledge Domain](./knowledge-domain.md)"
 - "[Tool Use](./tool-use.md)"
search_terms:
 - combine multiple knowledge bases
 - federated knowledge search
 - unified KB for agent
 - namespaced knowledge base
 - how to use multiple KBs
 - FederatedKnowledgeBase class
 - merge knowledge sources
 - trust weight for KB
 - multi-source RAG
 - cross-domain knowledge
 - agent access multiple documents
 - ADR-012
 - score rigging risk
stub: false
compiled_at: 2026-04-25T00:17:55.761Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/federation.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

Cross-KB Federation is a mechanism in YAAF that allows multiple, independent `KnowledgeBase` instances to be combined and presented to an agent as a single, unified entity [Source 1]. This pattern solves the problem of providing an agent with access to diverse and siloed information sources without requiring the agent to manage connections or queries to each source individually. The agent interacts with a single set of tools for searching and retrieving documents, while the federation layer handles routing requests to the appropriate underlying Knowledge Base [Source 1].

## How It Works in YAAF

The core implementation of this concept is the `FederatedKnowledgeBase` class [Source 1]. This class aggregates multiple `KnowledgeBase` instances, each assigned to a unique namespace.

Key features of the federation mechanism include:

*   **Namespacing**: Every document's ID ([docId](./doc-id.md)) is prefixed with the namespace of its parent Knowledge Base, creating a globally unique identifier (e.g., `ml:concepts/attention`). This prevents ID collisions between different KBs [Source 1].
*   **Unified Index**: The agent is presented with a merged index of all documents from all federated KBs. Index entries, search results, and retrieved documents are tagged with their source namespace, providing context about their origin [Source 1]. The `FederatedIndex` type describes this merged view, including total document counts and per-namespace statistics [Source 1].
*   **Unified Tools**: The `FederatedKnowledgeBase` instance generates a standard set of tools (e.g., `search_kb`, `fetch_kb_document`) that operate across all federated KBs. The `search_kb` tool queries all sources simultaneously, and `fetch_kb_document` uses the namespaced [docId](./doc-id.md) to retrieve a specific document [Source 1].
*   **Trust Weighting**: To manage information from sources with varying levels of reliability, each federated KB can be assigned a `trustWeight` between 0.0 and 1.0. This weight acts as a multiplier on the search scores of results from that KB, applied after normalization. It allows operators to programmatically discount information from less-trusted sources, mitigating the risk of a high-scoring but low-quality result outranking a result from a more trusted source. This feature was introduced to address "federated score rigging risk" as noted in ADR-012 [Source 1].

The framework uses specialized types like `NamespacedDocument`, `NamespacedSearchResult`, and `NamespacedIndexEntry` to carry namespace information throughout the search and retrieval process [Source 1].

## Configuration

A `FederatedKnowledgeBase` is created by providing a configuration object where keys are the desired namespaces and values are the `KnowledgeBase` instances or a `FederatedKBEntry` object [Source 1].

A simple federation can be configured as follows:

```typescript
import { KnowledgeBase, FederatedKnowledgeBase } from 'yaaf/knowledge';

const ml = await KnowledgeBase.load('./kb-ml');
const tools = await KnowledgeBase.load('./kb-tools');

const federated = FederatedKnowledgeBase.from({
  ml,
  tools,
});

const agent = new Agent({
  tools: federated.tools(),
  systemPrompt: federated.systemPromptSection(),
});
```
[Source 1]

A more advanced configuration can specify a human-readable `label` for the system prompt and a `trustWeight` for scoring:

```typescript
import { KnowledgeBase, FederatedKnowledgeBase } from 'yaaf/knowledge';

const internalDocs = await KnowledgeBase.load('./kb-internal');
const externalBlog = await KnowledgeBase.load('./kb-blog');

const federated = FederatedKnowledgeBase.from({
  internal: {
    kb: internalDocs,
    label: 'Internal Engineering Documentation',
    trustWeight: 1.0, // High trust
  },
  blog: {
    kb: externalBlog,
    label: 'Public Company Blog',
    trustWeight: 0.75, // Lower trust, scores are reduced by 25%
  },
});
```
[Source 1]

Options such as `toolOptions` and `systemPromptMaxTokens` can also be passed during instantiation to control the behavior of the generated tools and the size of the system prompt section describing the available knowledge bases [Source 1].

## Sources

[Source 1] src/knowledge/store/federation.ts