---
summary: The result object returned after validating the knowledge base ontology.
export_name: OntologyValidationResult
source_file: src/knowledge/ontology/index.ts
category: type
title: OntologyValidationResult
entity_type: api
search_terms:
 - ontology validation
 - knowledge base schema check
 - validate KB ontology
 - ontology error reporting
 - schema validation result
 - OntologyValidationIssue list
 - how to check ontology for errors
 - knowledge base integrity
 - ontology validator output
 - KB schema validation
 - YAAF knowledge base validation
 - schema issue reporting
stub: false
compiled_at: 2026-04-24T17:24:16.372Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/index.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

The `[[[[[[[[Ontology]]]]]]]]ValidationResult` type represents the outcome of a validation process performed on a YAAF Knowledge Base (KB) Ontology. It is a data structure that encapsulates whether the ontology is valid and, if not, provides details about the specific issues that were found [Source 1].

This type is typically the return value of a function that validates an ontology's structure, types, and constraints. Consumers of this type can programmatically check for validation success or failure and report any detected problems, such as inconsistencies or violations of the schema rules. It is used in conjunction with the `OntologyValidationIssue` type, which represents a single validation problem [Source 1].

## Signature

`OntologyValidationResult` is exported as a type from the main ontology barrel file. Its specific internal structure is defined in `src/knowledge/ontology/types.ts`, but it is exposed to the public API through the index file [Source 1].

```typescript
// Source: src/knowledge/ontology/index.ts

export type {
  // ...
  OntologyValidationResult,
  OntologyValidationIssue,
} from "./types.js";
```

While the exact properties are not detailed in the provided source, a validation result object typically contains a status indicator (e.g., a boolean for validity) and a collection of `OntologyValidationIssue` objects if any problems were found.

## Examples

The following example demonstrates how a function might be typed to accept and process an `OntologyValidationResult`. The internal structure of the `result` object is not defined in the provided source material, so its properties are not accessed in this example.

```typescript
import type { OntologyValidationResult } from 'yaaf';

/**
 * A function that processes the result of an ontology validation.
 * The specific properties of the `result` object depend on its
 * internal definition.
 *
 * @param result The validation result object from an ontology check.
 */
function handleValidationResult(result: OntologyValidationResult): void {
  // Logic to handle the validation result would go here.
  // For example, logging errors or halting a build process based on the
  // contents of the result object.
  console.log('Processing ontology validation result...');

  // A consumer would typically check a property like `result.isValid`
  // and iterate over `result.issues` if it is not.
}
```

## Sources

[Source 1] `src/knowledge/ontology/index.ts`