---
title: KBOntology
entity_type: api
summary: The TypeScript interface representing the complete ontology configuration loaded from ontology.yaml.
export_name: KBOntology
source_file: src/knowledge/ontology/types.ts
category: type
stub: false
compiled_at: 2026-04-16T14:28:00.232Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/index.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/ontology/index.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/ontology/types.ts
confidence: 1
---

## Overview
`KBOntology` is the central configuration interface for the YAAF Knowledge Base (KB) system. It defines the structural and semantic rules that the compiler, linker, and linter operate against during the knowledge compilation pipeline. 

This configuration is typically authored by a human in an `ontology.yaml` file and describes the domain, the types of entities allowed (such as concepts or tools), the relationships between them, and the vocabulary used for normalization. It also contains runtime configurations such as token budgets and model assignments for the compilation process.

## Signature
```typescript
export type KBOntology = {
  domain: string;
  entityTypes: Record<string, EntityTypeSchema>;
  relationshipTypes: RelationshipType[];
  vocabulary: Record<string, VocabularyEntry>;
  budget: KBBudgetConfig;
  compiler: KBCompilerModelConfig;
};
```

## Methods & Properties
### domain
A plain-language description of the knowledge domain (e.g., "TypeScript agent framework documentation"). This string is fed verbatim to the Knowledge Synthesizer's system prompt to provide context for article generation.

### entityTypes
A record where keys are entity type identifiers (e.g., `concept`, `tool`, `research_paper`) and values are `EntityTypeSchema` objects. These schemas define the frontmatter fields, required H2 sections, and linking restrictions for articles of that type.

### relationshipTypes
An array of `RelationshipType` objects defining named, directed relationships between entity types (e.g., a `tool` that `IMPLEMENTS` a `concept`). These are used by the synthesizer to write precise wikilinks and by the linter to validate relationship semantics.

### vocabulary
A record mapping canonical terms to `VocabularyEntry` objects. This is used to normalize text by replacing aliases with canonical terms, detecting known entities in source documents, and resolving ambiguous wikilinks.

### budget
A `KBBudgetConfig` object that defines token limits for the KB runtime. It controls the maximum tokens for compiled text documents, vision tokens for images, and the maximum number of images returned per fetch call.

### compiler
A `KBCompilerModelConfig` object that assigns specific LLM models to different roles in the compilation pipeline, including extraction, synthesis, analysis, and vision.

## Examples
### Defining an Ontology in YAML
The `KBOntology` type is designed to map directly to an `ontology.yaml` file.

```yaml
domain: TypeScript agent framework documentation

entity_types:
  concept:
    description: A core idea or abstraction in the domain
    frontmatter:
      fields:
        importance:
          type: string
          required: false
    article_structure:
      - heading: Overview
        description: High-level summary
        required: true
  tool:
    description: A callable function exposed to the LLM
    linkable_to: [concept]

relationship_types:
  - name: BELONGS_TO
    from: tool
    to: agent
    description: A tool that is part of a specific agent's toolkit

vocabulary:
  tool call:
    aliases: [function call, tool invocation]

compiler:
  extractionModel: gemini-2.0-flash
  synthesisModel: gemini-2.0-pro
  analysisModel: gemini-2.0-pro

budget:
  textDocumentTokens: 4096
  imageTokens: 1200
  maxImagesPerFetch: 3
```