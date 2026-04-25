---
title: GenerateOntologyResult
summary: The result interface for the `generate` method of `OntologyGenerator`, containing the output path, YAML content, and any validation warnings.
export_name: GenerateOntologyResult
source_file: src/knowledge/ontology/generator.ts
category: interface
entity_type: api
search_terms:
 - ontology generation result
 - OntologyGenerator output
 - what does OntologyGenerator.generate return
 - ontology YAML output path
 - generated ontology warnings
 - bootstrap ontology result
 - knowledge base schema generation
 - LLM-powered ontology creation
 - ontology.yaml generation
 - autogenerate knowledge schema
 - ontology generator return type
stub: false
compiled_at: 2026-04-24T17:08:36.417Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/generator.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/index.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`Generate[[[[[[[[Ontology]]]]]]]]Result` is an interface that defines the shape of the object returned by the `generate` method of the `OntologyGenerator` class [Source 1].

This object provides the outcome of the Ontology generation process, including the location of the created `ontology.yaml` file, its raw content, and a list of any non-fatal validation warnings that occurred. It is used in build scripts and other automation to confirm the successful creation of the ontology file and to log any potential issues with the generated schema [Source 1].

## Signature

The `GenerateOntologyResult` interface is defined as follows [Source 1]:

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

### Properties

*   **`outputPath: string`**
    The absolute path to the `ontology.yaml` file that was created by the generator [Source 1].

*   **`yaml: string`**
    The raw YAML content as a string that was written to the `outputPath` file [Source 1].

*   **`warnings: string[]`**
    An array of strings, where each string is a non-fatal warning identified during the validation of the generated ontology. An empty array indicates no warnings [Source 1].

## Examples

The following example shows how to call the `generate` method on an `OntologyGenerator` instance and then process the `GenerateOntologyResult` object it returns.

```typescript
import { OntologyGenerator } from 'yaaf/knowledge';
// Assume 'myGenerateFn' is a configured GenerateFn instance.

const generator = new OntologyGenerator({
  generateFn: myGenerateFn,
  outputPath: './knowledge/ontology.yaml',
});

async function runGenerator() {
  try {
    const result: GenerateOntologyResult = await generator.generate({
      domain: 'Acme SDK — a TypeScript library for widgets.',
      srcDirs: ['./src'],
    });

    console.log(`Ontology successfully generated at: ${result.outputPath}`);
    
    // You can inspect the raw YAML if needed
    // console.log('Generated YAML content:\n', result.yaml);

    if (result.warnings.length > 0) {
      console.warn('Generation completed with warnings:');
      result.warnings.forEach(warning => console.warn(`- ${warning}`));
    }
  } catch (error) {
    console.error('Failed to generate ontology:', error);
  }
}

runGenerator();
```

## See Also

*   `OntologyGenerator`: The class that performs the ontology generation and returns this result type.
*   `GenerateOntologyOptions`: The options object passed to the `generate` method that produces this result.

## Sources

[Source 1]: src/knowledge/ontology/generator.ts
[Source 2]: src/knowledge/ontology/index.ts