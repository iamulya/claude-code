---
summary: A class that uses an LLM to scan a project and generate an `ontology.yaml` file tailored to a specific knowledge domain.
export_name: OntologyGenerator
source_file: src/knowledge/ontology/generator.ts
category: class
title: OntologyGenerator
entity_type: api
search_terms:
 - generate ontology.yaml
 - bootstrap knowledge base
 - kb:init script
 - create domain schema
 - LLM-powered schema generation
 - how to start a YAAF KB
 - scan project for entities
 - define entity types
 - auto-generate KB schema
 - knowledge base initialization
 - ontology bootstrapping
 - programmatic ontology creation
stub: false
compiled_at: 2026-04-24T17:23:46.151Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/knowledge-base.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/generator.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `[[[[[[[[Ontology]]]]]]]]Generator` is a utility class that bootstraps a new YAAF Knowledge Base by creating its foundational `Ontology.yaml` file [Source 1, Source 2]. It uses a Large Language Model ([LLM](../concepts/llm.md)) to analyze a project's source code and documentation, drafting a complete and valid Ontology tailored to the project's specific domain [Source 1].

This class is the recommended way to begin a new knowledge base, as it automates the creation of the domain schema, which is required for the `[[[[[[[[KBCompiler]]]]]]]]` to run [Source 1]. The generator performs the following steps:

1.  Scans the file tree of specified source directories (up to a depth of 3, skipping common ignored directories like `node_modules`) [Source 1].
2.  Reads key files like `README.md` and `package.json` to understand the project's context [Source 1].
3.  Sends the gathered context, along with a user-provided domain description and optional entity hints, to an LLM [Source 1].
4.  Receives the generated YAML from the LLM and validates it using `[[[[[[[[OntologyLoader]]]]]]]].load()` [Source 1].
5.  Writes the final `ontology.yaml` to the specified output path [Source 1, Source 2].

While the generator automates most of the work, it is recommended that users review and refine the generated ontology to leverage their domain expertise before running the first knowledge base compilation [Source 1].

The `OntologyGenerator` powers the interactive `npm run kb:init` command-line tool [Source 1].

## Constructor

The `OntologyGenerator` is instantiated with a configuration object that provides the LLM function and output settings.

```typescript
import type { GenerateFn } from 'yaaf/knowledge';

export interface OntologyGeneratorOptions {
  /** LLM generate function (system, user) → text */
  generateFn: GenerateFn;
  /**
   * Path where ontology.yaml will be written.
   * Defaults to `<cwd>/knowledge/ontology.yaml`.
   */
  outputPath?: string;
  /** Max tokens to allow in the project context sent to the LLM. Default 6000. */
  maxContextTokens?: number;
}

export class OntologyGenerator {
  constructor(options: OntologyGeneratorOptions);
}
```
[Source 2]

## Methods & Properties

### generate

The primary method, `generate`, executes the ontology generation process. It takes a configuration object describing the [Knowledge Domain](../concepts/knowledge-domain.md) and returns a promise that resolves with the result.

#### Signature

```typescript
generate(options: GenerateOntologyOptions): Promise<GenerateOntologyResult>;
```
[Source 2]

#### Parameters

The `options` object has the following structure:

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
[Source 2]

#### Returns

The method returns a `Promise<GenerateOntologyResult>` with the following structure:

```typescript
export interface GenerateOntologyResult {
  /** Absolute path of the written file */
  outputPath: string;
  /** The raw YAML string that was written */
  yaml: string;
  /** Warnings from validation (non-fatal) */
  warnings: string[];
}
```
[Source 2]

## Examples

### Programmatic Usage

This example demonstrates how to use `OntologyGenerator` directly in a script to create an `ontology.yaml` file.

```typescript
import { OntologyGenerator, makeGenerateFn } from 'yaaf/knowledge';
import { GeminiChatModel } from 'yaaf';

// Configure the LLM to use for generation
const generateFn = makeGenerateFn(new GeminiChatModel({ model: 'gemini-2.5-flash' }));

// Instantiate the generator
const generator = new OntologyGenerator({
  generateFn: generateFn,
  outputPath: './knowledge/ontology.yaml',
});

// Run the generation process
const result = await generator.generate({
  domain: 'Acme SDK — a TypeScript library for building widgets.',
  srcDirs: ['./src'],
  entityTypeHints: ['class', 'hook', 'guide'],
});

console.log(`Written to: ${result.outputPath}`);
if (result.warnings.length > 0) {
  console.log('Warnings:', result.warnings);
}
```
[Source 1]

### Command-Line Usage

The `OntologyGenerator` class is used internally by the `kb:init` script, which provides an interactive command-line interface for bootstrapping a knowledge base.

```bash
npm run kb:init
```
[Source 1]

It can also be run non-interactively for scripting or CI environments:

```bash
npx tsx knowledge/scripts/init-ontology.ts \
  --domain "My SDK — a TypeScript library for X" \
  --src ./src --src ./docs \
  --entity-types "class,function,guide" \
  --model gemini-2.5-flash
```
[Source 1]

## See Also

*   **Ontology:** The `ontology.yaml` file is the schema for a knowledge base, defining entity types, their structure, and relationships. The `OntologyGenerator` is responsible for creating this file.
*   **KBCompiler:** The primary class for compiling a knowledge base, which consumes the `ontology.yaml` file generated by this class.
*   **OntologyLoader:** A utility used internally by `OntologyGenerator` to load and validate the generated ontology.

## Sources

*   [Source 1]: YAAF Knowledge Base (`/Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/knowledge-base.md`)
*   [Source 2]: Source: src/knowledge/ontology/generator.ts (`/Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/generator.ts`)