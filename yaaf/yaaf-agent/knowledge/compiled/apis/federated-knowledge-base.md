---
summary: A class that unifies multiple KnowledgeBase instances under named namespaces, enabling combined search and retrieval.
export_name: FederatedKnowledgeBase
source_file: src/knowledge/store/federation.ts
category: class
title: FederatedKnowledgeBase
entity_type: api
search_terms:
 - combine knowledge bases
 - multiple KBs
 - federated search
 - namespaced knowledge
 - merge KBs
 - unified knowledge base
 - cross-KB search
 - how to use multiple knowledge bases
 - knowledge base federation
 - trust weight for KB
 - ADR-012
 - federated system prompt
 - aggregate knowledge
 - multi-source context
stub: false
compiled_at: 2026-04-25T00:07:14.732Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/federation.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `FederatedKnowledgeBase` class combines multiple `KnowledgeBase` instances into a single, unified entity. It allows an agent to search, browse, and retrieve documents from all member knowledge bases through a single interface [Source 1].

Each member `KnowledgeBase` is assigned a unique namespace. This namespace is used to prefix all document IDs, ensuring there are no collisions. For example, a document with the ID `concepts/attention` in a knowledge base with the namespace `ml` would have the fully qualified ID `ml:concepts/attention` in the federation [Source 1].

This class is used when an agent needs to access information from several distinct and specialized knowledge sources simultaneously. It generates a merged index and a unified set of tools (like `search_kb` and `fetch_kb_document`) that operate across all federated knowledge bases [Source 1].

## Signature / Constructor

`FederatedKnowledgeBase` is instantiated using the static factory method `from()`.

```typescript
// Static factory method
static from(
  config: FederatedKBConfig,
  options?: FederatedKBOptions
): FederatedKnowledgeBase;
```

### `FederatedKBConfig`

The primary configuration is an object where keys are the desired namespaces and values are either a `KnowledgeBase` instance or a `FederatedKBEntry` object [Source 1].

```typescript
export type FederatedKBConfig = Record<string, KnowledgeBase | FederatedKBEntry>;
```

### `FederatedKBEntry`

This type allows for more detailed configuration of each member knowledge base [Source 1].

```typescript
export type FederatedKBEntry = {
  /** The loaded KnowledgeBase instance */
  kb: KnowledgeBase;
  /** Human-readable label for this KB (used in system prompt). Defaults to namespace. */
  label?: string;
  /**
   * Trust weight for this namespace (0.0–1.0). Default: 1.0.
   * Applied as a multiplier to search scores from this KB.
   * Allows operators to discount KBs from less-trusted sources.
   */
  trustWeight?: number;
};
```
The `trustWeight` property is a mitigation for the "federated score rigging risk" described in ADR-012. It allows an operator to reduce the influence of a less-trusted knowledge base in search results [Source 1].

### `FederatedKBOptions`

Optional configuration for the federated instance and its generated tools [Source 1].

```typescript
export type FederatedKBOptions = {
  /** Options passed to the generated tools */
  toolOptions?: KBToolOptions;
  /**
   * Maximum token budget for the system prompt KB section.
   * Default: 3000 tokens.
   */
  systemPromptMaxTokens?: number;
};
```

## Methods & Properties

While the full class implementation is not shown in the source, the example code demonstrates the following methods:

*   **`tools()`**: Returns an array of `Tool` instances (e.g., `search_kb`, `fetch_kb_document`) that are aware of all federated knowledge bases and their namespaces.
*   **`systemPromptSection()`**: Generates a string suitable for inclusion in an agent's [System Prompt](../concepts/system-prompt.md), describing the available knowledge base namespaces and their contents.

## Related Types

The `FederatedKnowledgeBase` introduces several namespaced types that extend the base types from a single `KnowledgeBase`.

### `NamespacedDocument`
A [CompiledDocument](./compiled-document.md) with added namespace information.

```typescript
export type NamespacedDocument = CompiledDocument & {
  namespace: string;
  qualifiedId: string; // e.g., 'namespace:docId'
};
```

### `NamespacedSearchResult`
A [SearchResult](./search-result.md) with added namespace information.

```typescript
export type NamespacedSearchResult = SearchResult & {
  namespace: string;
  qualifiedId: string; // e.g., 'namespace:docId'
};
```

### `NamespacedIndexEntry`
A [KBIndexEntry](./kb-index-entry.md) with added namespace information.

```typescript
export type NamespacedIndexEntry = KBIndexEntry & {
  namespace: string;
  qualifiedId: string; // e.g., 'namespace:docId'
};
```

### `FederatedIndex`
Represents the combined index of all member knowledge bases.

```typescript
export type FederatedIndex = {
  totalDocuments: number;
  totalTokenEstimate: number;
  entries: NamespacedIndexEntry[];
  namespaces: Array<{
    namespace: string;
    label: string;
    documentCount: number;
    tokenEstimate: number;
  }>;
};
```

## Examples

The following example demonstrates how to create a `FederatedKnowledgeBase` from two separate `KnowledgeBase` instances and integrate it into an [Agent](./agent.md) [Source 1].

```typescript
import { KnowledgeBase, FederatedKnowledgeBase } from 'yaaf/knowledge';
import { Agent } from 'yaaf';

// Load two separate knowledge bases
const ml = await KnowledgeBase.load('./kb-ml');
const tools = await KnowledgeBase.load('./kb-tools');

// Create a federated instance with 'ml' and 'tools' as namespaces
const federated = FederatedKnowledgeBase.from({
  ml,
  tools,
});

// Use the federated tools and system prompt section to configure an agent
const agent = new Agent({
  tools: federated.tools(),
  systemPrompt: federated.systemPromptSection(),
});
```

## See Also

*   [Knowledge Base](../subsystems/knowledge-base.md): The underlying subsystem that `FederatedKnowledgeBase` orchestrates.
*   [KBToolOptions](./kb-tool-options.md): Configuration options for the tools generated by this class.
*   [SearchResult](./search-result.md): The type representing a search result, which is extended by `NamespacedSearchResult`.
*   [System Prompt](../concepts/system-prompt.md): The concept of a system prompt, which this class can contribute to.

## Sources

[Source 1]: src/knowledge/store/federation.ts