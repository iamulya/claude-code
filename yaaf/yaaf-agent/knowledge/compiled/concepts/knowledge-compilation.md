---
summary: The process of transforming unstructured data into a structured, cross-referenced wiki for LLM context, bypassing RAG.
tags:
  - architecture
  - knowledge-management
  - rag-alternative
title: Knowledge Compilation
entity_type: concept
related_subsystems:
  - knowledge
stub: false
compiled_at: 2026-04-16T14:08:42.960Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/knowledge-base.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/index.ts
confidence: 0.95
---

## What It Is
Knowledge Compilation is a "Karpathy-style" pipeline within YAAF that transforms raw, unstructured source material—such as research papers, web clips, code, and documentation—into a structured, wiki-like knowledge base. 

This approach is designed to bypass traditional Retrieval-Augmented Generation (RAG). Instead of embedding data into a vector database and retrieving chunks at query time, Knowledge Compilation produces a well-structured wiki in a `compiled/` directory. This wiki includes frontmatter, wikilinks, and cross-references, making the knowledge legible to both humans and LLMs. When an agent requires information, the LLM reads the compiled articles directly as part of its context window, benefiting from the pre-organized relationships and synthesized summaries.

## How It Works in YAAF
The compilation process is managed by the `KBCompiler` class and follows a multi-stage pipeline that moves data from a `raw/` directory to a `compiled/` directory.

### 1. Ingestion
The Ingester processes various file types from the `raw/` directory into a standardized `IngestedContent` format:
*   **Markdown**: Strips frontmatter and resolves image paths.
*   **HTML**: Uses readability extraction to convert content to Markdown.
*   **Code**: Extracts docstrings and comments.
*   **Images**: Detects MIME types via magic bytes and saves them locally for vision-capable models.

### 2. Concept Extraction
This stage determines what entities exist within the ingested content. It consists of two passes:
*   **Static Pass**: Performs a vocabulary scan for entity mentions, looks up known articles in the registry, and estimates token counts.
*   **LLM Pass**: Uses a fast "extraction model" (e.g., Gemini Flash) to identify new concepts and plan article updates based on the project's ontology.

### 3. Synthesis
A more capable "synthesis model" (e.g., Gemini Pro) authors or updates the articles in the `compiled/` directory. It follows the structure defined in the ontology, ensuring that new information is integrated into existing articles or used to create new ones.

### 4. Linting and Self-Healing
After synthesis, a linter checks the knowledge base for consistency. It validates frontmatter against the schema, checks for broken wikilinks, and identifies missing reciprocal links (e.g., if a Tool article links to a Concept, the Concept should link back to the Tool). The linter can automatically fix many of these issues to keep the KB consistent.

## Configuration
Knowledge Compilation is governed by an `ontology.yaml` file, which serves as the schema for the domain. It defines entity types, relationship types, and the vocabulary of known terms.

### The Ontology Schema
The `ontology.yaml` file defines how the LLM should structure the compiled wiki:

```yaml
domain: "Machine Learning Research"

entity_types:
  concept:
    description: "A core idea, technique, or abstraction in ML"
    frontmatter:
      fields:
        title: { type: string, required: true }
        entity_type: { type: string, required: true }
        status: { type: enum, enum: [established, emerging, deprecated] }
    article_structure:
      - heading: "Overview"
        description: "What is this concept?"
        required: true
      - heading: "How It Works"
        description: "Mechanism or algorithm."
    linkable_to: [concept, research_paper]

relationship_types:
  - name: IMPLEMENTS
    from: tool
    to: concept
    reciprocal: IMPLEMENTED_BY
```

### Programmatic Usage
Developers initialize the compiler by providing the directory path and the models to be used for extraction and synthesis.

```typescript
import { KBCompiler, makeGenerateFn } from 'yaaf/knowledge'
import { GeminiChatModel } from 'yaaf'

const compiler = await KBCompiler.create({
  kbDir: './my-kb',
  extractionModel: makeGenerateFn(new GeminiChatModel({ model: 'gemini-2.5-flash' })),
  synthesisModel:  makeGenerateFn(new GeminiChatModel({ model: 'gemini-2.5-pro' })),
})

// Execute the pipeline
const result = await compiler.compile()
```

The compiler maintains a `.kb-registry.json` file to track the index of all compiled articles and a `.kb-lint-report.json` to store the results of the latest consistency checks.