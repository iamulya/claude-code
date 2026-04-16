---
title: PiiRedactor
entity_type: api
summary: Middleware for detecting and redacting Personally Identifiable Information (PII) in both inputs and outputs (OWASP LLM06).
export_name: PiiRedactor
source_file: src/security/piiRedactor.ts
category: class
stub: false
compiled_at: 2026-04-16T14:34:24.172Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/security/index.ts
confidence: 1
---

## Overview
`PiiRedactor` is a security middleware class designed to identify and mask Personally Identifiable Information (PII) within agent communication flows. It is specifically designed to mitigate **OWASP LLM06: Sensitive Information Disclosure** by ensuring that sensitive data—such as email addresses, Social Security Numbers (SSNs), or API keys—is neither transmitted to LLM providers nor leaked in the model's generated responses.

The class provides hooks that can be integrated into an agent's lifecycle to process data in both directions:
1.  **Inbound (Input):** Redacting PII from user prompts before they reach the LLM.
2.  **Outbound (Output):** Redacting PII from LLM responses before they are returned to the application or user.

## Signature / Constructor

```typescript
export class PiiRedactor {
  constructor(config?: PiiRedactorConfig);
}

export interface PiiRedactorConfig {
  /** 
   * The action to take when PII is detected. 
   * 'redact' replaces the sensitive text with a placeholder.
   */
  mode?: 'redact' | 'block';
  /** 
   * Specific PII categories to target. 
   * Common values include 'email', 'ssn', 'api_key', etc. 
   */
  categories?: string[];
}
```

## Methods & Properties

### beforeHook()
Returns a hook function compatible with the `beforeLLM` agent hook. It scans the array of `ChatMessage` objects and applies redaction logic based on the configured `mode` and `categories`.

### afterHook()
Returns a hook function compatible with the `afterLLM` agent hook. It scans the `ChatResult` returned by the LLM and redacts sensitive information from the content before it is finalized.

## Examples

### Manual Hook Integration
This example demonstrates how to manually instantiate `PiiRedactor` and wire it into an agent's lifecycle hooks.

```typescript
import { Agent, PiiRedactor } from 'yaaf';

const redactor = new PiiRedactor({ 
  mode: 'redact',
  categories: ['email', 'api_key'] 
});

const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
  hooks: {
    beforeLLM: async (messages) => {
      // Redact PII from input messages
      const redacted = redactor.beforeHook()(messages);
      return redacted ?? messages;
    },
    afterLLM: async (response, iteration) => {
      // Redact PII from the LLM's response
      return redactor.afterHook()(response, iteration);
    },
  },
});
```

### Integration via securityHooks
`PiiRedactor` is often used as part of the unified `securityHooks` utility, which simplifies the configuration of multiple security middlewares.

```typescript
import { Agent, securityHooks } from 'yaaf';

const agent = new Agent({
  systemPrompt: '...',
  hooks: securityHooks({
    piiRedactor: { 
      categories: ['email', 'ssn', 'api_key'] 
    },
  }),
});
```

## See Also
- `securityHooks`
- `PromptGuard`
- `OutputSanitizer`