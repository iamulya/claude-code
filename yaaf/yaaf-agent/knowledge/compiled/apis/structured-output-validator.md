---
title: StructuredOutputValidator
entity_type: api
summary: Validates and constrains LLM outputs against defined schemas to prevent malformed or unexpected structured data.
export_name: StructuredOutputValidator
source_file: src/security/structuredOutputValidator.ts
category: class
search_terms:
 - LLM output validation
 - JSON schema validation
 - secure LLM output
 - prevent structured data hallucination
 - how to validate agent responses
 - output parsing
 - response sanitization
 - constrain model output
 - data format enforcement
 - URL validation in LLM output
 - enum validation for agents
 - reject malformed JSON
 - strip invalid fields
stub: false
compiled_at: 2026-04-24T17:42:14.445Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/structuredOutputValidator.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `StructuredOutputValidator` is a security component that validates and constrains the output of a Large Language Model ([LLM](../concepts/llm.md)) against a defined schema [Source 1]. Its primary purpose is to prevent downstream application code from processing malformed, unexpected, or hallucinated structured data, which can lead to errors or security vulnerabilities [Source 1].

This validator is typically used as a hook in the agent lifecycle. It can enforce a variety of constraints, including:

*   Verifying that JSON output conforms to specified field types and rules.
*   Validating and sanitizing URLs found in the response.
*   Enforcing numeric ranges and maximum string lengths.
*   Restricting field values to a predefined set of allowed values (enums).
*   Ensuring that required fields are present in the output [Source 1].

## Signature / Constructor

The `StructuredOutputValidator` is configured using an `OutputValidatorConfig` object. The source material does not specify the constructor's signature, but it is initialized with the following configuration options [Source 1].

### Configuration (`OutputValidatorConfig`)

```typescript
export type OutputValidatorConfig = {
  /**
   * Field validation rules.
   * Only applied when the LLM output contains parseable JSON.
   */
  rules?: FieldRule[];

  /**
   * Maximum output length in characters.
   * Default: 100_000.
   */
  maxOutputLength?: number;

  /**
   * Action when validation fails:
   * - `warn` — log and pass through (default)
   * - `strip` — remove invalid fields
   * - `reject` — override the response with an error message
   */
  onViolation?: "warn" | "strip" | "reject";

  /**
   * Called on each validation result.
   */
  onValidation?: (event: OutputValidationEvent) => void;

  /**
   * Validate URLs in the output text (not just JSON).
   * When true, checks all URLs against allowedDomains or blocks known-dangerous ones.
   * Default: false.
   */
  validateUrls?: boolean;

  /**
   * When validateUrls is true, only allow URLs from these domains.
   * If empty, all non-dangerous URLs are allowed.
   */
  allowedDomains?: string[];
};
```

### Supporting Types

The configuration relies on several supporting types to define validation logic and report results [Source 1].

**`FieldRule`**: Defines a single validation rule for a field within a JSON object.

```typescript
export type FieldRule = {
  /** Field name (supports dot notation for nested: "address.city") */
  field: string;
  /** Expected type */
  type: FieldType;
  /** Whether the field is required */
  required?: boolean;
  /** Allowed values (for enum type) */
  allowedValues?: unknown[];
  /** Minimum value (for number type) */
  min?: number;
  /** Maximum value (for number type) */
  max?: number;
  /** Maximum string length */
  maxLength?: number;
  /** Regex pattern the value must match */
  pattern?: RegExp;
};
```

**`FieldType`**: Specifies the data type for a `FieldRule`.

```typescript
export type FieldType = "string" | "number" | "boolean" | "url" | "email" | "date" | "enum";
```

## Methods & Properties

The provided source material is a signature-only extract and does not include details on the public methods or properties of the `StructuredOutputValidator` class instance [Source 1]. Its behavior is primarily controlled through the `OutputValidatorConfig` at initialization.

## Events

The validator can report its findings via the `onValidation` callback defined in its configuration. This callback receives an `OutputValidationEvent` object for each validation performed [Source 1].

### `onValidation`

This event is triggered after an output has been processed by the validator.

**Payload (`OutputValidationEvent`)**:

```typescript
export type OutputValidationEvent = {
  /** Whether the output passed validation */
  valid: boolean;
  /** Violations found */
  violations: OutputValidationViolation[];
  /** Whether the output was modified (e.g., by 'strip' action) */
  modified: boolean;
  /** Action taken */
  action: "passed" | "warned" | "stripped" | "rejected";
  /** Timestamp */
  timestamp: Date;
};
```

**`OutputValidationViolation`**: Describes a single rule that was violated.

```typescript
export type OutputValidationViolation = {
  field: string;
  rule: string;
  actual: unknown;
  expected: string;
};
```

## Examples

### Basic JSON Validation

This example configures a validator to enforce rules on a JSON object representing a user profile. It requires a `name`, ensures `age` is within a specific range, and restricts `role` to a set of allowed values. If validation fails, it strips the invalid fields from the output.

```typescript
import { StructuredOutputValidator, OutputValidatorConfig } from 'yaaf';

const userProfileValidatorConfig: OutputValidatorConfig = {
  // Action to take when a rule is violated
  onViolation: 'strip',

  // Define rules for the expected JSON structure
  rules: [
    {
      field: 'name',
      type: 'string',
      required: true,
      maxLength: 50,
    },
    {
      field: 'age',
      type: 'number',
      required: true,
      min: 18,
      max: 120,
    },
    {
      field: 'role',
      type: 'enum',
      required: true,
      allowedValues: ['admin', 'editor', 'viewer'],
    },
    {
      field: 'contact.email', // Nested field validation
      type: 'email',
      required: false,
    },
  ],

  // Optional: Log validation events
  onValidation: (event) => {
    if (!event.valid) {
      console.warn(`Validation failed with action: ${event.action}`);
      event.violations.forEach(v => {
        console.log(`- Field '${v.field}' failed rule '${v.rule}'`);
      });
    }
  },
};

// The validator would be instantiated and used within an agent's hook system.
// const validator = new StructuredOutputValidator(userProfileValidatorConfig);
```

### URL Validation

This example configures the validator to check all URLs in an LLM's output, allowing only those from specific domains.

```typescript
import { StructuredOutputValidator, OutputValidatorConfig } from 'yaaf';

const urlWhitelistConfig: OutputValidatorConfig = {
  onViolation: 'reject', // Reject any output with invalid URLs
  validateUrls: true,
  allowedDomains: ['example.com', 'api.service.net'],
};

// const urlValidator = new StructuredOutputValidator(urlWhitelistConfig);
```

## Sources

[Source 1]: src/security/structuredOutputValidator.ts