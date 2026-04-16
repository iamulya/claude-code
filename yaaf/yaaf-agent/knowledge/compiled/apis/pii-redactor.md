---
export_name: PiiRedactor
source_file: src/security/piiRedactor.ts
category: class
summary: A bidirectional PII scanner and redactor that protects sensitive information in LLM inputs and outputs.
title: PiiRedactor
entity_type: api
stub: false
compiled_at: 2026-04-16T14:34:50.338Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/security/piiRedactor.ts
confidence: 1
---

## Overview
`PiiRedactor` is a security utility designed to identify and mask Personally Identifiable Information (PII) within LLM-powered applications. It operates as a bidirectional scanner, capable of processing both user messages (input) and LLM responses (output). 

The redactor supports two primary modes of operation:
*   **redact**: Replaces detected PII with placeholders (e.g., `[REDACTED:email]`).
*   **detect**: Flags the location and type of PII without modifying the underlying text, useful for auditing or triggering alerts.

It is designed to be used as middleware via agent hooks, ensuring that sensitive data like credit card numbers, API keys, and social security numbers do not reach the LLM provider or leak into application logs.

## Signature / Constructor

### Class Constructor
```typescript
export class PiiRedactor {
  constructor(config?: PiiRedactorConfig);
}
```

### Configuration Types
```typescript
export type PiiRedactorConfig = {
  /**
   * Operating mode:
   * - `detect` — find PII occurrences without modifying text
   * - `redact` — replace PII with `[REDACTED:type]` placeholders (default)
   */
  mode?: PiiRedactorMode

  /**
   * Categories of PII to scan for.
   * Default: all built-in categories.
   */
  categories?: PiiCategory[]

  /**
   * Custom PII patterns to detect.
   */
  customPatterns?: CustomPiiPattern[]

  /**
   * Replacement template for redacted PII.
   * Use `{type}` as a placeholder for the PII category name.
   * Default: `[REDACTED:{type}]`
   */
  redactTemplate?: string

  /**
   * Allowlisted values that should never be redacted.
   */
  allowlist?: string[]

  /**
   * Called when PII is detected.
   */
  onDetection?: (event: PiiEvent) => void
}

export type PiiCategory =
  | 'email'
  | 'phone'
  | 'ssn'
  | 'credit_card'
  | 'api_key'
  | 'ipv4'
  | 'ipv6'
  | 'passport'
  | 'iban'
  | 'custom'

export type CustomPiiPattern = {
  name: string
  category: string
  pattern: RegExp
  validate?: (match: string) => boolean
}
```

### Factory Functions
The framework provides two factory functions for common initialization patterns:
*   `piiRedactor(config?: PiiRedactorConfig)`: Creates a redactor with the provided configuration.
*   `strictPiiRedactor(config?)`: Creates a redactor with all categories enabled and forced into `redact` mode.

## Methods & Properties

| Method | Signature | Description |
| :--- | :--- | :--- |
| `beforeHook` | `() => (messages: ChatMessage[]) => Promise<LLMHookResult>` | Returns a hook for use in an agent's `beforeLLM` lifecycle to scrub outgoing user messages. |
| `afterHook` | `() => (result: ChatResult) => Promise<LLMHookResult>` | Returns a hook for use in an agent's `afterLLM` lifecycle to scrub incoming LLM responses. |

## Events
The `PiiRedactor` triggers the `onDetection` callback whenever PII is identified.

### PiiEvent
```typescript
export type PiiEvent = {
  category: string;
  direction: 'input' | 'output';
  count: number;
  action: 'detected' | 'redacted';
  timestamp: Date;
}
```

## Examples

### Basic Redaction Hook
This example demonstrates how to configure a redactor to scrub specific categories of information before they are sent to an LLM.

```typescript
import { PiiRedactor, Agent } from 'yaaf';

const redactor = new PiiRedactor({
  mode: 'redact',
  categories: ['email', 'ssn', 'credit_card', 'api_key'],
});

const agent = new Agent({
  hooks: {
    beforeLLM: redactor.beforeHook(),
    afterLLM: redactor.afterHook(),
  },
});
```

### Custom PII Patterns
Users can define domain-specific PII patterns using regular expressions and optional validation logic.

```typescript
const redactor = piiRedactor({
  customPatterns: [{
    name: 'Internal Project Code',
    category: 'project_id',
    pattern: /PRJ-[0-9]{4}/g,
    validate: (match) => match !== 'PRJ-0000' // Example: ignore a specific placeholder
  }],
  onDetection: (e) => {
    console.log(`Detected ${e.count} instances of ${e.category}`);
  }
});
```

## See Also
*   `ChatMessage`
*   `ChatResult`
*   `LLMHookResult`