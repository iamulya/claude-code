---
summary: How to configure and run the YAAF knowledge compilation pipeline from raw sources to a compiled wiki.
title: Setting up a Knowledge Base
entity_type: guide
difficulty: intermediate
stub: false
compiled_at: 2026-04-16T14:08:45.931Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/knowledge-base.md
confidence: 0.9
---

## Overview
YAAF utilizes a "compile your knowledge" pipeline inspired by the Karpathy-style approach to information management. Instead of relying on traditional Retrieval-Augmented Generation (RAG) which chunks and embeds data at query time, YAAF ingests raw source material—such as research papers, web clips, and documentation—and uses an LLM to synthesize it into a structured, human-readable, and LLM-legible wiki.

This guide walks through initializing the directory structure, defining a domain ontology, and executing the compilation pipeline.

## Prerequisites
*   A TypeScript project with `yaaf` installed.
*   API keys for a supported LLM provider (e.g., Google Gemini).
*   A directory designated for your knowledge base.

## Step-by-Step

### 1. Initialize the Directory Structure
The knowledge base requires a specific folder hierarchy to function. Create a root directory for your KB (e.g., `./my-kb`) with the following subdirectories:

```bash
mkdir -p my-kb/raw my-kb/compiled
```

*   `raw/`: Place your source materials here (Markdown, HTML, PDF, Text, or Code).
*   `compiled/`: This directory will be managed by the compiler and will contain the generated wiki articles.

### 2. Define the Ontology
The `ontology.yaml` file is the mandatory schema for your knowledge base. It defines the entity types, their required frontmatter fields, and the structure of the generated articles. Create `my-kb/ontology.yaml` with a configuration similar to the following:

```yaml
domain: "Software Engineering Research"

entity_types:
  concept:
    description: "A core idea or technique"
    frontmatter:
      fields:
        title: { type: string, required: true }
        entity_type: { type: string, required: true }
    article_structure:
      - heading: "Overview"
        description: "Definition of the concept."
        required: true
    linkable_to: [concept]
    indexable: true

budget:
  text_document_tokens: 8192
  image_tokens: 1200
  max_images_per_fetch: 3
```

### 3. Add Source Material
Populate the `raw/` directory with documents. The compiler supports various formats:
*   **Markdown**: Frontmatter is stripped and images are resolved.
*   **HTML**: Processed via readability extraction into Markdown.
*   **Code**: Extracts docstrings and comments.
*   **Images**: Detected via magic-bytes and saved to `compiled/assets/`.

### 4. Implement the Compilation Script
Create a TypeScript file to initialize the `KBCompiler` and run the pipeline. The compiler requires two models: an **extraction model** (typically a faster, cheaper model for planning) and a **synthesis model** (a more capable model for authoring).

```typescript
import { KBCompiler, makeGenerateFn } from 'yaaf/knowledge'
import { GeminiChatModel } from 'yaaf'

async function runCompilation() {
  // 1. Initialize the compiler
  const compiler = await KBCompiler.create({
    kbDir: './my-kb',
    extractionModel: makeGenerateFn(new GeminiChatModel({ model: 'gemini-2.5-flash' })),
    synthesisModel:  makeGenerateFn(new GeminiChatModel({ model: 'gemini-2.5-pro' })),
  })

  // 2. Execute the pipeline (raw/ → compiled/)
  const result = await compiler.compile()

  // 3. Log results
  console.log(`Created ${result.synthesis.created} articles`)
  if (result.lint) {
    console.log(`Lint errors: ${result.lint.summary.errors}`)
  }
}

runCompilation()
```

### 5. Verify the Output
After running the script, check the `compiled/` directory. You should see:
*   Subdirectories for each `entity_type` defined in your ontology.
*   Markdown files containing synthesized articles with wikilinks and frontmatter.
*   `.kb-registry.json`: An auto-maintained index of all compiled articles.
*   `.kb-lint-report.json`: A report detailing any consistency or schema errors.

## Configuration Reference

### Ontology Fields
| Field | Description |
| :--- | :--- |
| `domain` | A one-line description of the KB's subject area. |
| `entity_types` | Definitions for article categories (e.g., `concept`, `tool`). |
| `relationship_types` | Named relationships used for reciprocal link checking. |
| `vocabulary` | Known terms and aliases for entity mention detection. |
| `budget` | Token limits for source documents and images. |

### Frontmatter Types
The compiler validates frontmatter against these types:
*   `string`, `number`, `boolean`, `date`
*   `url`, `url[]`
*   `enum`, `enum[]`
*   `entity_ref`: A reference to another article's DocId.

## Common Mistakes
*   **Missing ontology.yaml**: The compiler will refuse to run without a valid ontology file in the KB root.
*   **Invalid Entity References**: Defining an `entity_ref` in the ontology that points to a non-existent or incorrectly typed entity.
*   **Token Overflow**: Providing source documents that exceed the `text_document_tokens` budget, leading to truncation during the extraction phase.
*   **Missing Reciprocal Links**: Defining a relationship in the ontology but failing to include the reciprocal link in the article structure, which triggers linter errors.

## Next Steps
*   Configure the **Self-Healing Linter** to automatically fix broken wikilinks.
*   Set up a CI/CD pipeline to re-compile the knowledge base when new files are added to the `raw/` directory.
*   Integrate the compiled knowledge base into an Agent's context for high-fidelity reasoning.