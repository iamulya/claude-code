---
summary: Defines the configuration for a single KnowledgeBase instance within a FederatedKnowledgeBase, including its label and trust weight.
export_name: FederatedKBEntry
source_file: src/knowledge/store/federation.ts
category: type
title: FederatedKBEntry
entity_type: api
search_terms:
 - federated knowledge base configuration
 - multiple knowledge bases
 - combine KBs
 - knowledge base trust weight
 - federated search scoring
 - ADR-012
 - score rigging mitigation
 - multi-KB setup
 - namespaced knowledge base
 - how to configure federated KB
 - FederatedKBConfig entry
 - KB label
stub: false
compiled_at: 2026-04-25T00:06:54.788Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/federation.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/index.ts
compiled_from_quality: unknown
confidence: 0.95
---
## Overview

The `FederatedKBEntry` type defines the configuration for a single [Knowledge Base](../subsystems/knowledge-base.md) instance within a `FederatedKnowledgeBase` [Source 1]. It allows for more detailed setup than simply providing the [Knowledge Base](../subsystems/knowledge-base.md) instance, enabling the specification of a human-readable label and a trust weight for search result scoring [Source 1].

This type is used in the `FederatedKBConfig` object, which maps namespace strings to either a `KnowledgeBase` instance directly or a `FederatedKBEntry` object for more advanced configuration [Source 1]. The `trustWeight` property is particularly important in multi-source environments, as it provides a mechanism to discount results from less-trusted knowledge bases, mitigating the risk of "score rigging" as detailed in ADR-012 [Source 1].


---

[Next: Signature / Properties →](federated-kb-entry-part-2.md) | 
*Part 1 of 3*