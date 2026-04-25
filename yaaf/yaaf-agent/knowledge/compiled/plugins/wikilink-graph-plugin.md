---
summary: Default KBGraphAdapter implementation that builds an in-memory bidirectional adjacency list from wikilinks in compiled article bodies.
capabilities:
 - kb-graph-adapter
title: WikilinkGraphPlugin
entity_type: plugin
built_in: true
search_terms:
 - knowledge base graph
 - in-memory graph database
 - wikilink parsing
 - adjacency list representation
 - how to find related articles
 - entity relationship graph
 - default graph adapter
 - replace wikilink graph
 - Neo4j alternative
 - Memgraph alternative
 - bidirectional links
 - ontology relationship types
stub: false
compiled_at: 2026-04-24T18:09:18.147Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/store.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/wikilinkGraph.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `WikilinkGraphPlugin` is the default, zero-dependency implementation of the `KBGraphAdapter` capability [Source 2]. It constructs an in-[Memory](../concepts/memory.md) graph representation of a YAAF Knowledge Base by parsing `[]` found within the bodies of compiled articles. The resulting graph is a bidirectional adjacency list, where articles are nodes and [Wikilinks](../concepts/wikilinks.md) represent edges [Source 2].

This plugin infers relationship labels for the edges by matching the entity types of the source and target articles against the `relationship_types` defined in the Knowledge Base [Ontology](../concepts/ontology.md) [Source 2].

## Installation

`WikilinkGraphPlugin` is a built-in plugin and is included with the core `yaaf` package. It does not require separate installation. It can be imported directly from the framework's internal modules [Source 1].

```typescript
import { WikilinkGraphPlugin } from "yaaf/knowledge/store/wikilinkGraph";
```

## Configuration

The `WikilinkGraphPlugin` is designed to be registered with a `PluginHost`. The provided source material does not include the constructor signature, but its operation depends on access to the compiled Knowledge Base articles and the [KBOntology](../apis/kb-ontology.md) to infer relationship types [Source 2].

As the default implementation, it is often used without explicit configuration [when](../apis/when.md) a `KBStore` is initialized. Users can replace it by registering a different plugin that implements the `KBGraphAdapter` interface [Source 2].

Example of replacing the default adapter:

```typescript
import { PluginHost } from "yaaf/plugin";
import { MyCustomGraphAdapter } from "./myCustomGraphAdapter";

const host = new PluginHost();

// Register a custom graph adapter to override the default WikilinkGraphPlugin
host.registerKBGraphAdapter(new MyCustomGraphAdapter({
  connectionString: "neo4j://localhost:7687"
}));

// The KBStore will now use MyCustomGraphAdapter instead of WikilinkGraphPlugin
const kbStore = new KBStore({ pluginHost: host });
```

## Capabilities

`WikilinkGraphPlugin` implements the following capability:

### kb-graph-adapter

As a `KBGraphAdapter`, this plugin provides the system with a graph-based view of the knowledge base. It builds a bidirectional adjacency list in memory where:
- **Nodes**: Represent individual articles in the Knowledge Base.
- **Edges**: Represent `wikilinks` from one article to another.
- **Relationship Labels**: Are inferred from the `KBOntology` by comparing the entity types of the linked articles [Source 2].

This allows for graph-based queries and analysis of relationships between knowledge base entities.

## Limitations

The `WikilinkGraphPlugin` is intended as a lightweight, zero-dependency default. Its primary characteristics inform its use cases:
- **In-[Memory Storage](../concepts/memory-storage.md)**: The entire graph is held in memory. This may not be suitable for extremely large knowledge bases that exceed available system memory.
- **Non-Persistent**: The graph is rebuilt when the application loads the `KBStore` and is not persisted to disk.
- **Replaceable**: It is explicitly designed to be replaced by more robust, persistent graph backends like Neo4j or Memgraph for production environments with advanced graph query needs [Source 2].

## Sources

[Source 1] `src/knowledge/store/store.ts`
[Source 2] `src/knowledge/store/wikilinkGraph.ts`