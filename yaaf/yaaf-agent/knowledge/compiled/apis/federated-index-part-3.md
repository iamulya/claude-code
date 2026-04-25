---
title: "FederatedIndex (Part 3: Examples)"
entity_type: api
part_of: "FederatedIndex"
part_number: 3
---
## Examples

The following example demonstrates how to create a `FederatedKnowledgeBase` and then access its `index` property (which is of type `FederatedIndex`) to display summary statistics.

```typescript
import { KnowledgeBase, FederatedKnowledgeBase } from 'yaaf/knowledge';

// Assume these KBs have been created and loaded
// const mlKb = await KnowledgeBase.load('./kb-ml');
// const devopsKb = await KnowledgeaBase.load('./kb-devops');

// Mock KB instances for demonstration purposes
const mlKb = {
  index: {
    totalDocuments: 50,
    totalTokenEstimate: 120000,
    entries: [/* ... 50 entries ... */],
  },
  // ... other KB properties
} as unknown as KnowledgeBase;

const devopsKb = {
  index: {
    totalDocuments: 30,
    totalTokenEstimate: 75000,
    entries: [/* ... 30 entries ... */],
  },
  // ... other KB properties
} as unknown as KnowledgeBase;


// Create a federated knowledge base
const federatedKb = FederatedKnowledgeBase.from({
  ml: { kb: mlKb, label: 'Machine Learning' },
  devops: { kb: devopsKb, label: 'DevOps Practices' },
});

// Access the FederatedIndex
const index: FederatedIndex = federatedKb.index();

// Display aggregated statistics
console.log(`Total Documents Across All KBs: ${index.totalDocuments}`);
console.log(`Total Token Estimate: ${index.totalTokenEstimate}`);
console.log('---');

// Display per-namespace statistics
console.log('Namespace Breakdown:');
for (const ns of index.namespaces) {
  console.log(`  Namespace: ${ns.namespace} (${ns.label})`);
  console.log(`    Documents: ${ns.documentCount}`);
  console.log(`    Tokens: ~${ns.tokenEstimate}`);
}

/*
Expected Output:

Total Documents Across All KBs: 80
Total Token Estimate: 195000
---
Namespace Breakdown:
  Namespace: ml (Machine Learning)
    Documents: 50
    Tokens: ~120000
  Namespace: devops (DevOps Practices)
    Documents: 30
    Tokens: ~75000
*/
```
## See Also

*   `FederatedKnowledgeBase`: The class that uses `FederatedIndex` to represent its combined contents.
*   [Knowledge Base](../subsystems/knowledge-base.md): The core class for managing a single collection of documents, instances of which are combined in a federation.
*   `NamespacedIndexEntry`: The type for individual entries within the `FederatedIndex`, extending `KBIndexEntry` with namespace information.
## Sources

[Source 1] src/knowledge/store/federation.ts
[Source 2] src/knowledge/store/index.ts

---

[← Previous: Signature](federated-index-part-2.md) | 
*Part 3 of 3*