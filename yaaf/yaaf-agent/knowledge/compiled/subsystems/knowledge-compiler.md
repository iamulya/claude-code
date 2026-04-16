---
title: Knowledge Compiler
entity_type: subsystem
summary: The subsystem responsible for analyzing source code and documentation to generate structured knowledge base compilation plans.
primary_files:
  - src/knowledge/compiler/extractor/index.ts
  - src/knowledge/compiler/extractor/types.ts
  - src/knowledge/compiler/extractor/extractor.ts
stub: false
compiled_at: 2026-04-16T14:22:55.640Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/extractor/index.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/extractor/prompt.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/heal.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/index.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/linter/fixer.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/synthesizer/frontmatter.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/synthesizer/types.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/utils.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/validator.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/versioning.ts
confidence: 0.95
---

## Purpose
The Knowledge Compiler is the central pipeline of the YAAF knowledge management system. Its primary purpose is to transform raw, unstructured source material—such as source code, documentation, and PDFs—into a structured, interconnected knowledge base of markdown articles. It automates the extraction of concepts, ensures adherence to a defined ontology, validates factual grounding, and maintains version history of the generated content.

## Architecture
The Knowledge Compiler operates as a multi-stage pipeline coordinated by the `KBCompiler` class. The architecture is divided into several distinct phases:

### 1. Ingestion and Extraction
The pipeline begins by ingesting raw content through specialized `Ingester` modules. The **Concept Extractor** then performs an LLM-based analysis (typically using fast models like `gemini-2.5-flash`) to compare the ingested content against the existing **Concept Registry** and **Ontology**. 

This phase produces a `CompilationPlan`, which contains:
*   **ArticlePlans**: Specific instructions to create, update, or skip articles.
*   **CandidateConcepts**: New terms identified in the source that do not yet exist in the registry.
*   **Static Analysis**: Pre-computed facts such as entity mentions and directory hints.

### 2. Synthesis
The **Knowledge Synthesizer** consumes the `CompilationPlan` to generate markdown articles. It performs the following tasks:
*   **Content Generation**: Uses an LLM to draft the article body based on source material.
*   **Frontmatter Management**: Generates and validates YAML frontmatter against the ontology schema. It injects mandatory metadata such as `entity_type`, `compiled_at`, and `confidence`.
*   **Concurrent Processing**: Supports configurable concurrency to balance speed against API rate limits.

### 3. Validation and Grounding
Post-synthesis, the compiler runs a **Grounding Validator** (Phase 5C). This component uses keyword overlap scoring rather than an LLM to detect potential hallucinations. It calculates a grounding score (0-1) based on how many claims in the synthesized article are backed by the original source texts.

### 4. Quality Control: Linting and Healing
The compiler includes a suite of tools for maintaining KB health:
*   **Linter**: Identifies issues like broken wikilinks, non-canonical aliases, or missing required fields.
*   **Auto-Fixer**: Automatically resolves simple issues like rewriting aliases to canonical titles.
*   **Heal Mode**: An opt-in, LLM-powered repair stage that fixes complex issues such as expanding thin "stub" articles or identifying related articles for cross-linking.

### 5. Versioning and Persistence
Before writing to disk, the compiler uses a versioning module (Phase 1A) to prevent data loss:
*   **Identity Check**: Uses SHA-256 hashes to skip writing if content is unchanged.
*   **Backups**: Moves existing articles to a `.versions/` directory with a timestamp before overwriting.
*   **Pruning**: Automatically removes old versions beyond a configured limit.

## Key APIs
*   `KBCompiler`: The top-level coordinator for the compilation pipeline.
*   `healLintIssues`: Triggers LLM-powered repair of linting violations.
*   `validateGrounding`: Performs keyword-based validation of article claims against sources.
*   `applyFixes`: Programmatically applies auto-fixable changes to the compiled files.
*   `writeWithVersioning`: Handles the atomic write and backup process for articles.

## Configuration
The compiler is configured via `KBCompilerOptions` and `CompileOptions`. Key configuration parameters include:
*   **Concurrency**: The number of articles to synthesize simultaneously (default: 3).
*   **Incremental Mode**: If enabled, skips synthesis for articles where source files are older than the existing compiled article.
*   **Stub Confidence Threshold**: The minimum LLM confidence score required to automatically create a stub article for a new concept (default: 0.7).
*   **Max Versions**: The number of historical versions to retain in the `.versions/` directory.

## Extension Points
Developers can extend the compiler's behavior through several interfaces:
*   **Ingesters**: Custom logic for parsing new file formats (e.g., specialized PDF extractors).
*   **LLM Clients**: The `LLMCallFn` and `VisionCallFn` types allow developers to provide their own provider-agnostic LLM implementations.
*   **Ontology**: The entire extraction and synthesis process is governed by a pluggable `KBOntology` that defines the allowed entity types and frontmatter schemas.