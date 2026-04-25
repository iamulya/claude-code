---
title: GenerateOntologyOptions
summary: Options interface for the `generate` method of `OntologyGenerator`.
export_name: GenerateOntologyOptions
source_file: src/knowledge/ontology/generator.ts
category: interface
entity_type: api
search_terms:
 - ontology generation options
 - configure ontology generator
 - how to generate ontology.yaml
 - domain description for ontology
 - source directories for ontology scan
 - entity type hints
 - overwrite ontology file
 - OntologyGenerator generate method
 - bootstrap knowledge base schema
 - LLM-powered ontology creation
 - knowledge domain definition
 - specify srcDirs for ontology
stub: false
compiled_at: 2026-04-24T17:08:24.229Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/generator.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/index.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`Generate[[[[[[[[Ontology]]]]]]]]Options` is an interface that defines the configuration object for the `generate` method of the `OntologyGenerator` class [Source 1]. It provides the necessary context and instructions for an [LLM](../concepts/llm.md) to scan a project and draft an `Ontology.yaml` file tailored to the project's specific [Knowledge Domain](../concepts/knowledge-domain.md) [Source 1].

This options object is used to specify the high-level domain, the source code directories to analyze for context, optional hints about what entity types to create, and whether to overwrite an existing Ontology file [Source 1].

## Signature

The `GenerateOntologyOptions` interface is defined as follows [Source 1]:

```typescript
export interface GenerateOntologyOptions {
  /**
   * 1–3 sentence description of the knowledge domain.
   * Example: "FastAPI — a Python web framework for building REST APIs at speed.
   * Covers routing, dependency injection, validation, and deployment."
   */
  domain: string;
  /**
   * Directories to scan for file-tree context.
   * The generator reads top-level structure + README + package.json/pyproject.toml.
   * Defaults to `['./src']`.
   */
  srcDirs?: string[];
  /**
   * Optional hints about entity types to include.
   * Example: ['function', 'decorator', 'middleware', 'guide']
   * If omitted the LLM infers appropriate types from the domain + file tree.
   */
  entityTypeHints?: string[];
  /** Overwrite an existing ontology.yaml. Default false. */
  overwrite?: boolean;
}
```

## Properties

### domain

- **Type:** `string`
- **Required**

A concise, one-to-three sentence description of the knowledge domain. This is a critical input that guides the LLM in understanding the project's purpose and scope [Source 1].

Example: `"Acme SDK — a TypeScript library for interacting with the Acme Corp API."`

### srcDirs

- **Type:** `string[] | undefined`
- **Default:** `['./src']`

An array of directory paths to scan for context. The `OntologyGenerator` analyzes the file tree structure, `README` files, and project configuration files (like `package.json` or `pyproject.toml`) within these directories to inform the ontology generation process [Source 1].

### entityTypeHints

- **Type:** `string[] | undefined`

An optional array of strings that provide hints to the LLM about what kinds of entity types should be included in the ontology. If this property is omitted, the LLM will infer appropriate entity types based on the `domain` description and the scanned file context [Source 1].

Example: `['function', 'class', 'hook', 'guide']`

### overwrite

- **Type:** `boolean | undefined`
- **Default:** `false`

A flag indicating whether to overwrite an existing `ontology.yaml` file at the target path. By default, the generation process will fail if the file already exists to prevent accidental data loss [Source 1].

## Examples

### Basic Usage

The only required option is `domain`. This example generates an ontology based on the domain description, scanning the default `./src` directory.

```typescript
import { OntologyGenerator, makeGenerateFn } from 'yaaf/knowledge';
// Assume `myModel` is a configured LLM model instance

const generator = new OntologyGenerator({
  generateFn: makeGenerateFn(myModel),
  outputPath: './knowledge/ontology.yaml',
});

await generator.generate({
  domain: 'A TypeScript library for financial calculations, including loans and investments.',
});
```

### Advanced Usage

This example provides more context to the generator, including multiple source directories, hints for entity types, and an explicit instruction to overwrite any existing ontology file.

```typescript
import { OntologyGenerator, makeGenerateFn } from 'yaaf/knowledge';
// Assume `myModel` is a configured LLM model instance

const generator = new OntologyGenerator({
  generateFn: makeGenerateFn(myModel),
  outputPath: './knowledge/ontology.yaml',
});

await generator.generate({
  domain: 'FastAPI — a Python web framework for building REST APIs at speed. Covers routing, dependency injection, validation, and deployment.',
  srcDirs: ['./fastapi', './docs'],
  entityTypeHints: ['decorator', 'middleware', 'guide', 'class'],
  overwrite: true,
});
```

## Sources

[Source 1]: `src/knowledge/ontology/generator.ts`
[Source 2]: `src/knowledge/ontology/index.ts`