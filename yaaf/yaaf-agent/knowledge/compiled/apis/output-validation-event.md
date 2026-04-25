---
title: OutputValidationEvent
entity_type: api
summary: Describes the outcome of an LLM output validation process, including validity status, violations, and actions taken.
export_name: OutputValidationEvent
source_file: src/security/structuredOutputValidator.ts
category: type
search_terms:
 - LLM output validation result
 - structured output event
 - validation hook event
 - onValidation callback type
 - schema validation outcome
 - data integrity check
 - malformed JSON detection
 - output sanitization event
 - what is OutputValidationEvent
 - validation violation details
 - agent security events
 - response modification status
 - validator callback parameter
stub: false
compiled_at: 2026-04-24T17:25:29.793Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/structuredOutputValidator.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `OutputValidationEvent` type is a data structure that encapsulates the results of a validation check performed by the `StructuredOutputValidator`. It provides a detailed report on whether an [LLM](../concepts/llm.md)'s output conforms to a predefined set of rules.

This event object is passed to the optional `onValidation` callback function defined in the `OutputValidatorConfig`. It is primarily used for logging, monitoring, or triggering side effects based on the outcome of the validation process. It contains information about the validity of the output, any specific violations found, and the corrective action taken by the validator.

## Signature

`OutputValidationEvent` is a TypeScript type alias with the following structure:

```typescript
export type OutputValidationEvent = {
  /** Whether the output passed validation */
  valid: boolean;
  /** Violations found */
  violations: OutputValidationViolation[];
  /** Whether the output was modified */
  modified: boolean;
  /** Action taken */
  action: "passed" | "warned" | "stripped" | "rejected";
  /** Timestamp */
  timestamp: Date;
};
```

### Properties

- **`valid`**: `boolean`
  - `true` if the LLM output passed all validation rules, `false` otherwise.

- **`violations`**: `OutputValidationViolation[]`
  - An array of objects detailing each validation rule that failed. If `valid` is `true`, this array will be empty. Each `OutputValidationViolation` object contains the field name, the rule that failed, the actual value received, and a description of the expected value.

- **`modified`**: `boolean`
  - `true` if the validator altered the original LLM output. This occurs [when](./when.md) the `onViolation` action is set to `'strip'`, and invalid fields are removed from a JSON object.

- **`action`**: `"passed" | "warned" | "stripped" | "rejected"`
  - A string indicating the action taken by the validator.
    - `"passed"`: The output was valid.
    - `"warned"`: A violation occurred, and the `onViolation` policy was set to `'warn'`. The original output is passed through.
    - `"stripped"`: A violation occurred, and the `onViolation` policy was set to `'strip'`. Invalid fields were removed.
    - `"rejected"`: A violation occurred, and the `onViolation` policy was set to `'reject'`. The original output was replaced with an error message.

- **`timestamp`**: `Date`
  - A `Date` object representing when the validation check was performed.

## Examples

The most common use of `OutputValidationEvent` is within the `onValidation` callback of the `StructuredOutputValidator` configuration. This allows for custom logging or monitoring of validation results.

```typescript
import type { OutputValidationEvent, OutputValidatorConfig } from 'yaaf';

// A callback function to handle validation events
const logValidationResult = (event: OutputValidationEvent): void => {
  console.log(`[${event.timestamp.toISOString()}] Validation Result:`);
  console.log(`  - Status: ${event.valid ? 'PASSED' : 'FAILED'}`);
  console.log(`  - Action: ${event.action}`);
  console.log(`  - Output Modified: ${event.modified}`);

  if (!event.valid) {
    console.log('  - Violations:');
    for (const violation of event.violations) {
      console.log(`    - Field: "${violation.field}"`);
      console.log(`    - Rule: ${violation.rule}`);
      console.log(`    - Expected: ${violation.expected}`);
      console.log(`    - Actual: ${JSON.stringify(violation.actual)}`);
    }
  }
};

// This function is then used in the validator's configuration.
// The StructuredOutputValidator will invoke it after every validation check.
const validatorConfig: OutputValidatorConfig = {
  rules: [
    { field: 'user.id', type: 'number', required: true, min: 1 },
    { field: 'user.email', type: 'email', required: true },
  ],
  onViolation: 'strip',
  onValidation: logValidationResult,
};

// When a StructuredOutputValidator instance with this config processes
// an LLM output, the logValidationResult function will be called with
// an OutputValidationEvent object.
```

## See Also

- `StructuredOutputValidator`: The class that performs the validation and emits this event.
- `OutputValidatorConfig`: The configuration object where the `onValidation` callback using this event type is defined.
- `OutputValidationViolation`: The type describing a single validation failure, used in the `violations` array of this event.

## Sources

[1] `src/security/structuredOutputValidator.ts`