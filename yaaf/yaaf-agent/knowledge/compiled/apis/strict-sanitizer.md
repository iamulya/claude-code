---
export_name: strictSanitizer
source_file: src/security/outputSanitizer.ts
category: function
summary: Factory function to create a strict OutputSanitizer instance that strips all HTML by default.
title: strictSanitizer
entity_type: api
search_terms:
 - strict html stripping
 - remove all html from llm output
 - secure output sanitizer
 - prevent xss in agent response
 - create a sanitizer
 - output sanitization factory
 - default html stripping
 - safe llm output
 - content filtering
 - how to sanitize agent output
 - YAAF security
 - strip all tags
 - agent output security
stub: false
compiled_at: 2026-04-24T17:41:33.605Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/outputSanitizer.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `strictSanitizer` function is a factory that creates and returns a pre-configured instance of the `OutputSanitizer` class [Source 1].

This factory is designed for use cases where the strictest security policy is required, and no HTML is ever expected or desired in the final output from a Large Language Model ([LLM](../concepts/llm.md)). It configures the `OutputSanitizer` to strip all HTML tags from the text, regardless of whether they are considered dangerous (like `<script>`) or benign (like `<b>`) [Source 1].

It serves as a convenient shorthand for manually instantiating `OutputSanitizer` with `{ stripHtml: true }`. Users can still provide other configuration options to customize behavior, such as URL sanitization, content length limits, or [Prompt Injection Detection](../concepts/prompt-injection-detection.md) [Source 1].

## Signature

```typescript
export function strictSanitizer(
  config?: Omit<OutputSanitizerConfig, "stripHtml">,
): OutputSanitizer;
```

### Parameters

-   **`config`** (optional): An `OutputSanitizerConfig` object to customize the sanitizer's behavior. The `stripHtml` property is omitted from the type, as it is implicitly set to `true` by this factory and cannot be overridden [Source 1].

### Returns

-   **`OutputSanitizer`**: A new instance of the `OutputSanitizer` class, configured to strip all HTML content [Source 1].

## Examples

### Standalone Usage

The returned sanitizer can be used as a standalone utility to clean strings.

```typescript
import { strictSanitizer } from 'yaaf';

// Create a sanitizer that strips all HTML.
const sanitizer = strictSanitizer();

const maliciousInput = '<script>alert("xss")</script><b>Hello</b> World!';
const result = sanitizer.sanitize(maliciousInput);

console.log(result.text);
// Output: "Hello World!"

console.log(result.modified);
// Output: true

console.log(result.events);
// Output: [ { type: 'html_stripped', count: 2, timestamp: ... } ]
```

### Agent Hook Integration

The most common use case is to integrate the sanitizer directly into an agent's lifecycle using an `afterLLM` hook. This ensures every response from the LLM is automatically sanitized before being processed further or sent to a user.

```typescript
import { Agent, strictSanitizer } from 'yaaf';

// Create a strict sanitizer instance.
const sanitizer = strictSanitizer({
  maxLength: 5000, // Also set a max length for responses.
});

const agent = new Agent({
  // ... other agent configuration
  hooks: {
    // The sanitizer's hook method is passed to the agent.
    afterLLM: sanitizer.hook(),
  },
});

// Now, any response from the LLM processed by agent.run()
// will have all HTML stripped automatically.
```

## See Also

-   `OutputSanitizer`: The class that `strictSanitizer` instantiates and configures.
-   `outputSanitizer`: A more lenient factory function that provides production defaults but does not strip all HTML unless configured to do so.
-   `OutputSanitizerConfig`: The configuration type used to customize sanitizer behavior.

## Sources

[Source 1]: src/security/outputSanitizer.ts