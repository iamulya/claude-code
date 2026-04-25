---
export_name: OutputSanitizer
source_file: src/security/outputSanitizer.ts
category: class
summary: Sanitizes LLM responses to prevent downstream security issues like HTML/XSS, dangerous markdown, and suspicious URLs.
title: OutputSanitizer
entity_type: api
search_terms:
 - LLM output security
 - prevent XSS from LLM
 - sanitize agent response
 - strip HTML from AI
 - prompt injection detection
 - secure LLM output
 - content filtering for agents
 - afterLLM hook for security
 - validate URLs from LLM
 - cross-site scripting prevention
 - how to make agent output safe
 - YAAF security
 - block dangerous markdown
 - content length limits
stub: false
compiled_at: 2026-04-24T17:25:10.417Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/outputSanitizer.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/outputSanitizer.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `OutputSanitizer` class is a security component designed to clean and sanitize responses from Large Language Models ([LLM](../concepts/llm.md)s) before they are processed or displayed to users [Source 1]. Its primary purpose is to mitigate a range of security vulnerabilities that can arise from untrusted LLM-generated content.

Key security features include [Source 1]:
- **HTML/XSS Stripping**: Removes potentially malicious HTML, such as `<script>` tags, `onclick` event handlers, and `javascript:` URLs, to prevent Cross-Site Scripting (XSS) attacks.
- **Markdown Sanitization**: Strips dangerous elements from markdown, like raw HTML blocks, that could be exploited.
- **URL Validation**: Identifies and removes suspicious URLs using schemes like `data:` or `javascript:`.
- **Content Length Limiting**: Truncates oversized responses to prevent denial-of-service or [Memory](../concepts/memory.md) exhaustion attacks.
- **[Prompt Injection](../concepts/prompt-injection.md) Detection**: Scans for structural prompt injection patterns where the LLM output attempts to override its instructions (e.g., "Ignore all previous instructions...").

`OutputSanitizer` is flexible and can be integrated into an agent's lifecycle in several ways: as an `afterLLM` hook to automatically sanitize every model response, as a standalone utility for ad-hoc string sanitization, or as part of a `safeRun()` wrapper around an agent's execution [Source 1].

## Constructor

An `OutputSanitizer` instance is created with an optional configuration object that controls its behavior.

```typescript
import type { OutputSanitizerConfig } from 'yaaf';

export class OutputSanitizer {
  constructor(config?: OutputSanitizerConfig);
}
```

### `OutputSanitizerConfig`

The configuration object accepts the following properties [Source 1]:

| Property | Type | Description | Default |
| --- | --- | --- | --- |
| `stripHtml` | `boolean` | If `true`, strips all HTML tags from the output. | `true` |
| `stripDangerousHtml` | `boolean` | If `stripHtml` is `false`, this strips only dangerous HTML like scripts, iframes, and event handlers. Ignored if `stripHtml` is `true`. | `true` |
| `sanitizeUrls` | `boolean` | If `true`, removes suspicious URLs (e.g., `javascript:`, `data:`, `vbscript:`). | `true` |
| `maxLength` | `number` | The maximum allowed length of the output in characters. Content is truncated beyond this limit. | `100_000` |
| `stripMarkdownHtml` | `boolean` | If `true`, removes raw HTML blocks from markdown content. | `false` |
| `customSanitizer` | `(text: string) => string` | A custom function to apply additional sanitization rules after all built-in rules have been processed. | `undefined` |
| `onSanitize` | `(event: SanitizeEvent) => void` | A callback function invoked [when](./when.md)ever content is modified by the sanitizer. | `undefined` |
| `detectPromptInjection` | `boolean` | If `true`, enables scanning for structural prompt injection patterns in the LLM output. This is an opt-in feature. | `false` |
| `onInjection` | `(event: { patternName: string; match: string }) => void` | A callback invoked when a prompt injection pattern is detected. | `undefined` |
| `blockOnInjection` | `boolean` | When used with `hook()`, if `true`, the `afterLLM` hook will return `{ action: 'stop' }` to block a response where an injection pattern was detected. | `false` |

## Methods & Properties

### `sanitize()`

Sanitizes a given string according to the instance's configuration.

**Signature**
```typescript
sanitize(text: string): SanitizeResult;
```

**Return Value**
Returns a `SanitizeResult` object with the following structure [Source 1]:

```typescript
type SanitizeResult = {
  /** The sanitized text */
  text: string;
  /** Whether any modifications were made */
  modified: boolean;
  /** Events describing what was sanitized */
  events: SanitizeEvent[];
  /** True when at least one structural prompt-injection pattern was detected. */
  injectionDetected: boolean;
};
```

### `hook()`

Returns a function compatible with the `agent.hooks.afterLLM` property. This allows the sanitizer to automatically process every response from the LLM.

**Signature**
```typescript
hook(): (result: ChatResult) => Promise<LLMHookResult | void>;
```

If `detectPromptInjection` and `blockOnInjection` are both enabled in the configuration, this hook will return `{ action: 'stop' }` upon detecting a prompt injection pattern, preventing the agent from continuing with the compromised response [Source 1].

## Events

The `OutputSanitizer` can emit events via the `onSanitize` and `onInjection` callbacks defined in its configuration.

### `onSanitize`

This callback is triggered whenever the sanitizer modifies the input string. It receives a `SanitizeEvent` object.

**Payload: `SanitizeEvent`**
```typescript
type SanitizeEvent = {
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

### `onInjection`

This callback is triggered when `detectPromptInjection` is enabled and a potential structural prompt injection pattern is found in the output.

**Payload**
```typescript
type InjectionEvent = {
  patternName: string;
  match: string;
};
```

**Example Usage**
```typescript
const sanitizer = new OutputSanitizer({
  detectPromptInjection: true,
  onInjection: ({ patternName, match }) => {
    console.log(`CRITICAL: Injection detected! Pattern: ${patternName}`);
  }
});
```

## Examples

### Using as an `afterLLM` Hook

This is the most common usage pattern, ensuring all LLM outputs for an agent are automatically sanitized.

```typescript
import { Agent, OutputSanitizer } from 'yaaf';

// Create a sanitizer instance
const sanitizer = new OutputSanitizer({
  stripHtml: true,
  maxLength: 50000,
});

// Attach it to the agent's hooks
const agent = new Agent({
  // ... other agent config
  hooks: {
    afterLLM: sanitizer.hook(),
  },
});

// Now, all responses from agent.run() will be sanitized.
```

### Using as a Standalone Utility

The sanitizer can also be used to clean any arbitrary string.

```typescript
import { OutputSanitizer } from 'yaaf';

const sanitizer = new OutputSanitizer();

const maliciousInput = '<p>Hello <script>alert("xss")</script> world!</p>';
const result = sanitizer.sanitize(maliciousInput);

console.log(result.text);
// Output: "Hello  world!"

console.log(result.modified);
// Output: true

console.log(result.events[0].type);
// Output: "script_removed"
```

## See Also

- The `outputSanitizer()` and `strictSanitizer()` factory functions provide convenient presets for creating `OutputSanitizer` instances with production-ready or strict configurations [Source 1].

## Sources
[Source 1]: src/security/outputSanitizer.ts