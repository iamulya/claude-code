---
title: OutputSanitizer
entity_type: api
summary: A utility and hook provider for sanitizing LLM responses to prevent XSS, dangerous URLs, and memory exhaustion.
export_name: OutputSanitizer
source_file: src/security/outputSanitizer.ts
category: class
stub: false
compiled_at: 2026-04-16T14:34:44.670Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/security/outputSanitizer.ts
confidence: 0.98
---

## Overview
`OutputSanitizer` is a security utility designed to process LLM-generated content before it is consumed by downstream systems or rendered in a UI. It mitigates risks such as Cross-Site Scripting (XSS), dangerous URL injection, and memory exhaustion from oversized responses. 

The utility can be integrated into an agent's lifecycle as an `afterLLM` hook, used as a standalone string processor, or applied as a wrapper around agent execution.

Key capabilities include:
- **HTML/XSS stripping**: Removes `<script>` tags, `onclick` handlers, and `javascript:` pseudo-protocols.
- **Markdown sanitization**: Strips raw HTML blocks within markdown content.
- **URL validation**: Flags or removes suspicious URL schemes (e.g., `data:`, `vbscript:`).
- **Content length limits**: Truncates oversized responses to prevent memory exhaustion.

## Signature / Constructor

### Constructor
```typescript
constructor(config?: OutputSanitizerConfig)
```

### OutputSanitizerConfig
| Property | Type | Description |
| :--- | :--- | :--- |
| `stripHtml` | `boolean` | Strip all HTML tags. Default: `true`. |
| `stripDangerousHtml` | `boolean` | Strip only dangerous HTML (scripts, iframes, event handlers). Ignored if `stripHtml` is true. Default: `true`. |
| `sanitizeUrls` | `boolean` | Remove suspicious URLs (javascript:, data:, vbscript:). Default: `true`. |
| `maxLength` | `number` | Maximum output length in characters. Default: `100_000`. |
| `stripMarkdownHtml` | `boolean` | Strip raw HTML blocks from markdown (e.g., \`\`\`html ... \`\`\`). Default: `false`. |
| `customSanitizer` | `(text: string) => string` | Custom function applied after built-in rules. |
| `onSanitize` | `(event: SanitizeEvent) => void` | Callback triggered when content is modified. |

## Methods & Properties

### Public Methods
- **`sanitize(text: string): SanitizeResult`**: Processes a string according to the instance configuration. Returns a `SanitizeResult` containing the cleaned text and a list of modifications made.
- **`hook(): (result: ChatResult) => Promise<LLMHookResult>`**: Returns a hook function that can be registered in the `afterLLM` lifecycle of an agent.

### Factory Functions
- **`outputSanitizer(config?: OutputSanitizerConfig): OutputSanitizer`**: Creates a new instance with production-grade defaults.
- **`strictSanitizer(config?: Omit<OutputSanitizerConfig, 'stripHtml'>): OutputSanitizer`**: Creates a new instance with `stripHtml` forced to `true`.

## Events
The `onSanitize` callback receives a `SanitizeEvent` object:

| Property | Type | Description |
| :--- | :--- | :--- |
| `type` | `enum` | One of: `html_stripped`, `script_removed`, `url_sanitized`, `truncated`, `custom`. |
| `count` | `number` | The number of modifications performed for this event type. |
| `timestamp` | `Date` | When the sanitization occurred. |

## Examples

### Using as an Agent Hook
```typescript
import { Agent, OutputSanitizer } from 'yaaf';

const sanitizer = new OutputSanitizer();

const agent = new Agent({
  hooks: {
    afterLLM: sanitizer.hook(),
  },
});
```

### Standalone Usage
```typescript
import { OutputSanitizer } from 'yaaf';

const sanitizer = new OutputSanitizer({
  stripHtml: true,
  maxLength: 500
});

const result = sanitizer.sanitize('<script>alert("xss")</script>Hello World');
console.log(result.text); // "Hello World"
console.log(result.modified); // true
```