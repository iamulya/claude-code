---
title: OntologyGeneratorOptions
summary: Options interface for configuring the `OntologyGenerator` class.
export_name: OntologyGeneratorOptions
source_file: src/knowledge/ontology/generator.ts
category: interface
entity_type: api
search_terms:
 - configure ontology generator
 - ontology generation options
 - set LLM for ontology
 - ontology output path
 - max context tokens for ontology
 - OntologyGenerator constructor
 - how to create an ontology
 - bootstrap ontology.yaml
 - knowledge base setup
 - GenerateFn for ontology
 - ontology file location
stub: false
compiled_at: 2026-04-24T17:23:38.758Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/generator.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/index.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `[[[[[[[[Ontology]]]]]]]]GeneratorOptions` interface defines the configuration object passed to the constructor of the `OntologyGenerator` class. It is used to specify the core dependencies and behavior of the generator instance, such as the Language Model ([LLM](../concepts/llm.md)) function to use for generation, the output path for the resulting `Ontology.yaml` file, and context token limits [Source 1].

This options object is essential for initializing an `OntologyGenerator` before it can be used to bootstrap a new Ontology for a project [Source 1].

## Signature

`OntologyGeneratorOptions` is a TypeScript interface with the following properties [Source 1]:

```typescript
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
```

### Properties

| Property           | Type           | Description                                                                                                                                                           |
| ------------------ | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generateFn`       | `GenerateFn`   | **Required.** The function that interacts with an LLM. It takes system and user prompts and returns the generated text. This is the core logic for content generation. |
| `outputPath`       | `string`       | _Optional._ The file path where the generated `ontology.yaml` will be saved. If not provided, it defaults to `./knowledge/ontology.yaml` in the current working directory. |
| `maxContextTokens` | `number`       | _Optional._ The maximum number of tokens to include in the project context (file tree, README, etc.) sent to the LLM. The default value is 6000.                        |

## Examples

The following example demonstrates how to create an `OntologyGeneratorOptions` object and use it to instantiate an `OntologyGenerator`.

```typescript
import { OntologyGenerator, OntologyGeneratorOptions } from 'yaaf/knowledge';
import { makeGenerateFn } from 'yaaf/llm'; // Assuming makeGenerateFn is available
import { myModel } from './my-llm-provider'; // A hypothetical LLM model instance

// Define the configuration for the ontology generator
const options: OntologyGeneratorOptions = {
  generateFn: makeGenerateFn(myModel),
  outputPath: './knowledge/ontology.yaml',
  maxContextTokens: 8000, // Override the default token limit
};

// Create a new generator instance with the specified options
const generator = new OntologyGenerator(options);

// The generator is now configured and ready to be used.
// await generator.generate({ domain: 'My project domain...' });
```

## See Also

*   `OntologyGenerator`: The class that uses this options interface for its configuration.
*   `GenerateOntologyOptions`: A separate options interface used for the `generate` method of the `OntologyGenerator` class.
*   `GenerateFn`: The type definition for the LLM interaction function required by the `generateFn` property.

## Sources

[Source 1]: src/knowledge/ontology/generator.ts
[Source 2]: src/knowledge/ontology/index.ts