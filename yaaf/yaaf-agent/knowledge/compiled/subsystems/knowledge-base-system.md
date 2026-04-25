---
summary: The YAAF Knowledge Base System provides a pipeline for compiling raw source material into a structured, LLM-readable knowledge base.
primary_files:
 - yaaf/knowledge
 - src/knowledge/compiler.ts
 - src/knowledge/ontology-generator.ts
title: Knowledge Base System
entity_type: subsystem
exports:
 - KBCompiler
 - OntologyGenerator
 - KnowledgeBase
 - makeGenerateFn
 - createKBTools
 - KBLinter
 - ConceptExtractor
 - KnowledgeSynthesizer
search_terms:
 - compile knowledge base
 - RAG alternative
 - LLM knowledge compilation
 - structured knowledge for LLMs
 - ontology-driven knowledge base
 - how to create a YAAF KB
 - yaaf/knowledge module
 - KBCompiler
 - OntologyGenerator
 - self-healing knowledge base
 - human-readable LLM context
 - TF-IDF search in YAAF
 - wikilink graph
 - static knowledge for agents
stub: false
compiled_at: 2026-04-24T18:14:58.455Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/knowledge-base.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/tfidfSearch.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/wikilinkGraph.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Purpose

The YAAF Knowledge Base System provides a "compile-time" approach to equipping [LLM](../concepts/llm.md) agents with domain knowledge, serving as an alternative to traditional Retrieval-Augmented Generation (RAG) [Source 1]. Instead of retrieving and embedding unstructured text chunks at query time, this system ingests raw source materials—such as documentation, research papers, and code—and compiles them into a structured, human-readable, and LLM-friendly wiki [Source 1].

This approach aims to solve several limitations of RAG by creating a knowledge base that is:
- **Structured:** The LLM receives a coherent, wiki-style article with sections and [Frontmatter](../concepts/frontmatter.md), rather than disconnected text chunks.
- **Cross-referenced:** Relationships between entities are explicitly captured via `[]`.
- **Inspectable:** Both humans and LLMs can read the compiled knowledge base, making it transparent and editable.
- **Deterministic and Self-Healing:** The compilation process is repeatable, and an integrated [Linter](../concepts/linter.md) automatically finds and fixes inconsistencies [Source 1].

The system trades the runtime cost and unpredictability of RAG for a one-time, offline compilation cost [Source 1].

## Architecture

The Knowledge Base System is organized around a central compilation pipeline that transforms raw content into a structured wiki, guided by a domain-specific [Ontology](../concepts/ontology.md). The system also includes runtime components for querying the compiled knowledge base [Source 1].

### Directory Structure

A YAAF knowledge base follows a standardized directory structure [Source 1]:

```
my-kb/
│
├── ontology.yaml              ← Domain schema; defines [[[[[[[[Entity Type]]]]]]]]s, fields, and structure.
│
├── raw/                       ← Raw source material (e.g., .md, .html, code files).
│   ├── papers/
│   └── notes/
│
├── compiled/                  ← LLM-authored wiki, managed by the compiler.
│   ├── concepts/
│   └── tools/
│
├── .kb-registry.json          ← An auto-maintained index of all compiled articles.
└── .kb-lint-report.json       ← The output of the last [[[[[[[[Linting]]]]]]]] process.
```

### The Ontology

The `ontology.yaml` file is the schema and source of truth for the entire knowledge base. It is a required component that defines [Source 1]:
- **`domain`**: A high-level description of the knowledge base's subject matter.
- **`entity_types`**: The different kinds of articles that can exist (e.g., `concept`, `tool`, `guide`).
- **`frontmatter`**: The required and optional metadata fields for each Entity Type, including their data types (e.g., `string`, `enum`, `entity_ref`).
- **`article_structure`**: The prescribed headings and content descriptions for each entity type, which guides the LLM during synthesis.
- **`linkable_to`**: Rules defining which entity types can link to others.

The ontology is used at every stage of the pipeline, from prompt generation to validation and Linting [Source 1].

### Compilation Pipeline

The core of the system is the `KBCompiler`, which orchestrates a multi-stage process to convert files from the `raw/` directory to the `compiled/` directory [Source 1].

1.  **Ontology Generation (Optional Bootstrap)**: For new projects, the `OntologyGenerator` can be used to create an initial `ontology.yaml`. It scans source directories and uses an LLM to draft a complete schema based on the project's content and user-provided hints. This can be run interactively via `npm run kb:init` or programmatically [Source 1].

2.  **Extraction (`ConceptExtractor`)**: This stage processes the raw source material. It performs a static analysis pass first, scanning for known [Vocabulary](../concepts/vocabulary.md) terms from the ontology. This pre-analysis reduces the LLM's workload, prevents hallucinated links, and saves tokens by providing the model with a list of known entities before it begins extraction [Source 1].

