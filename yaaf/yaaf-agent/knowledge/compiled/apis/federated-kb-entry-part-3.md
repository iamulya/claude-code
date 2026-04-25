---
title: "FederatedKBEntry (Part 3: Examples)"
entity_type: api
part_of: "FederatedKBEntry"
part_number: 3
---
## Examples

The following example demonstrates how to configure a `FederatedKnowledgeBase` using `FederatedKBEntry` objects to provide custom labels and trust weights.

```typescript
import { KnowledgeBase } from 'yaaf/knowledge';
import { FederatedKnowledgeBase, FederatedKBConfig } from 'yaaf/knowledge';

// Assume these KBs are loaded from different sources
const mlKb = await KnowledgeBase.load('./kb-ml');
const communityKb = await KnowledgeBase.load('./kb-community');

// Configure the federated knowledge base
const config: FederatedKBConfig = {
  // The 'ml' namespace uses a full FederatedKBEntry for detailed configuration
  ml: {
    kb: mlKb,
    label: 'Machine Learning Concepts (Curated)',
    trustWeight: 1.0, // Fully trusted
  },
  // The 'community' namespace also uses a FederatedKBEntry
  community: {
    kb: communityKb,
    label: 'Community Contributed Guides',
    trustWeight: 0.75, // Trusted, but results are weighted 25% lower
  },
};

const federated = FederatedKnowledgeBase.from(config);

// The federated KB can now be used to create tools for an agent
const agentTools = federated.tools();
const systemPromptSection = federated.systemPromptSection();
```
## See Also

- `FederatedKnowledgeBase`: The class that consumes `FederatedKBEntry` configurations to create a unified view over multiple knowledge bases.
- `FederatedKBConfig`: The type alias for the configuration object that maps namespaces to `FederatedKBEntry` instances.
- [Knowledge Base](../subsystems/knowledge-base.md): The core class representing a single knowledge base instance.
## Sources

[Source 1]: src/knowledge/store/federation.ts
[Source 2]: src/knowledge/store/index.ts

---

[← Previous: Signature / Properties](federated-kb-entry-part-2.md) | 
*Part 3 of 3*