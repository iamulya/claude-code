---
title: OutputValidatorConfig
entity_type: api
summary: Configuration options for the `StructuredOutputValidator`, specifying validation rules, output length limits, and violation handling.
export_name: OutputValidatorConfig
source_file: src/security/structuredOutputValidator.ts
category: type
search_terms:
 - LLM output validation config
 - structured output settings
 - how to configure output validator
 - JSON schema validation options
 - field validation rules
 - limit LLM response length
 - handle validation failure
 - URL validation settings
 - allowed domains for URLs
 - onViolation behavior
 - reject invalid output
 - strip invalid fields
 - OutputValidationEvent callback
stub: false
compiled_at: 2026-04-24T17:25:39.481Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/structuredOutputValidator.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `OutputValidatorConfig` type defines the configuration object for the `StructuredOutputValidator` class. It allows developers to specify a set of rules and behaviors for validating and constraining the output of a Large Language Model ([LLM](../concepts/llm.md)). This includes defining rules for JSON fields, setting limits on output length, controlling how validation violations are handled, and configuring URL sanitization [Source 1].

This configuration is essential for ensuring that LLM-generated structured data is safe and conforms to expected schemas before being processed by downstream application logic [Source 1].

## Signature

`OutputValidatorConfig` is a TypeScript type alias with the following structure [Source 1]:

```typescript
export type OutputValidatorConfig = {
  /**
   * Field validation rules.
   * Only applied [[[[[[[[when]]]]]]]] the LLM output contains parseable JSON.
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

## Properties

- **`rules?: FieldRule[]`**: An optional array of `FieldRule` objects that define the validation constraints for fields within a JSON output. These rules are only applied if the LLM's output is parseable JSON. Each rule can specify a field's name (using dot notation for nested objects), expected type, required status, and other constraints like numeric ranges or allowed enum values [Source 1].

- **`maxOutputLength?: number`**: An optional number specifying the maximum allowed length of the LLM output in characters. If not provided, it defaults to `100_000` [Source 1].

- **`onViolation?: "warn" | "strip" | "reject"`**: An optional string that determines the action to take when a validation rule is violated.
    - `warn`: (Default) Logs a warning but allows the original output to pass through unmodified.
    - `strip`: Removes any fields from the JSON output that fail validation.
    - `reject`: Discards the LLM's output and replaces it with an error message.
    [Source 1]

- **`onValidation?: (event: OutputValidationEvent) => void`**: An optional callback function that is invoked after each validation attempt. It receives an `OutputValidationEvent` object containing details about the validation outcome, including whether it was successful, a list of violations, and the action taken [Source 1].

- **`validateUrls?: boolean`**: An optional boolean that, when `true`, enables validation for all URLs found in the output text, not just within JSON structures. It checks URLs against the `allowedDomains` list or blocks known malicious URLs. The default value is `false` [Source 1].

- **`allowedDomains?: string[]`**: An optional array of strings representing domain names. This property is used only when `validateUrls` is `true`. If this array is provided, only URLs from the specified domains will be considered valid. If the array is empty or undefined, all non-dangerous URLs are permitted [Source 1].

## Examples

The following example demonstrates how to create a comprehensive `OutputValidatorConfig` object to configure a `StructuredOutputValidator`.

```typescript
import type { OutputValidatorConfig } from 'yaaf';

const config: OutputValidatorConfig = {
  // Define rules for expected JSON fields
  rules: [
    { field: 'user.id', type: 'number', required: true, min: 1 },
    { field: 'user.email', type: 'email', required: true },
    { field: 'action', type: 'enum', required: true, allowedValues: ['CREATE', 'UPDATE', 'DELETE'] },
    { field: 'reason', type: 'string', maxLength: 200, required: false }
  ],

  // Set a custom maximum output length
  maxOutputLength: 8192,

  // Reject any output that violates the rules
  onViolation: 'reject',

  // Enable URL validation and restrict to specific domains
  validateUrls: true,
  allowedDomains: ['example.com', 'internal-api.net'],

  // Log validation results
  onValidation: (event) => {
    if (!event.valid) {
      console.error(`Validation failed with action: ${event.action}`);
      event.violations.forEach(v => {
        console.error(`- Field '${v.field}' failed rule '${v.rule}'.`);
      });
    } else {
      console.log('Output validation passed.');
    }
  }
};

// This configuration object would then be passed to the
// StructuredOutputValidator's constructor.
// e.g., const validator = new StructuredOutputValidator(config);
```

## See Also

- `StructuredOutputValidator`: The class that uses this configuration object to perform validation.
- `FieldRule`: The type used to define individual validation rules for JSON fields.
- `OutputValidationEvent`: The type for the event object passed to the `onValidation` callback.

## Sources

[Source 1] `src/security/structuredOutputValidator.ts`