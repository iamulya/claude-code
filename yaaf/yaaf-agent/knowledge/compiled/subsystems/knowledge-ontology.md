---
summary: The YAAF subsystem responsible for defining, generating, loading, and managing knowledge ontologies.
primary_files:
 - src/knowledge/ontology/generator.ts
 - src/knowledge/ontology/loader.ts
 - src/knowledge/ontology/index.ts
title: Knowledge Ontology
entity_type: subsystem
exports:
 - OntologyGenerator
 - OntologyLoader
 - KBOntology
 - GenerateOntologyOptions
search_terms:
 - define knowledge schema
 - bootstrap ontology.yaml
 - generate knowledge base structure
 - LLM-powered ontology creation
 - what is an ontology in YAAF
 - ontology generator
 - ontology loader
 - knowledge domain schema
 - entity type definition
 - relationship types
 - vocabulary management
 - knowledge base validation
stub: false
compiled_at: 2026-04-25T00:29:25.690Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/generator.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/index.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The Knowledge Ontology subsystem provides the tools and data structures for defining the schema of a [Knowledge Base](./knowledge-base.md). It addresses the "cold start" problem of creating a new knowledge base by offering an [LLM](../concepts/llm.md)-powered generator to bootstrap a valid `ontology.yaml` file. This file acts as the blueprint for a specific [Knowledge Domain](../concepts/knowledge-domain.md), defining its core concepts, entity types, relationships, and vocabularies [Source 1].

The subsystem's responsibilities include:
1.  Generating a new [Ontology](../concepts/ontology.md) from project context and a domain description.
2.  Loading and parsing the `ontology.yaml` file.
3.  Defining the TypeScript types that represent a validated [Ontology](../concepts/ontology.md), such as [KBOntology](../apis/kb-ontology.md), [EntityTypeSchema](../apis/entity-type-schema.md), and [RelationshipType](../apis/relationship-type.md) [Source 2].

## Architecture

The subsystem is primarily composed of a generator and a loader, which operate on the central `ontology.yaml` file.

*   **`OntologyGenerator`**: This class uses an [LLM](../concepts/llm.md) to draft an `ontology.yaml` file tailored to a specific project. It works by scanning the project's file tree, `README`, and package manager files (e.g., `package.json`) to build a context. This context, along with a user-provided domain description, is passed to an [LLM](../concepts/llm.md) via a `generateFn` to produce the ontology content [Source 1].

*   **`OntologyLoader`**: This component is responsible for reading, parsing, and validating an existing `ontology.yaml` file from disk. It ensures the file conforms to the [KBOntology](../apis/kb-ontology.md) schema and produces a structured object that other systems, like the [Knowledge Base Compiler](./knowledge-base-compiler.md), can use [Source 1].

The central data structure is the [KBOntology](../apis/kb-ontology.md) interface, which represents the parsed contents of the ontology file. It includes definitions for all core schema elements [Source 2]:
*   [EntityTypeSchema](../apis/entity-type-schema.md): Defines the structure of different article types.
*   [RelationshipType](../apis/relationship-type.md): Defines valid links between entities.
*   [VocabularyEntry](../apis/vocabulary-entry.md): Defines controlled vocabularies for specific fields.
*   [FrontmatterSchema](../apis/frontmatter-schema.md): Defines the expected frontmatter fields for entity types.

## Integration Points

*   **[Knowledge Base Compiler](./knowledge-base-compiler.md)**: The compiler is the primary consumer of this subsystem. It uses the loaded [KBOntology](../apis/kb-ontology.md) from the `OntologyLoader` to validate source articles, guide the [Knowledge Extraction Subsystem](./knowledge-extraction-subsystem.md), and ensure the synthesized knowledge graph adheres to the defined schema.
*   **[LLM Adapters](./llm-adapters.md)**: The `OntologyGenerator` requires a [GenerateFn](../apis/generate-fn.md) to communicate with an [LLM](../concepts/llm.md). This function is typically created using helpers that interface with the [LLM Adapters](./llm-adapters.md) subsystem to provide a concrete model implementation [Source 1].
*   **[CLI](./cli.md)**: The command-line interface can integrate with the `OntologyGenerator` to expose a command for users to easily bootstrap a new `ontology.yaml` file when starting a new [Knowledge Base](./knowledge-base.md) project.

## Key APIs

*   **[OntologyGenerator](../apis/ontology-generator.md)**: The main class for bootstrapping an `ontology.yaml` file from project context [Source 1].
*   **[OntologyLoader](../apis/ontology-loader.md)**: The class responsible for loading and parsing an existing `ontology.yaml` file [Source 1].
*   **[GenerateOntologyOptions](../apis/generate-ontology-options.md)**: An interface that specifies the inputs for the generation process, including the `domain` description, `srcDirs` to scan, and optional `entityTypeHints` [Source 1].
*   **[GenerateOntologyResult](../apis/generate-ontology-result.md)**: The object returned upon successful generation, containing the `outputPath` and the raw `yaml` content [Source 1].
*   **[KBOntology](../apis/kb-ontology.md)**: The core TypeScript interface representing a fully parsed and validated ontology [Source 2].
*   **[ONTOLOGY_FILENAME](../apis/ontology-filename.md)**: A constant representing the standard filename, `ontology.yaml` [Source 1].

## Configuration

The `OntologyGenerator` is configured at two levels:

1.  **Instantiation**: The constructor accepts [OntologyGeneratorOptions](../apis/ontology-generator-options.md), allowing the developer to provide the [GenerateFn](../apis/generate-fn.md) for [LLM](../concepts/llm.md) interaction, specify the `outputPath`, and set the `maxContextTokens` for the context sent to the model [Source 1].

    ```typescript
    const gen = new OntologyGenerator({
      generateFn: makeGenerateFn(myModel),
      outputPath: './knowledge/ontology.yaml',
    });
    ```

2.  **Generation**: The `generate` method accepts [GenerateOntologyOptions](../apis/generate-ontology-options.md), which control a specific generation run. This includes the required `domain` description and optional parameters like `srcDirs`, `entityTypeHints`, and an `overwrite` flag for existing files [Source 1].

    ```typescript
    await gen.generate({
      domain: 'Acme SDK — a TypeScript library for ...',
      srcDirs: ['./src'],
      overwrite: true,
    });
    ```

## Extension Points

The primary extension point is the `generateFn` property within [OntologyGeneratorOptions](../apis/ontology-generator-options.md). By providing a custom function that conforms to the [GenerateFn](../apis/generate-fn.md) interface, developers can integrate any [LLM](../concepts/llm.md) provider or custom generation logic into the ontology creation process. The framework provides helpers like [makeGenerateFn](../apis/make-generate-fn.md) to simplify adapting standard model clients to this interface [Source 1].

## Sources

*   [Source 1]: `src/knowledge/ontology/generator.ts`
*   [Source 2]: `src/knowledge/ontology/index.ts`