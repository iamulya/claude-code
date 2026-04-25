---
title: FrontmatterValidationResult
entity_type: api
summary: Describes the outcome of validating an article's frontmatter, including validity status, errors, and warnings.
export_name: FrontmatterValidationResult
source_file: src/knowledge/compiler/synthesizer/types.ts
category: type
search_terms:
 - frontmatter validation
 - article metadata check
 - YAML frontmatter errors
 - knowledge base article structure
 - validate markdown metadata
 - frontmatter schema
 - article compilation result
 - synthesizer types
 - how to check frontmatter
 - missing frontmatter fields
 - coerced frontmatter values
 - article parsing output
stub: false
compiled_at: 2026-04-24T17:07:32.468Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/synthesizer/index.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/synthesizer/types.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `[[[[[[[[Frontmatter]]]]]]]]ValidationResult` type is a data structure that represents the outcome of validating a knowledge base article's YAML Frontmatter block [Source 2]. It is used within the YAAF [Knowledge Compiler](../subsystems/knowledge-compiler.md) during the synthesis phase to ensure that all articles have correct and complete metadata before being written to disk [Source 2].

This type provides a comprehensive summary of the validation process, including a simple boolean `valid` flag, the final coerced `values`, and detailed lists of any `errors` or `warnings` encountered [Source 2].

## Signature

`FrontmatterValidationResult` is a TypeScript type alias [Source 2].

```typescript
export type FrontmatterValidationResult = {
  /**
   * A boolean indicating if the frontmatter is valid.
   */
  valid: boolean;

  /**
   * All validated and coerced frontmatter values.
   * This object contains the final key-value pairs after applying defaults
   * and type conversions.
   */
  values: Record<string, unknown>;

  /**
   * An array of objects detailing fields that failed validation.
   * This array will be empty if there are no validation errors.
   */
  errors: Array<{ field: string; message: string }>;

  /**
   * An array of objects for fields that were missing but had default values applied.
   * This allows the system to inform the user about implicit changes.
   */
  warnings: Array<{ field: string; message: string }>;
};
```

## Examples

### A Valid Frontmatter

This example shows the result for a frontmatter block that passes all validation checks.

```typescript
const validResult: FrontmatterValidationResult = {
  valid: true,
  values: {
    title: "Agent",
    entity_type: "concept",
    summary: "A core concept in YAAF.",
  },
  errors: [],
  warnings: [],
};
```

### An Invalid Frontmatter

This example shows a result where a required field (`entity_type`) is missing and another has an incorrect type.

```typescript
const invalidResult: FrontmatterValidationResult = {
  valid: false,
  values: {
    title: "Agent",
    deprecated: "yes", // Should be a boolean
  },
  errors: [
    {
      field: "entity_type",
      message: "Required field 'entity_type' is missing.",
    },
    {
      field: "deprecated",
      message: "Expected boolean, but received string.",
    },
  ],
  warnings: [],
};
```

### A Frontmatter with a Warning

This example shows a result where an optional field was missing and a default value was applied. The frontmatter is still considered valid.

```typescript
const warningResult: FrontmatterValidationResult = {
  valid: true,
  values: {
    title: "My Plugin",
    entity_type: "plugin",
    // 'enabled' field was missing, default is true
    enabled: true,
  },
  errors: [],
  warnings: [
    {
      field: "enabled",
      message: "Optional field 'enabled' was missing. Defaulted to 'true'.",
    },
  ],
};
```

## Sources

[Source 1]: src/knowledge/compiler/synthesizer/index.ts
[Source 2]: src/knowledge/compiler/synthesizer/types.ts