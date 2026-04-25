---
summary: This guide walks through the process of setting up and running the YAAF Knowledge Base compiler to transform raw source material into a structured wiki.
title: Compiling a YAAF Knowledge Base
entity_type: guide
difficulty: intermediate
search_terms:
 - how to build a knowledge base
 - YAAF KB compiler
 - knowledge base setup
 - ontology.yaml configuration
 - RAG alternative
 - structured knowledge for LLMs
 - compile knowledge pipeline
 - kb:init command
 - generate ontology file
 - LLM-powered documentation
 - convert docs to wiki
 - self-healing knowledge base
 - yaaf/knowledge API
 - human-readable knowledge base
 - deterministic knowledge generation
stub: false
compiled_at: 2026-04-24T18:06:17.990Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/knowledge-base.md
compiled_from_quality: documentation
confidence: 0.95
---

## Overview

This guide provides instructions for setting up and running the YAAF Knowledge Base (KB) compiler. The compiler ingests raw source material—such as documentation, research papers, or code—from a `raw/` directory and uses Large Language Models ([LLM](../concepts/llm.md)s) to produce a structured, interlinked wiki in a `compiled/` directory [Source 1].

This process is an alternative to Retrieval-Augmented Generation (RAG). Instead of retrieving unstructured chunks at query time, the LLM is provided with a coherent, human-readable wiki as part of its context. This compiled knowledge base features explicit cross-references, a consistent structure defined by an [Ontology](../concepts/ontology.md), and is automatically maintained by a [Linter](../concepts/linter.md) [Source 1].

By following this guide, you will:
1.  Establish the required directory structure for a new knowledge base.
2.  Generate a domain-specific `ontology.yaml` file to define the KB's schema.
3.  Run the compiler to transform your raw source files into structured articles.

## Step-by-Step

### Step 1: Set Up the Directory Structure

The KB compiler expects a specific directory layout. Create a root directory for your knowledge base (e.g., `my-kb/`) with the following structure [Source 1]:

```
my-kb/
│
├── ontology.yaml              ← To be generated in the next step
│
├── raw/                       ← Place your source material here
│   ├── papers/
│   └── notes/
│
└── compiled/                  ← Output directory for the compiler
```

The compiler also automatically creates and maintains `.kb-registry.json` and `.kb-lint-report.json` files in the root directory [Source 1].

### Step 2: Generate the Ontology

The `ontology.yaml` file is the schema for your knowledge base. It defines [Entity Type](../concepts/entity-type.md)s, their [Frontmatter](../concepts/frontmatter.md) fields, [Article Structure](../concepts/article-structure.md), and [Vocabulary](../concepts/vocabulary.md). The compiler requires a valid ontology to run [Source 1].

YAAF provides an LLM-powered script to bootstrap this file by scanning your project. This is the recommended starting point [Source 1].

#### Option A: Interactive Generation

Run the `kb:init` script from your project's root. It will guide you through a series of prompts to generate the ontology [Source 1].

```bash
npm run kb:init
```

The interactive prompt will ask for a domain description, source directories to scan, and optional Entity Type hints [Source 1].

#### Option B: Non-Interactive Generation

For scripting or CI environments, use the `init-ontology.ts` script directly with command-line arguments [Source 1].

```bash
npx tsx knowledge/scripts/init-ontology.ts \
  --domain "My SDK — a TypeScript library for X" \
  --src ./src --src ./docs \
  --entity-types "class,function,guide" \
  --model gemini-2.5-flash
```

#### Option C: Programmatic Generation

You can also invoke the `OntologyGenerator` directly within your own TypeScript code [Source 1].

```typescript
import { OntologyGenerator, makeGenerateFn } from 'yaaf/knowledge'
import { GeminiChatModel } from 'yaaf'

const generator = new OntologyGenerator({
  generateFn: makeGenerateFn(new GeminiChatModel({ model: 'gemini-2.5-flash' })),
  outputPath: './my-kb/ontology.yaml',
})

const result = await generator.generate({
  domain: 'Acme SDK — a TypeScript library for building widgets.',
  srcDirs: ['./src'],
  entityTypeHints: ['class', 'hook', 'guide'],
})

console.log(`Written to: ${result.outputPath}`)
```

After generation, it is recommended to review and edit the `ontology.yaml` file to refine entity types, article structures, and vocabulary based on your domain expertise [Source 1].

### Step 3: Add Raw Source Material

