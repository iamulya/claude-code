---
summary: Defines the supported data types for fields in LLM output validation rules.
export_name: FieldType
source_file: src/security/structuredOutputValidator.ts
category: type
title: FieldType
entity_type: api
search_terms:
 - structured output validation types
 - LLM output schema
 - data type validation
 - FieldRule type property
 - supported validation types
 - string validation
 - number validation
 - boolean validation
 - url validation
 - email validation
 - date validation
 - enum validation
 - how to define field types
 - output validator field types
stub: false
compiled_at: 2026-04-24T17:06:21.612Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/index.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/structuredOutputValidator.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`FieldType` is a string literal type that specifies the set of supported data types for validating fields in structured [LLM](../concepts/llm.md) outputs [Source 2]. It is used in the `type` property of a `FieldRule` object, which defines the validation criteria for a single field within a JSON object produced by an LLM [Source 2].

The `StructuredOutputValidator` uses these types to enforce schemas, preventing downstream systems from processing malformed or unexpected data [Source 2].

## Signature

`FieldType` is a union of the following string literals [Source 2]:

```typescript
export type FieldType =
  | "string"
  | "number"
  | "boolean"
  | "url"
  | "email"
  | "date"
  | "enum";
```

### Supported Types

- **`string`**: The field value must be a string.
- **`number`**: The field value must be a number.
- **`boolean`**: The field value must be a boolean (`true` or `false`).
- **`url`**: The field value must be a valid URL string.
- **`email`**: The field value must be a valid email address string.
- **`date`**: The field value must be a string representing a valid date.
- **`enum`**: The field value must be one of the values specified in the `allowedValues` array of its `FieldRule` [Source 2].

## Examples

The following example demonstrates how to use `FieldType` [when](./when.md) defining an array of `FieldRule` objects for a `StructuredOutputValidator`.

```typescript
import { FieldRule } from 'yaaf';

const rules: FieldRule[] = [
  {
    field: 'productName',
    type: 'string',
    required: true,
    maxLength: 100,
  },
  {
    field: 'inStock',
    type: 'boolean',
    required: true,
  },
  {
    field: 'price',
    type: 'number',
    required: true,
    min: 0,
  },
  {
    field: 'category',
    type: 'enum',
    required: true,
    allowedValues: ['electronics', 'books', 'clothing'],
  },
  {
    field: 'productUrl',
    type: 'url',
    required: false,
  },
  {
    field: 'contact',
    type: 'email',
    required: false,
  },
];

// These rules can now be passed to a StructuredOutputValidator instance.
```

## See Also

- `StructuredOutputValidator`: The class that uses `FieldRule` objects to validate LLM outputs.
- `FieldRule`: The type that defines a validation rule for a single field, utilizing `FieldType`.

## Sources

- [Source 1] src/knowledge/[Ontology](../concepts/ontology.md)/index.ts
- [Source 2] src/security/structuredOutputValidator.ts