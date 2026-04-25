---
summary: An interface defining the contract for knowledge base graph storage and retrieval, allowing YAAF to integrate with various graph backends.
title: KBGraphAdapter
entity_type: concept
related_subsystems:
 - KnowledgeSubsystem
 - PluginSubsystem
search_terms:
 - knowledge base graph
 - graph database integration
 - how to connect neo4j to yaaf
 - custom graph backend
 - wikilink graph
 - adjacency list knowledge
 - entity relationship graph
 - replace default graph implementation
 - memgraph adapter
 - KBGraphAdapter interface
 - PluginHost graph registration
stub: false
compiled_at: 2026-04-24T17:56:34.921Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/store.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/wikilinkGraph.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is
The `KBGraphAdapter` is an interface that defines a standardized contract for storing and retrieving knowledge represented as a graph. It serves as an abstraction layer, decoupling the core YAAF framework from any specific graph database or storage implementation [Source 2]. This allows developers to integrate YAAF with various graph backends, such as Neo4j or Memgraph, by creating a custom adapter that conforms to the interface [Source 2].

## How It Works in YAAF
The `KBGraphAdapter` is a plugin type that can be implemented and registered with the framework's `PluginHost` [Source 1, Source 2]. YAAF includes a default, zero-dependency implementation of this interface called `WikilinkGraphPlugin` [Source 2].

The `WikilinkGraphPlugin` works by parsing the `wikilinks` within compiled knowledge base articles to build an in-[Memory](./memory.md), bidirectional adjacency list. It infers the type of relationship between two linked articles by matching the entity types of the source and destination articles with the `relationship_types` defined in the [KBOntology](../apis/kb-ontology.md) [Source 2].

[when](../apis/when.md) a developer provides their own implementation of `KBGraphAdapter` and registers it, their custom adapter replaces the default `WikilinkGraphPlugin` entirely. This enables the use of more robust, persistent, or specialized graph databases for managing the knowledge base's entity relationships [Source 2].

## Configuration
To use a custom graph backend, a developer must create a class that implements the `KBGraphAdapter` interface. This class would contain the logic to connect to and interact with the desired graph database (e.g., Neo4j, Memgraph). Once implemented, an instance of this custom adapter is registered with the `PluginHost`, which makes it the active graph provider for the YAAF agent [Source 2].

## Sources
[Source 1] src/knowledge/store/store.ts
[Source 2] src/knowledge/store/wikilinkGraph.ts