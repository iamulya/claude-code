---
title: Federated Knowledge
entity_type: concept
summary: A pattern for querying across multiple namespaced knowledge indices as a single logical unit.
stub: false
compiled_at: 2026-04-16T14:29:08.394Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/store/index.ts
confidence: 0.9
---

---
title: "Federated Knowledge"
entity_type: "concept"
summary: "A pattern for querying across multiple namespaced knowledge indices as a single logical unit."
related_subsystems:
  - "Knowledge Base"

## What It Is
Federated Knowledge is a design pattern in YAAF that allows multiple independent knowledge indices to be aggregated and queried as a single logical entity. This concept solves the problem of data fragmentation by providing a unified interface for an agent to access information stored across different namespaces or sources without requiring a physical merge of the underlying data.

## How It Works in YAAF
The framework implements this pattern through a federation layer within the knowledge store subsystem. The core of this mechanism is the `FederatedIndex`, which acts as a coordinator for multiple `KBIndex` instances.

To maintain data provenance and organization, YAAF utilizes namespacing. When a query is performed across a federated store, the system tracks the origin of the data using specialized types:
- **NamespacedSearchResult**: Extends standard search results to include the identifier of the source index.
- **NamespacedDocument**: Represents a `CompiledDocument` associated with a specific namespace.
- **NamespacedIndexEntry**: An entry within the `FederatedIndex` that retains its source context.

The individual components that make up a federated collection are defined as `FederatedKBEntry` objects.

## Configuration
Federation is managed through configuration objects that define how various indices are grouped together. This is primarily handled via `FederatedKBConfig` and `FederatedKBOptions`.

While the specific implementation details are encapsulated within the `federation.js` module, the configuration typically involves defining a set of entries that the `FederatedIndex` will resolve at runtime.

```typescript
import { 
  FederatedKBConfig, 
  FederatedKBOptions, 
  FederatedIndex 
} from './federation.js';

// FederatedKBConfig is used to define the structure of 
// the aggregated knowledge indices.
```

## See Also
- [[Knowledge Base]]
- [[KBIndex]]
- [[SearchResult]]