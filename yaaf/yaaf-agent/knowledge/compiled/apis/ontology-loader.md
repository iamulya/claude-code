---
title: OntologyLoader
entity_type: api
summary: A utility class for loading and parsing the ontology.yaml file from the KB root.
export_name: OntologyLoader
source_file: src/knowledge/ontology/loader.ts
category: class
stub: false
compiled_at: 2026-04-16T14:28:26.304Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/ontology/loader.ts
confidence: 1
---

## Overview
The `OntologyLoader` is a utility class responsible for reading, parsing, and validating the `ontology.yaml` file located in a Knowledge Base (KB) root directory. It utilizes a specialized, zero-dependency YAML parser designed to handle the specific subset of YAML used in YAAF ontologies, which includes nested mappings, sequences, and scalars, but excludes complex features like anchors or multi-document files.

The loader serves as a gatekeeper for the YAAF compiler; the compiler will not initialize until the `OntologyLoader` produces a validated `KBOntology` object. It provides human-readable error messages for any structural or validation problems encountered during the parsing process.

## Signature / Constructor
```typescript
export class OntologyLoader {
  // Implementation details are internal to the framework
}
```

## Methods & Properties
The `OntologyLoader` module exports several constants and utility functions used in conjunction with the loader class:

### Constants
- `ONTOLOGY_FILENAME`: The default filename for the ontology configuration (`'ontology.yaml'`).
- `KB_CONFIG_FILENAME`: The default filename for the KB configuration (`'kb.config.yaml'`).

### Utility Functions
- `validateOntology(ontology: KBOntology): OntologyValidationResult`: Performs internal consistency checks and cross-field validation on a hydrated ontology object.
- `serializeOntology(ontology: KBOntology): string`: Serializes a `KBOntology` object back into YAML format. This is primarily used by the CLI during initialization (e.g., `kb init --infer`) to write proposed ontology files.

## Examples

### Basic Usage
The `OntologyLoader` is typically used by the framework's internal systems to prepare the Knowledge Base for the compiler.

```typescript
import { OntologyLoader, ONTOLOGY_FILENAME } from 'yaaf';

// The loader is instantiated to handle ontology ingestion
const loader = new OntologyLoader();

// It processes the ontology.yaml file to ensure it meets 
// the structural requirements of the framework.
```

### Serializing an Ontology
The serialization utility is used when programmatically generating or updating an ontology file.

```typescript
import { serializeOntology } from 'yaaf';

const myOntology = {
  // ... KBOntology structure
};

const yamlOutput = serializeOntology(myOntology);
// yamlOutput contains the formatted YAML string for ontology.yaml
```

## See Also
- `KBOntology` (type)
- `OntologyValidationResult` (type)