Place all your source documents into the `raw/` directory. You can organize them into any subdirectory structure that makes sense for your project, such as `papers/`, `web-clips/`, or `docs/` [Source 1]. The compiler will recursively scan this directory for content to process.

### Step 4: Run the Compiler

With the directory structure, ontology, and raw materials in place, you can run the compiler. The `KBCompiler` class orchestrates the entire pipeline, from extraction to synthesis and [Linting](../concepts/linting.md) [Source 1].

Create a TypeScript script to instantiate and run the compiler.

```typescript
import { KBCompiler, makeGenerateFn } from 'yaaf/knowledge'
import { GeminiChatModel } from 'yaaf'

async function main() {
  // 1. Create the compiler instance.
  // This loads ontology.yaml and .kb-registry.json from the specified directory.
  const compiler = await KBCompiler.create({
    kbDir: './my-kb',
    // A smaller, faster model for initial concept extraction.
    extractionModel: makeGenerateFn(new GeminiChatModel({ model: 'gemini-2.5-flash' })),
    // A more powerful model for writing the final articles.
    synthesisModel:  makeGenerateFn(new GeminiChatModel({ model: 'gemini-2.5-pro' })),
  })

  // 2. Run the full compilation pipeline.
  const result = await compiler.compile()

  // 3. Log the results.
  console.log(`Created ${result.synthesis.created} articles`)
  console.log(`Updated ${result.synthesis.updated} articles`)
  console.log(`Stubs:   ${result.synthesis.stubsCreated}`)

  if (result.lint) {
    console.log(`Lint errors: ${result.lint.summary.errors}`)
    console.log(`Auto-fixable: ${result.lint.summary.autoFixable}`)
  }
}

main().catch(console.error)
```

After the script finishes, the `compiled/` directory will be populated with structured markdown articles generated by the LLM based on your source material and ontology [Source 1].

## Configuration Reference

The `ontology.yaml` file is the central configuration for the [Knowledge Base Compiler](../subsystems/knowledge-base-compiler.md). It is used at every stage of the pipeline to guide extraction, synthesis, and linting [Source 1].

Below is an example structure with explanations for a machine learning domain.

```yaml
# ── Domain ─────────────────────────────────────────────────────────────────────
# A one-line description of the knowledge base's subject area.
domain: "Machine Learning Research"

# ── Entity Types ───────────────────────────────────────────────────────────────
# Defines the different types of articles in the KB. Each type gets a subdirectory
# in compiled/.
entity_types:

  concept:
    description: "A core idea, technique, or abstraction in ML"

    # Defines the YAML frontmatter schema for this entity type.
    frontmatter:
      fields:
        title:
          description: "Full canonical title"
          type: string
          required: true
        entity_type:
          description: "Always 'concept'"
          type: string
          required: true
        status:
          description: "Maturity of this concept in the field"
          type: enum
          required: false
          enum: [established, emerging, deprecated, speculative]
        introduced_in:
          description: "DocId of the research paper that introduced this concept"
          type: entity_ref
          required: false
          target_entity_type: research_paper

    # Defines the required and optional sections for the article body.
    # The LLM uses these headings and descriptions as instructions.
    article_structure:
      - heading: "Overview"
        description: "What is this concept? Define it clearly and concisely."
        required: true
      - heading: "How It Works"
        description: "Mechanism, math, or algorithm — as appropriate for the concept."
        required: false

    # Specifies which other entity types this type of article can wikilink to.
    linkable_to:
      - concept
      - research_paper
      - tool

    # Determines if this entity type appears in the global index.
    indexable: true

  research_paper:
    description: "An academic paper, preprint, or technical report"
    frontmatter:
      # ... fields like title, authors, year, venue ...
    article_structure:
      # ... sections like Summary, Key Contributions, Results ...
    linkable_to:
      - concept
      - tool
    indexable: true

# ... other entity types like 'tool' ...
```

## Next Steps

Once your knowledge base is compiled, the next step is to integrate it into an agent or application. The `yaaf/knowledge` module provides runtime classes for this purpose [Source 1]:
*   **KnowledgeBase** and **KBStore**: Classes for loading and querying the compiled KB from disk.
*   **createKB[Tools](../subsystems/tools.md)**: A utility function to create ready-to-use Tools for an agent, allowing it to read and query articles from the KB.
*   **FederatedKnowledgeBase**: A class for combining and querying multiple compiled knowledge bases at once.

## Sources

[Source 1] /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/knowledge-base.md