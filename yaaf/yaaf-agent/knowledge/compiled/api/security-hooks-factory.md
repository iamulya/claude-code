---
title: securityHooks
entity_type: api
summary: A factory function that creates a pre-wired Hooks object containing standard security middlewares like PromptGuard and PiiRedactor.
export_name: securityHooks
source_file: src/security/index.ts
category: function
stub: false
compiled_at: 2026-04-16T14:34:12.822Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/security/index.ts
confidence: 1
---

## Overview
`securityHooks` is a factory function designed to simplify the implementation of OWASP-aligned security utilities in YAAF agents. It returns a pre-configured `Hooks` object that integrates three primary security middlewares: `PromptGuard` for injection detection, `OutputSanitizer` for XSS prevention, and `PiiRedactor` for sensitive data handling.

This function is the recommended way to apply a standard security posture to an agent without manually wiring individual hook lifecycle methods.

## Signature / Constructor

```typescript
export function securityHooks(config?: SecurityHooksConfig): Hooks;
```

### SecurityHooksConfig
The configuration object allows for fine-grained control over each security component. Setting a component to `false` disables it.

| Property | Type | Description |
| :--- | :--- | :--- |
| `promptGuard` | `PromptGuardConfig \| false` | Configuration for prompt injection detection. |
| `outputSanitizer` | `OutputSanitizerConfig \| false` | Configuration for LLM output sanitization (e.g., HTML stripping). |
| `piiRedactor` | `PiiRedactorConfig \| false` | Configuration for PII detection and redaction. |
| `_pluginHost` | `PluginHost` | (Optional) Internal reference used to forward security events to observability plugins. |

## Events
When a `PluginHost` is provided (either manually or automatically via agent composition), `securityHooks` forwards detection events to registered `ObservabilityAdapter` plugins. These events include:

*   **PII Detection**: Triggered when sensitive information is identified in inputs or outputs.
*   **Prompt Injection Detection**: Triggered when `PromptGuard` identifies a potential injection attack.
*   **Output Sanitization**: Triggered when the `OutputSanitizer` modifies LLM output to remove unsafe content.

These are emitted via `pluginHost.emitLog()` and `pluginHost.emitMetric()`.

## Examples

### Basic Usage
Applying the default security suite to an agent.

```typescript
import { Agent, securityHooks } from 'yaaf';

const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
  hooks: securityHooks(),
});
```

### Customized Security Configuration
Disabling specific components or adjusting sensitivity levels.

```typescript
import { Agent, securityHooks } from 'yaaf';

const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
  hooks: securityHooks({
    promptGuard: { mode: 'block', sensitivity: 'high' },
    outputSanitizer: { stripHtml: true },
    piiRedactor: { categories: ['email', 'ssn', 'api_key'] },
  }),
});
```

### Manual Observability Wiring
Manually providing a plugin host for security event tracking.

```typescript
import { securityHooks } from 'yaaf';

// Assuming pluginHost is an instance of PluginHost
const hooks = securityHooks(
  { piiRedactor: { mode: 'redact' } }, 
  pluginHost
);
```