---
title: Knowledge Ontology
entity_type: subsystem
summary: The subsystem responsible for defining the structure, types, and validation rules for the framework's knowledge base and entity relationships.
primary_files:
  - src/knowledge/ontology/index.ts
  - src/knowledge/ontology/types.ts
  - src/knowledge/ontology/vocabulary.ts
exports:
  - KBOntology
  - EntityTypeSchema
  - RelationshipType
  - VocabularyEntry
  - ConceptRegistry
  - OntologyValidationResult
stub: false
compiled_at: 2026-04-16T14:28:02.070Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/ontology/index.ts
confidence: 0.95
---

## Purpose
The Knowledge Ontology subsystem provides the formal schema and vocabulary definitions for the YAAF knowledge base. It establishes the structural requirements for how information is categorized, stored, and linked within the framework. By defining entity types, relationship rules, and metadata schemas, this subsystem ensures that knowledge articles remain consistent and programmatically accessible.

## Architecture
The subsystem is organized into three primary functional areas:

### Core Type System
The foundation of the ontology is defined in `types.ts`. It utilizes `KBOntology` as the root definition, which aggregates `EntityTypeSchema` and `RelationshipType` definitions. This layer also defines the structure of knowledge articles through `ArticleSection` and `FrontmatterSchema`, ensuring that metadata fields (defined via `FrontmatterFieldSchema`) adhere to specific `FieldType` constraints.

### Vocabulary and Normalization
The vocabulary layer, defined in `vocabulary.ts`, handles the linguistic aspects of the ontology. It manages `VocabularyEntry` objects and provides mechanisms for entity resolution, including:
*   **Alias Management**: Mapping various terms to a canonical entity via the `AliasIndex`.
*   **Mention Tracking**: Identifying occurrences of entities within text using `EntityMention`.
*   **Normalization**: Processing raw strings into standardized formats using `NormalizeOptions` and returning a `NormalizationResult`.

### Registry and Validation
The `ConceptRegistry` serves as a central store for `ConceptRegistryEntry` objects, tracking known entities across the ontology. To maintain data integrity, the subsystem includes a validation engine that produces `OntologyValidationResult` objects, detailing any `OntologyValidationIssue` found within the knowledge base structure.

## Key APIs
The Knowledge Ontology subsystem exports several critical types and interfaces for managing knowledge structures:

*   **KBOntology**: The primary interface representing the complete structural definition of a knowledge base.
*   **EntityTypeSchema**: Defines the required fields, metadata, and constraints for a specific category of entity (e.g., a "subsystem" or "api").
*   **ConceptRegistry**: A registry used to look up and manage defined concepts and their associated metadata.
*   **OntologyValidationResult**: An object containing the results of a schema validation pass, including any errors or warnings.
*   **NormalizationResult**: The output of the vocabulary system's normalization logic, providing standardized entity references.

## Configuration
The ontology subsystem is influenced by configuration objects that define how the knowledge base is compiled and managed:
*   **KBBudgetConfig**: Defines resource limits and constraints for knowledge base operations.
*   **KBCompilerModelConfig**: Specifies the configuration for LLM models used during the knowledge compilation and ontology extraction process.

## Extension Points
Developers can extend the ontology by:
*   **Defining Custom Entity Types**: Creating new `EntityTypeSchema` definitions to support domain-specific knowledge.
*   **Vocabulary Customization**: Extending the `VocabularyEntry` and `AliasIndex` to support specialized terminology or multi-language aliases.
*   **Schema Validation**: Implementing custom validation logic that utilizes the `OntologyValidationIssue` interface to enforce domain-specific constraints.