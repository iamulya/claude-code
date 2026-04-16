---
summary: A step-by-step guide on configuring the PiiRedactor to scrub sensitive data from user inputs and LLM responses.
title: Redacting PII in Agent Conversations
entity_type: guide
difficulty: intermediate
stub: false
compiled_at: 2026-04-16T14:34:58.800Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/security/piiRedactor.ts
confidence: 1
---

## Overview
In production environments, protecting Personally Identifiable Information (PII) is a critical security requirement. YAAF provides the `PiiRedactor` middleware to automatically detect and scrub sensitive data from both user inputs (before they reach the LLM) and LLM responses (before they reach the user).

This guide demonstrates how to configure the redactor, define custom detection patterns, and integrate the scanner into an agent's execution lifecycle.

## Prerequisites
- A basic understanding of the YAAF `Agent` class.
- An existing YAAF project with the core library installed.

## Step-by-Step

### 1. Initialize the Redactor
The `PiiRedactor` can be initialized using the `piiRedactor()` factory function. You can specify which categories of data to monitor and whether to simply detect the data or redact it.

```typescript
import { piiRedactor } from 'yaaf';

const redactor = piiRedactor({
  mode: 'redact', // Replaces PII with placeholders
  categories: ['email', 'ssn', 'credit_card', 'api_key'],
  onDetection: (event) => {
    console.log(`Detected ${event.category} in ${event.direction} flow.`);
  }
});
```

### 2. Attach to Agent Hooks
To ensure bidirectional protection, the redactor must be attached to both the `beforeLLM` and `afterLLM` hooks of the agent.

- **beforeLLM**: Scrubs PII from user messages before they are sent to the LLM provider.
- **afterLLM**: Scrubs PII from the LLM's response before it is returned to the application or user.

```typescript
import { Agent } from 'yaaf';

const agent = new Agent({
  hooks: {
    beforeLLM: redactor.beforeHook(),
    afterLLM: redactor.afterHook(),
  },
});
```

### 3. Configure Custom Patterns
If your application handles domain-specific sensitive data (e.g., internal employee IDs or proprietary project codes), you can define `customPatterns`.

```typescript
const redactor = piiRedactor({
  customPatterns: [
    {
      name: 'Internal Employee ID',
      category: 'employee_id',
      pattern: /EMP-[0-9]{5}/g,
      // Optional: validate the match to reduce false positives
      validate: (match) => match.startsWith('EMP-')
    }
  ]
});
```

### 4. Use Strict Mode for High-Security Environments
For environments requiring maximum protection, the `strictPiiRedactor` helper initializes a redactor with all built-in categories enabled and the mode set to `redact`.

```typescript
import { strictPiiRedactor } from 'yaaf';

const redactor = strictPiiRedactor({
  allowlist: ['support@company.com'] // Exempt specific values from redaction
});
```

## Configuration Reference

The `PiiRedactorConfig` object supports the following options:

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `mode` | `'detect' \| 'redact'` | `'redact'` | `detect` flags PII without modification; `redact` replaces it with placeholders. |
| `categories` | `PiiCategory[]` | All | Built-in categories: `email`, `phone`, `ssn`, `credit_card`, `api_key`, `ipv4`, `ipv6`, `passport`, `iban`. |
| `customPatterns` | `CustomPiiPattern[]` | `[]` | Array of user-defined regex patterns for domain-specific PII. |
| `redactTemplate` | `string` | `[REDACTED:{type}]` | The template for the replacement text. `{type}` is replaced by the category name. |
| `allowlist` | `string[]` | `[]` | A list of specific strings that should never be redacted. |
| `onDetection` | `Function` | `undefined` | Callback triggered whenever PII is identified. |

## Common Mistakes

1. **Missing Hooks**: Only attaching the redactor to `beforeLLM`. This leaves the system vulnerable if the LLM "hallucinates" or repeats PII in its response. Always use both `beforeHook()` and `afterHook()`.
2. **Over-Redaction**: Using overly broad regex patterns in `customPatterns` that catch common words. Use the `validate` function to perform checksums or secondary checks.
3. **Ignoring the Allowlist**: Redacting the support email address or the company's own public IP address. Use the `allowlist` to keep known-safe identifiers intact.
4. **Regex Flags**: Forgetting the global (`g`) flag in `customPatterns`, which may result in only the first occurrence of PII being caught in a message.

## Next Steps
- Explore advanced agent configuration in the documentation.
- Implement an audit log using the `onDetection` callback to track PII exposure attempts.