---
title: Output Validation
entity_type: concept
summary: The architectural pattern of enforcing structural and content constraints on LLM-generated data before processing.
stub: false
compiled_at: 2026-04-16T14:35:26.559Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/security/structuredOutputValidator.ts
confidence: 0.95
---

---
title: Output Validation
entity_type: concept
summary: The architectural pattern of enforcing structural and content constraints on LLM-generated data before processing.
related_subsystems:
  - security
  - agents

## What It Is
Output Validation is a security and reliability pattern in YAAF designed to ensure that Large Language Model (LLM) responses conform to specific structural and content requirements. Because LLMs are non-deterministic, they may produce malformed JSON, hallucinate fields, or include prohibited content (such as malicious URLs). 

This concept serves as a defensive layer between the raw LLM output and downstream application logic. By enforcing a schema, YAAF prevents "prompt injection" side effects where an LLM might be coerced into returning data that crashes or exploits the consuming system.

## How It Works in YAAF
The primary implementation of this concept is the `StructuredOutputValidator` class. It operates by intercepting the LLM's response and evaluating it against a set of defined `FieldRule` objects.

### Validation Mechanisms
The framework supports several types of validation:
*   **Type Enforcement**: Ensures fields match expected types such as `string`, `number`, `boolean`, `url`, `email`, `date`, or `enum`.
*   **Structural Integrity**: Verifies that `required` fields are present. It supports dot notation (e.g., `"address.city"`) for validating nested JSON structures.
*   **Constraint Checking**: Enforces numeric ranges (`min`/`max`), string length limits (`maxLength`), and regex pattern matching (`pattern`).
*   **URL Sanitization**: Beyond JSON parsing, the framework can scan the entire output text for URLs, checking them against a list of `allowedDomains` or blocking known dangerous origins.

### Violation Handling
When a validation failure occurs, the framework can be configured to take one of three actions:
1.  **warn**: Logs the violation but allows the original output to pass through to the application.
2.  **strip**: Removes the specific fields that failed validation while keeping the rest of the response.
3.  **reject**: Overrides the entire response with an error message, preventing the application from processing the untrusted data.

## Configuration
Developers configure output validation via the `OutputValidatorConfig` object. This configuration defines the rules, the maximum allowed output length, and the behavior when a violation is detected.

```typescript
const validationConfig: OutputValidatorConfig = {
  rules: [
    {
      field: "user_age",
      type: "number",
      required: true,
      min: 18,
      max: 120
    },
    {
      field: "status",
      type: "enum",
      allowedValues: ["active", "pending", "archived"]
    },
    {
      field: "metadata.source_url",
      type: "url"
    }
  ],
  onViolation: 'reject',
  validateUrls: true,
  allowedDomains: ['example.com', 'api.trusted.org']
}
```

### Event Monitoring
The framework provides an `onValidation` callback that emits an `OutputValidationEvent`. This event contains detailed metadata about the validation process, including:
*   Whether the output was valid.
*   A list of specific `OutputValidationViolation` objects (containing the field, the broken rule, and the actual vs. expected values).
*   Whether the output was modified (e.g., by the `strip` action).
*   The final action taken (`passed`, `warned`, `stripped`, or `rejected`).

## Sources
* `src/security/structuredOutputValidator.ts`---