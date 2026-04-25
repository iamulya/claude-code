---
summary: Validates a hydrated KBOntology object for internal consistency and structural integrity.
export_name: validateOntology
source_file: src/knowledge/ontology/loader.ts
category: function
title: validateOntology
entity_type: api
search_terms:
 - ontology validation
 - check KBOntology consistency
 - how to validate ontology.yaml
 - ontology structural integrity
 - cross-field ontology checks
 - internal consistency validation
 - verify knowledge base ontology
 - ontology loader validation step
 - KBOntology validation function
 - ensure ontology is correct
 - post-hydration validation
 - ontology schema check
stub: false
compiled_at: 2026-04-24T17:47:20.402Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/loader.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `validate[[[[[[[[Ontology]]]]]]]]` function is a utility used to perform deep validation on a `KBOntology` object that has already been parsed and hydrated from an `Ontology.yaml` file [Source 1].

Its primary purpose is to run checks for internal consistency and structural integrity that go beyond simple type validation. This includes cross-field checks to ensure that different parts of the Ontology are coherent with each other. This validation step is a critical part of the knowledge base loading process, ensuring that the system does not start with a malformed or inconsistent ontology [Source 1].

## Signature

The function takes a `KBOntology` object as input and returns an `OntologyValidationResult` object [Source 1].

```typescript
export function validateOntology(ontology: KBOntology): OntologyValidationResult;
```

### Parameters

-   **`ontology: KBOntology`**: The hydrated [Knowledge Base Ontology](../subsystems/knowledge-base-ontology.md) object to be validated.

### Returns

-   **`OntologyValidationResult`**: An object containing the results of the validation. The specific structure of this type is not detailed in the provided source material.

## Examples

No code examples are available in the provided source material.

## See Also

-   `OntologyLoader`: The class responsible for parsing, hydrating, and validating the `ontology.yaml` file.
-   `serializeOntology`: A function to convert a `KBOntology` object back into a YAML string format.

## Sources

[Source 1]: src/knowledge/ontology/loader.ts