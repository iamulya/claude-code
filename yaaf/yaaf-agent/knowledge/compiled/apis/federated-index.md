---
summary: Represents a combined index across all KnowledgeBase instances in a FederatedKnowledgeBase, including total stats and per-namespace details.
export_name: FederatedIndex
source_file: src/knowledge/store/federation.ts
category: type
title: FederatedIndex
entity_type: api
search_terms:
 - federated knowledge base index
 - combine multiple knowledge bases
 - multi-KB search stats
 - namespaced knowledge base
 - aggregate KB statistics
 - how to get federated index
 - FederatedKnowledgeBase index property
 - total documents in all KBs
 - per-namespace KB stats
 - unified knowledge base view
 - cross-KB document index
 - knowledge base federation
 - composite index
stub: false
compiled_at: 2026-04-25T00:06:56.491Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/federation.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/index.ts
compiled_from_quality: unknown
confidence: 0.95
---
## Overview

The `FederatedIndex` type defines the structure of an aggregated index for a `FederatedKnowledgeBase` instance. It provides a comprehensive, read-only summary of all documents contained within the multiple [Knowledge Base](../subsystems/knowledge-base.md) instances that form the federation [Source 1].

This type is used to represent the combined catalog of information available to an agent. It includes top-level statistics, such as the total number of documents and the estimated token count across all federated knowledge bases. It also provides a detailed breakdown of these statistics for each individual namespace, as well as a complete, flattened list of all index entries, each tagged with its source namespace [Source 1].

An object of this type is typically accessed via the `.index` property of a `FederatedKnowledgeBase` instance to inspect the composition and scale of the federated knowledge source.


---

[Next: Signature →](federated-index-part-2.md) | 
*Part 1 of 3*