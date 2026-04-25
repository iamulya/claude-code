---
summary: Manages the definition, serialization, and deserialization of the YAAF Knowledge Base's core entity types and domain.
primary_files:
 - src/knowledge/ontology/index.js
title: Ontology System
entity_type: subsystem
exports:
 - ConceptRegistry
 - ConceptRegistryEntry
 - deserializeRegistry
search_terms:
 - knowledge base schema
 - define entity types
 - concept registry
 - KB vocabulary
 - what is a concept registry
 - ontology serialization
 - YAAF knowledge structure
 - domain definition
 - entity type validation
 - deserialize ontology
 - knowledge base structure
stub: false
compiled_at: 2026-04-24T18:17:19.303Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/store.ts
compiled_from_quality: unknown
confidence: 0.85
---

## Purpose

The [Ontology](../concepts/ontology.md) System provides the formal schema and [Vocabulary](../concepts/vocabulary.md) for the YAAF Knowledge Base (KB). It defines the set of valid Entity Types that can exist within the KB, such as `concept`, `api`, or `subsystem`. It also provides a high-level description of the knowledge base's domain [Source 1]. By centralizing these definitions, the Ontology System ensures structural consistency across all knowledge base articles and provides a reliable source of truth for other subsystems that interact with KB content.

## Architecture

The core of the Ontology System is the `ConceptRegistry`, a data structure that holds the definitions for all valid Entity Types and other domain-specific metadata [Source 1]. Each definition is represented as a `ConceptRegistryEntry` [Source 1].

The system is designed with a separation between definition and consumption. The ontology is defined, likely in a source format, and then serialized into a distributable format. Runtime components, such as the `KBStore`, do not interact with the source definition directly. Instead, they use a deserialization function, `deserializeRegistry`, to load the serialized ontology into an in-[Memory](../concepts/memory.md) `ConceptRegistry` object for use [Source 1]. This architecture decouples runtime knowledge consumers from the specifics of how the ontology is defined and compiled.

## Integration Points

The Ontology System is primarily consumed by other knowledge management subsystems.

- **KBStore**: The `KBStore` subsystem, which provides read-only access to compiled KB articles, relies on the Ontology System. It uses the loaded `ConceptRegistry` to validate the `entityType` field of each document and to populate the `domain` description in the main `KBIndex` [Source 1]. The types defined in the ontology, such as `entityType`, are integral to the data structures used by the `KBStore`, including `CompiledDocument` and `DocumentMeta` [Source 1].

## Key APIs

The public interface of the Ontology System, as consumed by other parts of the framework, includes the following key exports:

- **`ConceptRegistry`**: A type definition for the in-memory object that contains the entire loaded ontology, including all defined [Entity Type](../concepts/entity-type.md)s and domain information [Source 1].
- **`ConceptRegistryEntry`**: A type definition representing a single entry within the `ConceptRegistry`, such as the definition for a specific entity type [Source 1].
- **`deserializeRegistry`**: A function that takes a serialized representation of the ontology and returns a populated `ConceptRegistry` object for runtime use [Source 1].

## Sources

[Source 1] `src/knowledge/store/store.ts`