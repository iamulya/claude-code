---
summary: The architectural pattern of using LLMs to transform unstructured or semi-structured technical content into a formal, interlinked knowledge base.
title: Knowledge Base Compilation
entity_type: concept
stub: false
compiled_at: 2026-04-16T14:23:27.610Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/index.ts
confidence: 0.9
---

---
title: Knowledge Base Compilation
entity_type: concept
summary: The architectural pattern of using LLMs to transform unstructured or semi-structured technical content into a formal, interlinked knowledge base.
related_subsystems:
  - Knowledge Compiler
  - Ingester
  - Extractor
  - Synthesizer
  - Linter

## What It Is
Knowledge Base Compilation is the process of transforming raw, unstructured, or semi-structured technical data into a structured, validated, and interlinked set of articles. In YAAF, this concept addresses the challenge of maintaining high-quality documentation and context for LLM agents by treating knowledge as a "compiled" asset rather than a static collection of files.

The compilation process ensures that the resulting knowledge base (KB) adheres to specific schemas, maintains referential integrity through link graphs, and is grounded in the provided source material.

## How It Works in YAAF
The compilation process is orchestrated by a central pipeline coordinator (typically the `KBCompiler`) and proceeds through several distinct stages:

### 1. Ingestion
The `Ingester` stage converts raw source material into `IngestedContent`. This stage supports various formats, including PDFs and images, using specialized extractors such as `GeminiPdfExtractor`, `ClaudePdfExtractor`, or `OpenAIPdfExtractor`.

### 2. Extraction and Planning
The `Extractor` performs static analysis on the ingested content to identify a `CandidateConcept` list. It generates a `CompilationPlan` which includes a series of `ArticlePlan` objects. These plans define the `ArticleAction` (e.g., create, update, or delete) required to reach the desired state of the KB.

### 3. Synthesis
The `Synthesizer` is responsible for the core transformation. It uses LLMs (via `GenerateFn`) to produce `ParsedArticle` objects. This stage includes:
*   **Frontmatter Generation**: Creating and validating YAML metadata (`FrontmatterValidationResult`).
*   **Content Generation**: Synthesizing the body of the article based on the source material.
*   **Grounding**: Using a `Validator` to produce a `GroundingResult`, ensuring the synthesized content does not hallucinate facts absent from the source.

### 4. Validation and Linting
Once articles are synthesized, the `Linter` analyzes the entire `LinkGraph`. It identifies `LintIssue` objects (categorized by `LintCode` and `LintSeverity`) such as broken links, missing references, or structural inconsistencies. The system may attempt an `AutoFix` to resolve these issues automatically.

### 5. Refinement and Maintenance
Advanced stages handle the ongoing health of the KB:
*   **Vision Pass**: Uses `VisionPassOptions` to analyze visual elements and integrate them into the text.
*   **Heal**: The `Heal` process identifies and repairs structural or content-level defects.
*   **Discovery**: The `Discovery` stage suggests new connections (`DiscoveryConnection`) or identifies a `DepthImbalance` where certain topics lack sufficient detail.

## Configuration
The compilation process is configured via `KBCompilerOptions` and `CompileOptions`. Developers can define retry logic, model selection, and specific stage behaviors.

```typescript
import { KBCompilerOptions, CompileOptions } from './compiler.js';

const options: KBCompilerOptions = {
  // Configuration for the LLM provider
  llmClient: {
    model: "gpt-4",
    retryOptions: {
      maxRetries: 3,
    }
  },
  // Configuration for the synthesis and linting stages
  synthesis: {
    validateFrontmatter: true,
  },
  linter: {
    failOnErrors: true,
  }
};
```

## Sources
* `src/knowledge/compiler/index.ts`