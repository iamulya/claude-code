---
summary: The process of identifying and masking Personally Identifiable Information (PII) to ensure data privacy and regulatory compliance.
title: PII Redaction
entity_type: concept
stub: false
compiled_at: 2026-04-16T14:34:56.039Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/security/piiRedactor.ts
confidence: 1
---

---
title: PII Redaction
entity_type: concept
summary: The process of identifying and masking Personally Identifiable Information (PII) to ensure data privacy and regulatory compliance.
related_subsystems:
  - security
  - agents

## What It Is
PII Redaction is a security mechanism in YAAF designed to identify and mask sensitive information within text streams. It serves as a privacy layer between the agent and the LLM provider, as well as between the agent and the end-user. By scanning both inputs and outputs, the framework prevents the accidental leakage of sensitive data—such as credentials, financial records, or personal identifiers—to external model providers or unauthorized users.

The system is designed to be bidirectional, meaning it can scrub data before it is sent to an LLM (protecting user privacy) and after a response is received (protecting system secrets or preventing the LLM from hallucinating/revealing sensitive data).

## How It Works in YAAF
PII Redaction is implemented via the `PiiRedactor` class, which functions as composable middleware. It is typically integrated into the agent lifecycle using `beforeLLM` and `afterLLM` hooks.

### Detection Categories
The framework includes built-in support for several PII categories:
*   **Email addresses**: RFC 5322 compliant patterns.
*   **Phone numbers**: US, EU, and international formats.
*   **Social Security Numbers (SSN)**: US-specific patterns (XXX-XX-XXXX).
*   **Credit card numbers**: Supports Visa, Mastercard, Amex, and Discover with Luhn-algorithm validation to reduce false positives.
*   **API keys / tokens**: Common patterns for providers like AWS, GitHub, and Stripe.
*   **IP addresses**: Both IPv4 and IPv6.
*   **Passport numbers**: US passport formats.
*   **IBAN numbers**: International Bank Account Numbers.

### Operating Modes
The redactor operates in two distinct modes:
1.  **redact**: Replaces detected PII with a placeholder, such as `[REDACTED:type]`. This is the default behavior.
2.  **detect**: Flags the location and type of PII without modifying the underlying text, which is useful for auditing or triggering alerts without altering the conversation flow.

### Hook Integration
The `PiiRedactor` provides `beforeHook()` and `afterHook()` methods. When used as a `beforeLLM` hook, it scrubs user messages before they reach the LLM. When used as an `afterLLM` hook, it scrubs the LLM's response before it is returned to the application or user.

## Configuration
Developers configure redaction behavior through the `PiiRedactorConfig` object. This allows for selecting specific categories, defining custom regex patterns, and setting up allowlists for known-safe values.

```typescript
import { PiiRedactor } from 'yaaf';

const redactor = new PiiRedactor({
  mode: 'redact',
  categories: ['email', 'ssn', 'credit_card', 'api_key'],
  // Custom patterns for domain-specific PII
  customPatterns: [{
    name: 'Internal Project Code',
    category: 'project_id',
    pattern: /PROJ-[0-9]{4}/g
  }],
  // Values that should never be redacted
  allowlist: ['support@company.com'],
  // Callback for auditing
  onDetection: (event) => {
    console.log(`Detected ${event.category} in ${event.direction}`);
  }
});

const agent = new Agent({
  hooks: {
    beforeLLM: redactor.beforeHook(),
    afterLLM: redactor.afterHook(),
  },
});
```

For high-security environments, YAAF provides a `strictPiiRedactor` factory function that enables all built-in categories by default in `redact` mode.

## Sources
* `src/security/piiRedactor.ts`