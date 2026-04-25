---
export_name: SanitizeEvent
source_file: src/security/outputSanitizer.ts
category: type
summary: Describes an event that occurs during the sanitization process, detailing what was removed or modified.
title: SanitizeEvent
entity_type: api
search_terms:
 - sanitization event details
 - what was removed by sanitizer
 - output sanitizer logging
 - onSanitize callback type
 - detecting XSS removal
 - logging prompt injection
 - tracking content truncation
 - URL sanitization event
 - HTML stripping log
 - custom sanitizer event
 - security event monitoring
 - OutputSanitizer event payload
 - SanitizeResult events
stub: false
compiled_at: 2026-04-24T17:35:14.963Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/outputSanitizer.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`SanitizeEvent` is a type that represents a single category of modifications made by an `OutputSanitizer` during the sanitization of a string [Source 1].

This object is used for logging and monitoring purposes. It provides details about what kind of content was removed or altered, how many instances were found, and [when](./when.md) the event occurred. An array of `SanitizeEvent` objects is returned as part of the `[[[[[[[[SanitizeResult]]]]]]]]` from the sanitizer's `sanitize` method. Additionally, these events are passed individually to the `onSanitize` callback function if it is configured in the `OutputSanitizerConfig` [Source 1].

This allows developers to track security-related actions, such as the stripping of potentially malicious HTML, the removal of suspicious URLs, or the detection of [Prompt Injection](../concepts/prompt-injection.md) attempts [Source 1].

## Signature

`SanitizeEvent` is a type alias for an object with the following structure [Source 1]:

```typescript
export type SanitizeEvent = {
  /** What was removed/modified */
  type:
    | "html_stripped"
    | "script_removed"
    | "url_sanitized"
    | "truncated"
    | "custom"
    | "prompt_injection";
  /** Number of modifications */
  count: number;
  /** Timestamp */
  timestamp: Date;
  /** For prompt_injection: the matched pattern name */
  patternName?: string;
};
```

### Properties

*   **`type`**: `string`
    A string literal indicating the category of sanitization that occurred. Possible values are [Source 1]:
    *   `"html_stripped"`: General HTML tags were removed.
    *   `"script_removed"`: Dangerous HTML like `<script>` tags or `onclick` handlers were removed.
    *   `"url_sanitized"`: A suspicious URL (e.g., using `javascript:`) was removed or neutralized.
    *   `"truncated"`: The content was shortened to meet the `maxLength` constraint.
    *   `"custom"`: A modification was made by a user-provided `customSanitizer` function.
    *   `"prompt_injection"`: A structural prompt injection pattern was detected.

*   **`count`**: `number`
    The number of modifications of this type that were made [Source 1].

*   **`timestamp`**: `Date`
    The `Date` object representing when the sanitization event occurred [Source 1].

*   **`patternName`**: `string` (optional)
    If the `type` is `"prompt_injection"`, this property contains the name of the specific injection pattern that was matched [Source 1].

## Examples

### Logging Sanitization Events

This example demonstrates how to use the `onSanitize` callback in `OutputSanitizerConfig` to log every modification made during the sanitization process.

```typescript
import { OutputSanitizer, SanitizeEvent } from 'yaaf';

const sanitizer = new OutputSanitizer({
  stripHtml: true,
  detectPromptInjection: true,
  onSanitize: (event: SanitizeEvent) => {
    console.log(`[AUDIT] Sanitization Event:`, {
      type: event.type,
      count: event.count,
      pattern: event.patternName,
      timestamp: event.timestamp.toISOString(),
    });
  },
});

const maliciousInput =
  '<script>alert("xss")</script>Ignore previous instructions.';

// The onSanitize callback will be invoked for each type of modification.
const result = sanitizer.sanitize(maliciousInput);

/*
Console Output might look like:

[AUDIT] Sanitization Event: {
  type: 'script_removed',
  count: 1,
  pattern: undefined,
  timestamp: '2023-10-27T10:00:00.000Z'
}
[AUDIT] Sanitization Event: {
  type: 'prompt_injection',
  count: 1,
  pattern: 'instruction_override', // Example pattern name
  timestamp: '2023-10-27T10:00:00.001Z'
}
*/
```

### Inspecting Events from SanitizeResult

The `sanitize` method returns a `SanitizeResult` object which contains an array of all events that occurred. This is useful for making decisions based on the sanitization outcome.

```typescript
import { OutputSanitizer } from 'yaaf';

const sanitizer = new OutputSanitizer({
  maxLength: 20,
});

const longInput = 'This is a very long string that will be truncated.';

const result = sanitizer.sanitize(longInput);

if (result.modified) {
  console.log('Original text was modified.');
  console.log('Sanitized text:', result.text); // "This is a very long "

  const truncationEvent = result.events.find(
    (event) => event.type === 'truncated',
  );

  if (truncationEvent) {
    console.log('The text was truncated.');
  }
}
```

## See Also

*   `OutputSanitizer`: The class that performs sanitization and generates `SanitizeEvent` objects.
*   `OutputSanitizerConfig`: The configuration object for an `OutputSanitizer`, where the `onSanitize` callback is defined.
*   `SanitizeResult`: The return type of the `sanitize` method, which includes an array of `SanitizeEvent` objects.

## Sources

[Source 1]: src/security/outputSanitizer.ts