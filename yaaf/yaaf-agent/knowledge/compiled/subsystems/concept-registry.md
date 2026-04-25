---
summary: A live, in-memory index of all compiled KB articles, used by the YAAF knowledge compilation system for various operations.
primary_files:
 - src/knowledge/ontology/registry.ts
 - src/knowledge/ontology/types.ts
 - src/knowledge/ontology/vocabulary.ts
title: Concept Registry
entity_type: subsystem
exports:
 - buildConceptRegistry
 - findByWikilink
 - findByEntityType
 - buildDocIdAliasMap
 - upsertRegistryEntry
 - removeRegistryEntry
 - serializeRegistry
 - deserializeRegistry
search_terms:
 - knowledge base index
 - wikilink resolution
 - find compiled articles
 - entity lookup
 - backlink resolver dependency
 - concept extractor dependency
 - avoiding duplicate articles
 - KB known universe
 - docId mapping
 - article alias lookup
 - how to find an article by title
 - cached KB index
 - ontology validation
stub: false
compiled_at: 2026-04-24T18:11:24.002Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/registry.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The Concept Registry is a live, in-[Memory](../concepts/memory.md) index of every entity that has a compiled knowledge base (KB) article [Source 1]. It serves as the "known universe" for the YAAF [Knowledge Compilation System](./knowledge-compilation-system.md), providing a comprehensive and up-to-date catalog of all existing articles.

This subsystem is critical for the correct functioning of several other compiler components [Source 1]:
- **[Concept Extractor](./concept-extractor.md)**: Checks the registry to determine if an article for a discovered entity already exists.
- **[Knowledge Synthesizer](./knowledge-synthesizer.md)**: Queries the registry to avoid creating duplicate articles.
- **[Backlink Resolver](./backlink-resolver.md)**: Uses the registry to resolve `wikilink` targets to their canonical document IDs (`docId`).
- **[Linter](../concepts/linter.md)**: Scans the registry to detect orphaned or missing articles.

Without the registry, the compilation system would lack the context to manage relationships between articles, prevent redundancy, and ensure the integrity of the knowledge base [Source 1].

## Architecture

The Concept Registry is built at startup by recursively scanning the `compiled/` directory of the knowledge base. Each Markdown file (`.md`) is parsed for its YAML [Frontmatter](../concepts/frontmatter.md). For a file to be included in the registry, its frontmatter must contain at least a `title` and an `entity_type` [Source 1]. The `entity_type` is validated against the loaded `KBOntology` to ensure it's a recognized type. Files missing the required frontmatter are skipped [Source 1].

To improve startup performance, the registry can be serialized to a compact JSON file (`.kb-registry.json`) in the KB root. On subsequent runs, the system can deserialize this cached file instead of performing a full filesystem scan [Source 1].

The registry is a dynamic structure. After each successful compilation of an article, the `upsertRegistryEntry` function is called to add or update its corresponding entry. Similarly, [when](../apis/when.md) a compiled article is deleted, `removeRegistryEntry` is used to remove it from the index, keeping the registry synchronized with the filesystem [Source 1].

## Integration Points

The Concept Registry is a central dependency for multiple parts of the knowledge compilation pipeline:

- **Backlink Resolver**: This component relies on the `buildDocIdAliasMap` function, which creates a fast, case-insensitive lookup map from all known aliases and titles to their corresponding `docId`. This map is essential for efficiently resolving `wikilinks` found in article content [Source 1].
- **Compiler Core**: The main compilation process orchestrates the lifecycle of the registry. It calls `buildConceptRegistry` on initialization and uses `upsertRegistryEntry` and `removeRegistryEntry` to maintain the registry's state throughout its operation [Source 1].

## Key APIs

The public API of the Concept Registry is exposed through functions that operate on the `ConceptRegistry` object.

- **`buildConceptRegistry(compiledDir, ontology)`**: Scans the specified `compiledDir` to build and return a new registry. It uses the provided `ontology` to validate the `entity_type` of each article [Source 1].
- **`findByWikilink(target, registry)`**: Searches the registry for an entry matching a given wikilink target string. The matching logic follows a specific priority: 1) exact `docId`, 2) case-insensitive canonical title, 3) case-insensitive alias [Source 1].
- **`findByEntityType(entityType, registry)`**: Returns an array of all registry entries that match a specific [Entity Type](../concepts/entity-type.md) [Source 1].
- **`upsertRegistryEntry(registry, entry)`**: Adds a new `ConceptRegistryEntry` to the registry or updates an existing one [Source 1].
- **`removeRegistryEntry(registry, docId)`**: Deletes an entry from the registry using its `docId` [Source 1].
- **`serializeRegistry(registry)` / `deserializeRegistry(json)`**: A pair of functions for caching the registry to a JSON string and restoring it from that string, respectively [Source 1].

## Sources

[Source 1] `src/knowledge/ontology/registry.ts`