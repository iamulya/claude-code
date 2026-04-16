---
title: validateOntology
entity_type: api
summary: Validates a hydrated ontology for internal consistency beyond basic structural checks.
export_name: validateOntology
source_file: src/knowledge/ontology/loader.ts
category: function
stub: false
compiled_at: 2026-04-16T14:28:23.555Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/ontology/loader.ts
confidence: 1
---

## Overview
`validateOntology` is a utility function used to ensure the internal consistency of a hydrated ontology. While the initial YAML parsing stage handles structural integrity (ensuring the file follows the expected schema), `validateOntology` performs deeper cross-field checks to verify that the definitions within the ontology are logically sound.

In the YAAF framework, the compiler will not start until the ontology passes the checks performed by this function. It is typically used after an `OntologyLoader` has processed the `ontology.yaml` file into a `KBOntology` object.

## Signature / Constructor
```typescript
export function validateOntology(ontology: KBOntology): OntologyValidationResult;
```

### Parameters
* **ontology**: The `KBOntology` object to be validated. This is usually the result of a hydration process from a raw YAML source.

### Returns
* **OntologyValidationResult**: An object containing the outcome of the validation. If errors are found, this result includes human-readable descriptions of the consistency issues.

## Examples

### Basic Validation Usage
This example demonstrates how to use `validateOntology` to check a hydrated ontology object before proceeding with application logic.

```typescript
import { validateOntology } from 'yaaf/knowledge/ontology/loader';

// Assume hydratedOntology is a KBOntology object obtained from a loader
const validationResult = validateOntology(hydratedOntology);

if (validationResult.isValid) {
  console.log('Ontology is consistent and ready for use.');
} else {
  console.error('Ontology validation failed:');
  validationResult.errors.forEach(error => {
    console.error(`- ${error.message}`);
  });
}
```

### Integration with Compiler Workflow
The framework uses this function to gate the startup process, ensuring that invalid configurations do not reach the runtime.

```typescript
import { validateOntology } from 'yaaf/knowledge/ontology/loader';

function initializeAgent(ontology) {
  const result = validateOntology(ontology);
  
  if (!result.isValid) {
    throw new Error('Cannot start agent: Ontology has consistency errors.');
  }
  
  // Proceed with initialization
}
```