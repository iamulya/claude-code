---
summary: The process of ensuring the structural correctness and internal consistency of a YAAF knowledge base ontology definition.
title: Ontology Validation
entity_type: concept
related_subsystems:
 - knowledge
search_terms:
 - validate ontology.yaml
 - knowledge base schema check
 - ontology consistency
 - structural validation of ontology
 - how to fix ontology errors
 - YAAF compiler ontology check
 - KBOntology validation
 - cross-field checks for ontology
 - YAML parsing for ontology
 - ontology loader
 - kb.config.yaml
stub: false
compiled_at: 2026-04-24T17:59:45.208Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/loader.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

[Ontology](./ontology.md) Validation is the process in YAAF that ensures the `ontology.yaml` file, which defines the structure of a knowledge base, is both syntactically correct and logically consistent. This validation is a critical prerequisite for the YAAF compiler to operate, preventing errors that could arise from a malformed or inconsistent knowledge base definition. The process is designed to provide developers with clear, human-readable errors if any issues are found, ensuring the ontology is sound before the compiler proceeds [Source 1].

## How It Works in YAAF

The validation process is handled within the YAAF knowledge subsystem, primarily by the `OntologyLoader` class. The process consists of several stages [Source 1]:

1.  **Parsing**: The `OntologyLoader` first locates and parses the `ontology.yaml` file from the root of the knowledge base directory. YAAF uses the `yaml` library, a spec-compliant YAML 1.2 parser, for this initial step. This handles the basic syntax and structure of the YAML file itself.

2.  **Hydration**: After successful parsing, the raw YAML data is hydrated into a strongly-typed `KBOntology` object. This hydration process inherently validates that the structure and data types in the file conform to the expected schema.

3.  **Consistency Checks**: Finally, a dedicated function, `validateOntology`, is executed on the hydrated `KBOntology` object. This function performs more advanced checks for internal consistency and cross-field relationships that cannot be caught by simple type hydration alone.

The entire validation process must complete successfully before the YAAF compiler will start. If any stage fails, the process halts and reports errors to the user [Source 1].

## Sources

[Source 1] `src/knowledge/ontology/loader.ts`