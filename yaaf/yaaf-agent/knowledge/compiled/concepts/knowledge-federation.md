---
title: Knowledge Federation
entity_type: concept
summary: The pattern of aggregating multiple independent knowledge sources into a single interface using namespaced identifiers to prevent document ID collisions.
stub: false
compiled_at: 2026-04-16T14:28:56.602Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/store/federation.ts
confidence: 0.9
---

---
title: "Knowledge Federation"
entity_type: "concept"
summary: "The pattern of aggregating multiple independent knowledge sources into a single interface using namespaced identifiers to prevent document ID collisions."
related_subsystems: ["knowledge", "tools"]

## What It Is
Knowledge Federation is an architectural pattern in YAAF used to combine multiple independent `KnowledgeBase` instances into a single, unified interface. This approach allows an agent to access diverse information sources—such as technical documentation, internal wikis, or API specifications—without requiring the developer to merge the underlying data sources into a single physical index.

The primary problem Knowledge Federation solves is the management of document identifier collisions. By providing a namespaced structure, YAAF ensures that two documents with the same ID (e.g., `README.md`) can coexist within the same agent context as long as they originate from different knowledge bases.

## How It Works in YAAF
The core of this concept is implemented in the `FederatedKnowledgeBase` class. It acts as a coordinator that delegates operations to individual `KnowledgeBase` instances while managing the mapping between global (namespaced) and local identifiers.

### Namespacing Rules
YAAF enforces a specific format for identifying documents within a federated context:
*   **Qualified IDs**: All document IDs are prefixed with their assigned namespace using a colon separator (e.g., `ml:concepts/attention`).
*   **Namespace Labels**: Each knowledge base can be assigned a human-readable label, which is used when generating system prompts to help the LLM understand the context of the source.

### Unified Interface
The `FederatedKnowledgeBase` provides several mechanisms for agent interaction:
*   **Unified Search**: The `search_kb` tool performs a search across all registered knowledge bases simultaneously. Results are returned as `NamespacedSearchResult` objects, which include the source namespace and the qualified ID.
*   **Document Retrieval**: The `fetch_kb_document` tool accepts qualified IDs to retrieve the full content of a specific document from the correct underlying source.
*   **Merged Indexing**: The framework generates a `FederatedIndex`, which provides an aggregated view of all documents, total document counts, and estimated token usage across the entire federation.

### Data Structures
The federation logic utilizes specialized types to track metadata:
*   `NamespacedDocument`: Extends the standard document with `namespace` and `qualifiedId` fields.
*   `FederatedIndex`: Contains an array of `NamespacedIndexEntry` and per-namespace statistics (document count and token estimates).

## Configuration
Developers configure federation by passing a mapping of namespaces to `KnowledgeBase` instances or `FederatedKBEntry` objects to the `FederatedKnowledgeBase.from()` method.

```ts
import { KnowledgeBase, FederatedKnowledgeBase } from 'yaaf/knowledge'

// Load individual knowledge bases
const ml = await KnowledgeBase.load('./kb-ml')
const tools = await KnowledgeBase.load('./kb-tools')

// Create the federation
const federated = FederatedKnowledgeBase.from({
  ml: {
    kb: ml,
    label: "Machine Learning Concepts"
  },
  tools: tools, // Defaults to 'tools' as the label
})

// Integrate with an Agent
const agent = new Agent({
  tools: federated.tools(),
  systemPrompt: federated.systemPromptSection(),
})
```

## Sources
* `src/knowledge/store/federation.ts`---