3.  **Synthesis (`KnowledgeSynthesizer`)**: Using the output from the extractor, this stage prompts an LLM to write the final markdown articles. The prompts are structured according to the `article_structure` and `frontmatter` fields defined in the ontology for each entity type [Source 1].

4.  **Linting (`KBLinter`)**: After synthesis, a self-healing linter runs on the `compiled/` directory. It validates the generated articles against the ontology, checking for correct frontmatter, valid [Wikilinks](../concepts/wikilinks.md), and other consistency rules. It can automatically fix certain classes of errors [Source 1].

### Runtime Components

Once compiled, the knowledge base can be loaded and used by an agent.

-   **`KnowledgeBase`**: The main runtime class for loading a compiled KB from disk and providing query interfaces [Source 1].
-   **`TfIdfSearchPlugin`**: The default search implementation (`KBSearchAdapter`). It is a zero-dependency [TF-IDF](../concepts/tf-idf.md) search engine featuring sublinear TF-IDF scoring, field weighting (title, aliases, body), multilingual [tokenization](../concepts/tokenization.md), and vocabulary-aware query expansion. It builds an in-[Memory](../concepts/memory.md) inverted index [when](../apis/when.md) the `KnowledgeBase` is loaded [Source 2].
-   **`WikilinkGraphPlugin`**: The default graph implementation (`KBGraphAdapter`). It constructs an in-memory, bidirectional graph from the `wikilinks` present in the compiled articles, allowing for traversal of entity relationships [Source 3].

## Integration Points

The Knowledge Base System integrates with other parts of the YAAF framework in several ways:
-   **Agent [Tools](./tools.md)**: The `createKBTools` function provides a simple way to expose the knowledge base's search and lookup capabilities as tools for a YAAF agent [Source 1].
-   **LLM Providers**: The compilation pipeline is provider-agnostic. It connects to LLM models (e.g., `GeminiChatModel`) through the `makeGenerateFn` adapter function, which wraps any compliant model for use by the `KBCompiler` [Source 1].
-   **[Plugin System](./plugin-system.md)**: The default search and graph functionalities can be replaced by custom implementations. By registering plugins that implement the `KBSearchAdapter` or `KBGraphAdapter` interfaces, developers can integrate external systems like Neo4j or specialized vector databases [Source 2, Source 3].

## Key APIs

All public APIs for this subsystem are exported from the `yaaf/knowledge` module [Source 1].

-   **`KBCompiler`**: The primary class for orchestrating the knowledge base compilation pipeline from raw sources to a compiled wiki.
-   **`OntologyGenerator`**: An LLM-powered utility to bootstrap an `ontology.yaml` file by scanning a project's source code and documentation.
-   **`KnowledgeBase`**: The runtime class used to load a compiled knowledge base and perform queries against it.
-   **`makeGenerateFn`**: A factory function that adapts a YAAF-compatible LLM model instance for use within the knowledge base pipeline.
-   **`createKBTools`**: A utility function that generates a set of standard agent tools (e.g., search, lookup) for a loaded `KnowledgeBase` instance.
-   **`KBLinter`**: The class responsible for validating and automatically fixing inconsistencies in a compiled knowledge base.

## Configuration

Configuration of the Knowledge Base System occurs at two levels:

1.  **`ontology.yaml`**: This file is the primary and most detailed form of configuration. It dictates the entire structure, schema, and vocabulary of the knowledge base. Developers must define `entity_types`, their `frontmatter` fields, and their `article_structure` to guide the LLM's output [Source 1].

2.  **`KBCompiler` Instantiation**: When creating a `KBCompiler` instance, the developer provides runtime configuration, including the path to the knowledge base directory and the LLM instances to use for the extraction and synthesis stages [Source 1].

    ```typescript
    const compiler = await KBCompiler.create({
      kbDir: './my-kb',
      extractionModel: makeGenerateFn(new GeminiChatModel({ model: 'gemini-2.5-flash' })),
      synthesisModel:  makeGenerateFn(new GeminiChatModel({ model: 'gemini-2.5-pro' })),
    })
    ```

## Extension Points

The system is designed to be extensible, primarily through the YAAF plugin system.

-   **Custom Search Adapter**: The default `TfIdfSearchPlugin` can be replaced by providing a custom class that implements the `KBSearchAdapter` interface. This allows integration with external search engines or vector databases [Source 2].
-   **Custom Graph Adapter**: Similarly, the default in-memory `WikilinkGraphPlugin` can be swapped out with a `KBGraphAdapter` implementation that connects to a persistent graph database like Neo4j or Memgraph [Source 3].
-   **Custom Tokenizer**: The `TfIdfSearchPlugin` itself can be configured with a custom tokenizer that implements the `TokenizerStrategy` interface, enabling specialized text processing for different languages or domains [Source 2].

## Sources
- [Source 1]: yaaf/yaaf-agent/knowledge/raw/docs/knowledge-base.md
- [Source 2]: yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/tfidfSearch.ts
- [Source 3]: yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/wikilinkGraph.ts