---
export_name: OutputSanitizerConfig
source_file: src/security/outputSanitizer.ts
category: type
summary: Configuration options for the OutputSanitizer, controlling various sanitization behaviors.
title: OutputSanitizerConfig
entity_type: api
search_terms:
 - output sanitization settings
 - configure LLM output cleaning
 - XSS prevention options
 - prompt injection detection config
 - strip HTML from agent response
 - limit agent output length
 - custom sanitizer function
 - block prompt injection
 - onSanitize callback
 - onInjection callback
 - secure agent output
 - OutputSanitizer options
 - content filtering rules
stub: false
compiled_at: 2026-04-24T17:25:10.235Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/outputSanitizer.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`OutputSanitizerConfig` is a type alias for the configuration object used to customize the behavior of an `OutputSanitizer` instance. It allows developers to enable, disable, and fine-tune various security features, such as HTML stripping, URL validation, content length limits, and [Prompt Injection](../concepts/prompt-injection.md) detection [Source 1].

This configuration object is passed to the `OutputSanitizer` constructor or to factory functions like `outputSanitizer` and `strictSanitizer` to create a sanitizer with specific rules [Source 1].

## Signature

`OutputSanitizerConfig` is a type alias for an object with the following properties [Source 1]:

```typescript
export type OutputSanitizerConfig = {
  /**
   * Strip all HTML tags.
   * @default true
   */
  stripHtml?: boolean;

  /**
   * Strip dangerous HTML only (scripts, event handlers, iframes).
   * If `stripHtml` is true, this is ignored.
   * @default true
   */
  stripDangerousHtml?: boolean;

  /**
   * Remove suspicious URLs (javascript:, data:, vbscript:).
   * @default true
   */
  sanitizeUrls?: boolean;

  /**
   * Maximum output length in characters. Content beyond this is truncated.
   * @default 100_000
   */
  maxLength?: number;

  /**
   * Strip raw HTML blocks from markdown (```html ... ```).
   * @default false (preserves code blocks)
   */
  stripMarkdownHtml?: boolean;

  /**
   * Custom sanitization function applied after all built-in rules.
   */
  customSanitizer?: (text: string) => string;

  /**
   * Called [[[[[[[[when]]]]]]]] content is sanitized.
   */
  onSanitize?: (event: SanitizeEvent) => void;

  /**
   * Detect structural prompt-injection patterns in the LLM output.
   * When `true`, the sanitizer scans for patterns like "Ignore all previous instructions...".
   * Detection is logged via `onInjection` and `onSanitize`, but the text is not modified.
   * @default false (opt-in)
   */
  detectPromptInjection?: boolean;

  /**
   * Called when a structural prompt-injection pattern is detected.
   * Receives the pattern name and the matched text.
   */
  onInjection?: (event: { patternName: string; match: string }) => void;

  /**
   * When `true` and `detectPromptInjection` is enabled, the `hook()` method
   * returns `{ action: 'stop' }` from an `afterLLM` hook if injection is detected,
   * blocking the response.
   * @default false (detect-only)
   */
  blockOnInjection?: boolean;
};
```

## Examples

### Basic Configuration

This example creates a sanitizer that keeps HTML but strips dangerous elements and limits the output length.

```typescript
import { OutputSanitizer, OutputSanitizerConfig } from 'yaaf';

const config: OutputSanitizerConfig = {
  stripHtml: false,
  stripDangerousHtml: true,
  maxLength: 5000,
};

const sanitizer = new OutputSanitizer(config);

const dirtyHtml = '<b>Hello</b> <script>alert("xss")</script>';
const cleanHtml = sanitizer.sanitize(dirtyHtml).text;
// cleanHtml is "<b>Hello</b> "
```

### Configuring [Prompt Injection Detection](../concepts/prompt-injection-detection.md)

This example configures the sanitizer to detect structural prompt injection attempts, log them, and block the response from being sent when used as a hook.

```typescript
import { OutputSanitizer, OutputSanitizerConfig } from 'yaaf';

const config: OutputSanitizerConfig = {
  // Enable detection
  detectPromptInjection: true,
  
  // Block the response in a hook if injection is found
  blockOnInjection: true,
  
  // Log detected injections for security auditing
  onInjection: ({ patternName, match }) => {
    console.warn(
      `[SECURITY] Prompt injection detected! Pattern: ${patternName}, Match: "${match}"`
    );
  },
};

const sanitizer = new OutputSanitizer(config);

// This sanitizer can now be used in an agent's `afterLLM` hook
// to automatically detect and block injection attacks.
```

## See Also

*   `OutputSanitizer`: The class that uses this configuration.
*   `outputSanitizer`: A factory function to create a sanitizer with production defaults.
*   `strictSanitizer`: A factory function to create a sanitizer that strips all HTML.

## Sources

[Source 1]: src/security/outputSanitizer.ts