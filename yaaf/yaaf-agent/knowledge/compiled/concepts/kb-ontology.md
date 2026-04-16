---
summary: The schema-driven definition of entity types, relationships, and vocabulary that governs the YAAF knowledge base.
title: KB Ontology
entity_type: concept
stub: false
compiled_at: 2026-04-16T14:28:47.796Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/ontology/types.ts
confidence: 0.95
---

---
title: KB Ontology
entity_type: concept
summary: The schema-driven definition of entity types, relationships, and vocabulary that governs the YAAF knowledge base.
related_subsystems:
  - Knowledge Synthesizer
  - KB Compiler
  - Linter

## What It Is
The KB Ontology is the formal schema that defines the structure, vocabulary, and semantic rules of a YAAF knowledge base. It serves as the central "source of truth" for the framework's documentation pipeline, ensuring that all compiled articles adhere to a consistent format and logical hierarchy.

The ontology solves the problem of fragmented or inconsistent documentation by providing a rigid blueprint for how different categories of information—referred to as entities—are defined, structured, and interlinked. It is used by the KB Compiler to extract data, the Knowledge Synthesizer to author articles, and the Linter to validate semantic integrity.

## How It Works in YAAF
The ontology is implemented via the `KBOntology` type and is typically defined in an `ontology.yaml` file. It consists of several core components:

### Entity Types
Each category of knowledge (e.g., `concept`, `api`, `guide`) is defined by an `EntityTypeSchema`. This schema specifies:
*   **Frontmatter:** A `FrontmatterSchema` defining required and optional fields using scalar types such as `string`, `number`, `boolean`, and `entity_ref`.
*   **Article Structure:** An ordered list of `ArticleSection` objects. Each section defines a mandatory or optional H2 heading and a description that guides the Knowledge Synthesizer during article generation.
*   **Linkage Rules:** The `linkableTo` field restricts which other entity types a specific type is allowed to reference via [[wikilinks]], allowing the linter to flag semantically invalid cross-links.

### Relationship Types
The ontology defines named, directed relationships between entity types using the `RelationshipType` interface. These relationships (e.g., `IMPLEMENTS`, `BELONGS_TO`) allow the synthesizer to write precise links. If a `reciprocal` relationship is defined, the linker automatically creates the inverse edge (e.g., if a tool implements a concept, the concept is marked as "implemented by" the tool).

### Vocabulary and Normalization
The `vocabulary` mapping connects canonical terms to a list of `aliases`. This is used by the Concept Extractor to:
1.  Normalize source text by replacing aliases with canonical terms.
2.  Detect when source documents discuss known entities.
3.  Resolve ambiguous [[wikilinks]] to the correct canonical article titles.

### Compiler and Runtime Configuration
The ontology also houses configuration for the KB infrastructure:
*   **KBCompilerModelConfig:** Assigns specific LLM roles for extraction, synthesis, and analysis.
*   **KBBudgetConfig:** Sets token budgets for compiled documents and limits for image injection during runtime fetch calls.

## Configuration
The ontology is configured as a YAML document that is reviewed and committed by a human before the compilation process begins.

```yaml
domain: TypeScript agent framework documentation

entity_types:
  concept:
    description: A core idea or abstraction in the domain
    frontmatter:
      fields:
        related_subsystems:
          type: string[]
          required: false
    article_structure:
      - heading: What It Is
        description: Define the concept clearly.
        required: true
      - heading: How It Works in YAAF
        description: Explain the mechanism and implementation.
        required: true
    linkable_to: [concept, api, subsystem]

relationship_types:
  - name: IMPLEMENTS
    from: tool
    to: concept
    description: A tool that provides an implementation of a concept
    reciprocal: IMPLEMENTED_BY

vocabulary:
  tool call:
    aliases: [function call, tool invocation]

compiler:
  extractionModel: gemini-2.0-flash
  synthesisModel: gemini-2.0-pro
  analysisModel: gemini-2.0-pro
```