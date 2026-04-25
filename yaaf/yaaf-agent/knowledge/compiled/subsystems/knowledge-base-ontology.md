---
summary: Defines the schema, types, and validation mechanisms for YAAF's internal knowledge base, enabling structured representation and management of domain knowledge.
primary_files:
 - src/knowledge/ontology/index.ts
 - src/knowledge/ontology/types.ts
 - src/knowledge/ontology/vocabulary.ts
 - src/knowledge/ontology/generator.ts
title: Knowledge Base Ontology
entity_type: subsystem
exports:
 - KBOntology
 - EntityTypeSchema
 - RelationshipType
 - VocabularyEntry
 - FrontmatterSchema
 - ConceptRegistry
 - OntologyValidationResult
 - OntologyGeneratorOptions
search_terms:
 - knowledge base schema
 - define entity types
 - knowledge graph structure
 - YAAF ontology
 - domain knowledge modeling
 - entity relationship model
 - how to structure knowledge
 - concept registry
 - ontology validation
 - knowledge base types
 - semantic vocabulary
 - generate ontology from source
 - frontmatter validation
stub: false
compiled_at: 2026-04-24T18:14:44.665Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/index.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The Knowledge Base [Ontology](../concepts/ontology.md) subsystem provides the formal specification for the structure and content of the YAAF knowledge base. It defines the schema for different types of knowledge articles, the relationships that can exist between them, and the rules for validating content against this schema. This ensures that all information within the knowledge base is consistent, well-structured, and machine-readable, forming a reliable foundation for agent reasoning and information retrieval.

## Architecture

The subsystem is organized into several distinct components, each responsible for a specific aspect of the ontology [Source 1].

*   **Core Type System (`types.ts`):** This is the heart of the subsystem, defining the fundamental data structures that constitute an ontology. It includes types for the overall ontology (`KBOntology`), schemas for different entity types (`EntityTypeSchema`), definitions for relationships (`RelationshipType`), and the structure of article [Frontmatter](../concepts/frontmatter.md) (`FrontmatterSchema`).
*   **[Vocabulary](../concepts/vocabulary.md) Management (`vocabulary.ts`):** This component manages the linguistic aspects of the knowledge base. It defines structures for vocabulary entries, alias indexes (`AliasIndex`), and the representation of entity mentions (`EntityMention`), enabling the system to normalize terms and resolve references to concepts.
*   **Ontology Generation (`generator.ts`):** This component provides capabilities for programmatically creating an [Ontology Definition](../concepts/ontology-definition.md). It exposes options (`OntologyGeneratorOptions`) that control the generation process, suggesting a mechanism for inferring the knowledge base structure from source artifacts.
*   **Validation:** The subsystem includes types like `OntologyValidationResult` and `OntologyValidationIssue`, indicating the presence of a validation mechanism. This component is responsible for checking knowledge base content against the defined ontology and reporting any inconsistencies or errors.
*   **Public API (`index.ts`):** This file serves as the public entry point to the subsystem, exporting all the necessary types and interfaces for other parts of the YAAF framework to interact with the ontology layer [Source 1].

## Integration Points

The Knowledge Base Ontology is a foundational subsystem that other parts of YAAF rely on:

*   **[Knowledge Base Compiler](./knowledge-base-compiler.md):** A compiler or ingestion pipeline would use the ontology to parse, validate, and structure raw source material into formal knowledge base articles.
*   **Agent Runtime:** The agent's reasoning and retrieval mechanisms would query the ontology to understand the relationships between different concepts and to resolve entities mentioned in user queries or internal state.

## Key APIs

The public API of the ontology subsystem is exposed through `src/knowledge/ontology/index.ts` and consists primarily of type definitions that describe the knowledge base structure [Source 1].

*   **`KBOntology`**: The root type representing the entire schema for the knowledge base, containing definitions for all entity types and relationships.
*   **`EntityTypeSchema`**: Defines the structure for a specific category of knowledge article, such as `concept`, `api`, or `guide`. This includes its frontmatter schema and allowed sections.
*   **`FrontmatterSchema`**: Specifies the required and optional fields, along with their data types (`FieldType`), for an article's YAML frontmatter.
*   **`RelationshipType`**: Defines a named relationship that can exist between two entities, forming the edges of the knowledge graph.
*   **`VocabularyEntry`**: Represents a single term or concept within the knowledge base's controlled vocabulary, including its canonical name and potential aliases.
*   **`ConceptRegistry`**: A type for a registry that tracks all defined concepts within the ontology.
*   **`OntologyValidationResult`**: The data structure returned by the validation process, containing a list of issues (`OntologyValidationIssue`) found.
*   **`OntologyGeneratorOptions`**: A type defining configuration options for the programmatic generation of an ontology.

## Configuration

The subsystem exports configuration-related types that are likely used by systems that interact with the ontology [Source 1].

*   **`KBBudgetConfig`**: Suggests configuration options related to resource limits or budgets, possibly for computationally intensive operations like validation or generation.
*   **`KBCompilerModelConfig`**: Implies that an [LLM](../concepts/llm.md) may be used during the knowledge base compilation process, and this type provides the configuration for that model.

## Sources

[Source 1]: src/knowledge/ontology/index.ts