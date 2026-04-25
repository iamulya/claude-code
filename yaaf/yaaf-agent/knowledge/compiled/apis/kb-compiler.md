---
summary: Orchestrates the compilation of raw source material into a structured, wiki-like knowledge base.
export_name: KBCompiler
source_file: yaaf/knowledge
category: class
title: KBCompiler
entity_type: api
search_terms:
 - compile knowledge base
 - build wiki from documents
 - YAAF knowledge pipeline
 - RAG alternative
 - structured knowledge generation
 - LLM-powered wiki
 - ontology-driven compilation
 - raw to compiled knowledge
 - knowledge base linter
 - self-healing knowledge base
 - Karpathy-style knowledge
 - how to create a YAAF KB
 - yaaf/knowledge compiler
stub: false
compiled_at: 2026-04-24T17:16:01.743Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/knowledge-base.md
compiled_from_quality: documentation
confidence: 0.95
---

## Overview

The `KBCompiler` class is the primary coordinator for YAAF's knowledge base compilation pipeline [Source 1]. It implements a "compile your knowledge" approach, which transforms raw source materials (such as documents, code, and web clippings) into a structured, cross-referenced, and human-readable wiki [Source 1]. This process serves as an alternative to traditional Retrieval-Augmented Generation (RAG) by pre-processing knowledge into a coherent structure that an [LLM](../concepts/llm.md) can read as part of its context, rather than retrieving disparate chunks at query time [Source 1].

The compiler manages the entire [workflow](../concepts/workflow.md):
1.  Ingesting source files from a `raw/` directory.
2.  Using an LLM to extract key concepts and entities based on a user-defined schema (`[[[[[[[[Ontology]]]]]]]].yaml`).
3.  Using another LLM to synthesize structured wiki articles for each entity, complete with [Frontmatter](../concepts/frontmatter.md) and [Wikilinks](../concepts/wikilinks.md).
4.  Writing the final articles to a `compiled/` directory.
5.  Running a self-healing [Linter](../concepts/linter.md) to ensure consistency, validate links, and check frontmatter against the Ontology [Source 1].

A `KBCompiler` instance is configured with a knowledge base directory, which must contain a valid `ontology.yaml` file for the compiler to function [Source 1].

## Signature / Constructor

`KBCompiler` is instantiated using the static asynchronous factory method `KBCompiler.create()`. This method loads the necessary configuration files, such as `ontology.yaml` and `.kb-registry.json`, from the specified knowledge base directory [Source 1].

```typescript
// Static factory method
static async create(config: KBCompilerConfig): Promise<KBCompiler>;

// Configuration interface
interface KBCompilerConfig {
  /** The root directory of the knowledge base. */
  kbDir: string;

  /** The model function used for the concept extraction stage. */
  extractionModel: GenerateFn;

  /** The model function used for the article synthesis stage. */
  synthesisModel: GenerateFn;
}
```

The `extractionModel` and `synthesisModel` are of type `GenerateFn`, which is a standardized function signature for interacting with LLMs. The `makeGenerateFn` factory is typically used to adapt a YAAF model instance, like `GeminiChatModel`, for this purpose [Source 1].

## Methods & Properties

### compile()

This method executes the full compilation pipeline, processing files from the `raw/` directory and outputting them to the `compiled/` directory. It returns a summary of the operations performed [Source 1].

**Signature**
```typescript
async compile(): Promise<KBCompilationResult>;
```

**Return Value**
A `Promise` that resolves to a `KBCompilationResult` object with the following structure:

```typescript
interface KBCompilationResult {
  synthesis: {
    created: number;    // Number of new articles created
    updated: number;    // Number of existing articles updated
    stubsCreated: number; // Number of stub articles created for linking
  };
  lint?: {
    summary: {
      errors: number;     // Total number of linting errors
      autoFixable: number; // Number of errors that can be auto-fixed
    };
    // ... other linting details
  };
}
```

## Examples

### Basic Compilation

The following example demonstrates how to create a `KBCompiler` instance and run the compilation process for a knowledge base located in the `./my-kb` directory [Source 1].

```typescript
import { KBCompiler, makeGenerateFn } from 'yaaf/knowledge';
import { GeminiChatModel } from 'yaaf';

// 1. Create the compiler instance.
// This loads ontology.yaml and .kb-registry.json from disk.
const compiler = await KBCompiler.create({
  kbDir: './my-kb',
  extractionModel: makeGenerateFn(new GeminiChatModel({ model: 'gemini-2.5-flash' })),
  synthesisModel:  makeGenerateFn(new GeminiChatModel({ model: 'gemini-2.5-pro' })),
});

// 2. Run the compilation pipeline.
const result = await compiler.compile();

// 3. Log the results.
console.log(`Created ${result.synthesis.created} articles`);
console.log(`Updated ${result.synthesis.updated} articles`);
console.log(`Stubs:   ${result.synthesis.stubsCreated}`);

if (result.lint) {
  console.log(`Lint errors: ${result.lint.summary.errors}`);
  console.log(`Auto-fixable: ${result.lint.summary.autoFixable}`);
}
```

### Expected Directory Structure

The `kbDir` passed to the compiler should point to a directory with the following structure [Source 1]:

```
my-kb/
│
├── ontology.yaml              ← Required: Defines the KB schema
│
├── raw/                       ← Source material for compilation
│   ├── papers/
│   └── notes/
│
├── compiled/                  ← Output directory for generated articles
│   ├── concepts/
│   └── assets/
│
├── .kb-registry.json          ← Auto-maintained index of compiled articles
└── .kb-lint-report.json       ← Output of the last linting run
```

## Sources

[Source 1] YAAF Knowledge Base. File: `/Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/knowledge-base.md`