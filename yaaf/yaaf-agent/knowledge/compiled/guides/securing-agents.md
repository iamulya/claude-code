---
title: Securing YAAF Agents
entity_type: guide
summary: How to implement OWASP-aligned security measures using YAAF's built-in security hooks and middleware.
difficulty: intermediate
stub: false
compiled_at: 2026-04-16T14:34:31.116Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/security/index.ts
confidence: 0.9
---

## Overview
YAAF provides a suite of security utilities designed to mitigate common risks associated with Large Language Model (LLM) applications, aligned with the OWASP Top 10 for LLM Applications. This guide demonstrates how to implement prompt injection protection, PII redaction, and output sanitization using YAAF's built-in security hooks.

## Prerequisites
- A basic understanding of the YAAF `Agent` class.
- Familiarity with YAAF's hook system (`beforeLLM` and `afterLLM`).

## Step-by-Step

### Method 1: Using the `securityHooks` Helper
The simplest way to secure an agent is to use the `securityHooks()` helper function. This function creates a pre-wired `Hooks` object containing `PromptGuard`, `OutputSanitizer`, and `PiiRedactor`.

```ts
import { Agent, securityHooks } from 'yaaf';

const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
  // Applies default security settings
  hooks: securityHooks(),
});
```

You can customize individual components by passing a configuration object:

```ts
const agent = new Agent({
  hooks: securityHooks({
    promptGuard: { mode: 'block', sensitivity: 'high' },
    outputSanitizer: { stripHtml: true },
    piiRedactor: { categories: ['email', 'ssn', 'api_key'] },
  }),
});
```

### Method 2: Manual Hook Composition
For more granular control, you can instantiate security utilities individually and compose them within the agent's hook lifecycle.

```ts
import { Agent, PromptGuard, OutputSanitizer, PiiRedactor } from 'yaaf';

const guard = new PromptGuard({ mode: 'block', sensitivity: 'high' });
const sanitizer = new OutputSanitizer();
const redactor = new PiiRedactor({ mode: 'redact' });

const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
  hooks: {
    beforeLLM: async (messages) => {
      // 1. Detect and block prompt injection
      const guarded = guard.hook()(messages);
      const msgs = guarded ?? messages;

      // 2. Redact PII from the input
      return redactor.beforeHook()(msgs) ?? msgs;
    },
    afterLLM: async (response, iteration) => {
      // 3. Sanitize LLM output (e.g., strip HTML/XSS)
      const sanitized = sanitizer.hook()(response, iteration);
      if (sanitized?.action === 'override') {
        return sanitized;
      }

      // 4. Redact PII from the output
      return redactor.afterHook()(response, iteration);
    },
  },
});
```

## Configuration Reference

### SecurityHooksConfig
The `securityHooks` function accepts the following configuration options:

| Property | Type | Description |
| :--- | :--- | :--- |
| `promptGuard` | `PromptGuardConfig \| false` | Configuration for prompt injection detection. Set to `false` to disable. |
| `outputSanitizer` | `OutputSanitizerConfig \| false` | Configuration for XSS and HTML stripping. Set to `false` to disable. |
| `piiRedactor` | `PiiRedactorConfig \| false` | Configuration for PII detection and redaction. Set to `false` to disable. |
| `_pluginHost` | `PluginHost` | (Internal) Used to forward security events to observability plugins. |

### Available Security Utilities
YAAF includes several specialized security modules:
- **PromptGuard**: Detects and blocks prompt injection (LLM01).
- **OutputSanitizer**: Strips XSS and HTML from LLM outputs (LLM02).
- **PiiRedactor**: Detects and redacts Personally Identifiable Information (LLM06).
- **TrustPolicy**: Verifies the integrity of plugins and MCP (Model Context Protocol) tools (LLM05).
- **GroundingValidator**: Cross-references outputs to prevent hallucinations (LLM09).
- **PerUserRateLimiter**: Implements usage budgets per identity (LLM04/08).

## Common Mistakes
1. **Unidirectional PII Redaction**: Only redacting PII in the `beforeLLM` hook. PII can also be generated or leaked by the LLM itself, requiring redaction in the `afterLLM` hook.
2. **Missing Observability**: Failing to provide a `PluginHost` to the security hooks. Without this, security events (like blocked injections or redacted PII) may not be logged or tracked in metrics.
3. **Over-reliance on Defaults**: Using default sensitivity levels for `PromptGuard` in high-stakes environments where "high" sensitivity may be required to prevent sophisticated injection attacks.

## Sources
- `src/security/index.ts`