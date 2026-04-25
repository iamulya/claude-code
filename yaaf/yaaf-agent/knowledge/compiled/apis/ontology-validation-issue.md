---
summary: Represents a single issue or error found during ontology validation.
export_name: OntologyValidationIssue
source_file: src/knowledge/ontology/index.ts
category: type
title: OntologyValidationIssue
entity_type: api
search_terms:
 - ontology error
 - knowledge base validation
 - schema validation issue
 - what is OntologyValidationIssue
 - ontology validation report
 - KB schema error type
 - validating an ontology
 - ontology problem structure
 - type for validation errors
 - ontology linter issue
 - knowledge graph schema check
 - YAAF ontology validation
stub: false
compiled_at: 2026-04-24T17:24:10.226Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/index.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

`[[Ontology]]ValidationIssue` is a TypeScript type that represents a single problem discovered during the validation of a YAAF [Knowledge Base Ontology](../subsystems/knowledge-base-ontology.md). [when](./when.md) an [Ontology](../concepts/ontology.md) is checked for correctness, consistency, and adherence to schema rules, any discrepancies are reported as a collection of `OntologyValidationIssue` objects. Each issue object encapsulates the details of one specific error or warning.

This type is a key component of the `OntologyValidationResult` type, which aggregates all issues found during a single validation run. Developers can inspect an array of these issues to programmatically diagnose and fix problems in their ontology definitions.

## Signature

The `OntologyValidationIssue` type is exported from the main ontology module [Source 1]. The provided source material does not include the detailed definition of its structure. It is used within the `OntologyValidationResult` type to form a list of all detected problems.

Conceptually, an `OntologyValidationIssue` object would contain information such as a description of the validation error, the location within the ontology where the issue was found, and the severity of the issue (e.g., error or warning).

```typescript
// The type is exported as part of the public API.
// The specific fields are not detailed in the source material.
export type OntologyValidationIssue = { /* ... details not provided ... */ };
```

## Examples

The following example illustrates the conceptual usage of `OntologyValidationIssue` as part of a validation result. A validation function would return an `OntologyValidationResult` object containing an array of issues.

```typescript
import {
  KBOntology,
  OntologyValidationResult,
  OntologyValidationIssue
} from 'yaaf';

// A hypothetical function that validates an ontology
function validateOntology(ontology: KBOntology): OntologyValidationResult {
  const issues: OntologyValidationIssue[] = [];

  // ... validation logic ...

  // If a problem is found, an issue is created and added.
  // The structure of the issue object below is hypothetical.
  if (/* some validation fails */) {
    issues.push({
      severity: 'error',
      message: 'Entity "User" defines a relationship to non-existent entity "ProfileImage".',
      path: ['entities', 'User', 'relationships', 'profileImage']
    });
  }

  return {
    isValid: issues.length === 0,
    issues: issues,
  };
}

// Example usage:
const myOntology: KBOntology = { /* ... your ontology definition ... */ };
const result = validateOntology(myOntology);

if (!result.isValid) {
  console.log('Ontology validation failed with the following issues:');
  for (const issue of result.issues) {
    // Log the details of each OntologyValidationIssue
    console.error(`- [${(issue as any).severity}] ${(issue as any).message}`);
  }
}
```

## See Also

*   `OntologyValidationResult`: The container type that holds an array of `OntologyValidationIssue` objects and an overall validity status.

## Sources

[Source 1]: src/knowledge/ontology/index.ts