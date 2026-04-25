---
summary: A class responsible for loading, parsing, and validating the `ontology.yaml` file into a strongly-typed KBOntology.
export_name: OntologyLoader
source_file: src/knowledge/ontology/loader.ts
category: class
title: OntologyLoader
entity_type: api
search_terms:
 - load ontology file
 - parse ontology.yaml
 - validate knowledge base ontology
 - KBOntology loader
 - YAML parser for ontology
 - how to read ontology config
 - ontology file validation
 - knowledge base schema
 - ontology hydration
 - yaml library integration
 - agent knowledge structure
 - read kb.config.yaml
stub: false
compiled_at: 2026-04-24T17:23:51.020Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/loader.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `[[[[[[[[Ontology]]]]]]]]Loader` class is responsible for loading and validating the `Ontology.yaml` file from the root directory of a Knowledge Base (KB) [Source 1].

It utilizes the `yaml` library, a spec-compliant YAML 1.2 parser, to process the file. After parsing, it validates and hydrates the raw data into a strongly-typed `KBOntology` object. The validation process is strict; it produces human-readable errors for any structural problems, and the YAAF compiler will not start until the Ontology passes all validation checks [Source 1].

Historically, this class replaced a hand-rolled YAML parser, which resolved several parsing bugs and added support for advanced YAML features like anchors, aliases, and multi-document files, ensuring full YAML 1.2 compliance [Source 1].

## Signature / Constructor

The provided source material exports the class but does not include the specific signature for its constructor or methods [Source 1].

```typescript
export class OntologyLoader { /* ... */ }
```

## Methods & Properties

The public methods and properties for the `OntologyLoader` class are not detailed in the provided source material [Source 1].

## Examples

The source material does not include any usage examples for the `OntologyLoader` class [Source 1].

## See Also

The `src/knowledge/ontology/loader.ts` file also exports several related entities:
*   `validateOntology`: A function for performing additional consistency checks on a hydrated `KBOntology` object.
*   `serializeOntology`: A function to convert a `KBOntology` object back into a YAML string.
*   `ONTOLOGY_FILENAME`: A constant for the ontology filename, `"ontology.yaml"`.
*   `KB_CONFIG_FILENAME`: A constant for the KB configuration filename, `"kb.config.yaml"`.

## Sources

[Source 1]: src/knowledge/ontology/loader.ts