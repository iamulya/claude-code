---
summary: Metadata block at the beginning of YAAF articles used for categorization, validation, and linking.
title: Frontmatter
entity_type: concept
stub: false
compiled_at: 2026-04-16T14:26:22.926Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/synthesizer/frontmatter.ts
confidence: 0.9
---

---
title: Frontmatter
entity_type: concept
summary: Metadata block at the beginning of YAAF articles used for categorization, validation, and linking.
related_subsystems:
  - Knowledge Base Compiler

## What It Is
Frontmatter is a structured metadata block located at the beginning of YAAF knowledge base articles. Encapsulated between triple-dash (`---`) delimiters, it provides the necessary context for the YAAF compiler to categorize, validate, and link articles within the framework's ontology. It serves as the primary interface between unstructured markdown content and the structured knowledge graph, ensuring that every article adheres to the required schema for its specific entity type.

## How It Works in YAAF
The YAAF compiler manages frontmatter through a dedicated synthesis pipeline defined in `src/knowledge/compiler/synthesizer/frontmatter.ts`. This process involves parsing, validation, and metadata injection.

### Parsing and Extraction
The `parseArticleOutput` function is responsible for separating the YAML frontmatter from the markdown body. If an LLM fails to produce a frontmatter block, the compiler generates an empty block rather than failing the compilation process.

### Validation Logic
The `validateFrontmatter` function enforces strict rules based on the framework's ontology. It performs type coercion and validation for several data types:
*   **Enums**: Validates values against an allowed list defined in the schema.
*   **Entity References**: Uses the `ConceptRegistry` to ensure that `entity_ref` fields point to valid, existing documents.
*   **Primitives**: Coerces strings to booleans, numbers, or dates (ISO format) where appropriate.
*   **Arrays**: Ensures lists of strings, URLs, or entity references are correctly formatted.

### Merging and Serialization
The final frontmatter is constructed by `buildCompleteFrontmatter`, which merges data from three sources in order of priority:
1.  **Compiler-Injected Metadata**: System-level fields that ensure structural consistency.
2.  **Validated LLM Values**: Fields generated during the article synthesis phase.
3.  **Suggested Frontmatter**: Initial values provided by the extraction plan.

The resulting object is then passed to `serializeFrontmatter` to be converted into a YAML block.

## Configuration
Frontmatter is governed by the `FrontmatterSchema`, which defines required and optional fields for different entity types. While the compiler handles the serialization, the schema dictates how fields are validated.

### Compiler-Injected Fields
The compiler automatically appends the following metadata to every article to maintain the integrity of the knowledge base:
*   `entity_type`: The classification of the article (e.g., concept, api, guide).
*   `stub`: A boolean flag indicating if the article is a placeholder.
*   `compiled_at`: An ISO timestamp of when the article was generated.
*   `compiled_from`: A list of source file paths used to synthesize the content.
*   `confidence`: A numerical value representing the generation confidence from the article plan.

## Sources
* `src/knowledge/compiler/synthesizer/frontmatter.ts`