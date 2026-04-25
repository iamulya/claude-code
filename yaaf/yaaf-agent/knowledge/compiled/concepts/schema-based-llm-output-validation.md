---
title: Schema-Based LLM Output Validation
entity_type: concept
summary: The process of validating and constraining LLM outputs against predefined schemas to ensure data integrity and prevent malformed responses.
related_subsystems:
 - security
search_terms:
 - LLM output parsing
 - structured data from LLM
 - JSON validation from language model
 - preventing LLM hallucinations in JSON
 - how to get reliable JSON from LLM
 - output validation hook
 - data integrity for agent responses
 - constraining agent output
 - schema enforcement for LLMs
 - URL sanitization in LLM output
 - field type checking for AI
 - rejecting malformed LLM responses
 - YAAF output security
stub: false
compiled_at: 2026-04-24T18:01:13.805Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/structuredOutputValidator.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

Schema-Based [LLM](./llm.md) Output Validation is a security and data integrity mechanism in YAAF that validates and constrains the output of a Large Language Model (LLM) against a predefined schema [Source 1]. [when](../apis/when.md) an agent is expected to produce structured data, such as JSON, this process ensures the output conforms to expected formats, types, and constraints before it is used by downstream components. The primary goal is to prevent malformed, unexpected, or hallucinated structured data from causing errors or security vulnerabilities in the application [Source 1].

This concept addresses the inherent non-determinism of LLMs. By enforcing a strict schema, YAAF can guarantee that any structured data passed from the model to other parts of the system (e.g., [Tool Calls](./tool-calls.md), API requests, database entries) is well-formed and meets application requirements.

## How It Works in YAAF

In YAAF, this process is implemented by the `StructuredOutputValidator` class. It operates on the output of an LLM, typically when the output is expected to contain parseable JSON [Source 1].

The validator is configured using an `OutputValidatorConfig` object, which defines a set of rules and behaviors. The core of the configuration is an array of `FieldRule` objects. Each rule specifies constraints for a single field within the [Structured Output](./structured-output.md) [Source 1].

Key validation capabilities include:

*   **Field Presence**: Verifying that `required` fields are present.
*   **Type Checking**: Ensuring a field's value matches an expected type, such as `string`, `number`, `boolean`, `url`, `email`, or `date`.
*   **Value Constraints**:
    *   For `enum` types, checking if the value is in a list of `allowedValues`.
    *   For `number` types, enforcing `min` and `max` boundaries.
    *   For `string` types, enforcing a `maxLength` or matching against a `pattern` (regular expression).
*   **Nested Objects**: Rules can target nested fields using dot notation (e.g., `"address.city"`) [Source 1].
*   **URL Validation**: Beyond JSON fields, the validator can be configured to scan the entire output for URLs, checking them against a list of `allowedDomains` to prevent requests to untrusted endpoints [Source 1].
*   **Length Limits**: A global `maxOutputLength` can be set to prevent excessively long responses [Source 1].

When a validation rule is violated, the framework's behavior is determined by the `onViolation` configuration option:
*   `warn`: Logs the violation and allows the original output to pass through (the default).
*   `strip`: Removes the specific fields that failed validation from the output.
*   `reject`: Discards the LLM's output and replaces it with an error message [Source 1].

For monitoring and [Observability](./observability.md), the validator can trigger an `onValidation` callback, which receives an `OutputValidationEvent` detailing the results of the validation, including any violations found and the action taken [Source 1].

## Configuration

A developer configures output validation by providing an `OutputValidatorConfig` object. This is typically done when setting up an agent's security or post-processing hooks.

The following example demonstrates a configuration that validates a user profile object, enforces URL domain restrictions, and rejects any non-compliant output.

```typescript
import type { OutputValidatorConfig } from "yaaf";

const userProfileValidationConfig: OutputValidatorConfig = {
  // Define rules for fields within the expected JSON output.
  rules: [
    { field: "userId", type: "string", required: true, pattern: /^usr_[a-zA-Z0-9]+$/ },
    { field: "email", type: "email", required: true },
    { field: "profile.age", type: "number", min: 18, max: 120 },
    { field: "profile.newsletter", type: "boolean", required: true },
    { field: "accountType", type: "enum", allowedValues: ["free", "premium", "enterprise"] },
    { field: "website", type: "url" }
  ],

  // Set the action to take when a rule is violated.
  onViolation: "reject",

  // Enforce a maximum character length for the entire output.
  maxOutputLength: 4096,

  // Enable URL validation for all URLs in the output text.
  validateUrls: true,

  // Only allow URLs from specific domains.
  allowedDomains: ["example.com", "docs.yaaf.dev"],

  // Optional callback for logging or metrics.
  onValidation: (event) => {
    console.log(`Validation finished. Action: ${event.action}. Valid: ${event.valid}`);
    if (event.violations.length > 0) {
      console.error("Violations:", event.violations);
    }
  }
};
```

This configuration ensures that any LLM output intended to represent a user profile is strictly validated before being processed by the application [Source 1].

## Sources

[Source 1] src/security/structuredOutputValidator.ts