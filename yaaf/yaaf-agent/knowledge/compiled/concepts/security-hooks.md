---
title: Security Hooks
entity_type: concept
summary: A pattern in YAAF where security middleware is composed into agent lifecycles using the hooks system to intercept and validate inputs and outputs.
stub: false
compiled_at: 2026-04-16T14:34:11.303Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/security/index.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/security/piiRedactor.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/security/promptGuard.ts
confidence: 0.95
---

---
title: "Security Hooks"
entity_type: "concept"
summary: "A pattern in YAAF where security middleware is composed into agent lifecycles using the hooks system to intercept and validate inputs and outputs."
related_subsystems:
  - "security"
  - "agents"

## What It Is
Security Hooks are a middleware pattern in YAAF used to implement OWASP-aligned security controls for Large Language Model (LLM) applications. By leveraging the framework's lifecycle hooks, developers can intercept data flowing to and from an LLM to mitigate common vulnerabilities such as prompt injection, sensitive data leakage, and insecure output generation.

This concept centralizes security logic, allowing it to be composed across different agents without modifying the core agent logic. It addresses several LLM-specific security risks, including:
*   **LLM01 (Prompt Injection):** Detecting and blocking malicious instructions.
*   **LLM02 (Insecure Output Handling):** Sanitizing LLM responses to prevent XSS or HTML injection.
*   **LLM06 (Sensitive Information Disclosure):** Redacting Personally Identifiable Information (PII) from both inputs and outputs.

## How It Works in YAAF
Security Hooks operate by attaching specialized middleware classes to an agent's `beforeLLM` and `afterLLM` lifecycle events. YAAF provides several built-in security components that can be used individually or composed via the `securityHooks()` utility.

### Core Components
The framework includes several specialized security modules:
*   **PromptGuard:** A `beforeLLM` hook that scans user messages for injection patterns, instruction overrides, and role hijacking. It can operate in `detect` (log only) or `block` (sanitize) modes.
*   **PiiRedactor:** A bidirectional scanner that identifies and redacts sensitive data (e.g., emails, SSNs, API keys) in both user inputs and LLM responses.
*   **OutputSanitizer:** An `afterLLM` hook that strips HTML or potentially malicious scripts from the LLM's output.
*   **TrustPolicy:** Verifies the integrity of plugins and Model Context Protocol (MCP) tools.
*   **GroundingValidator:** Cross-references LLM outputs against provided context to reduce hallucinations.
*   **PerUserRateLimiter:** Manages usage budgets and prevents resource exhaustion.

### Lifecycle Integration
When an agent is initialized, these components are wired into the execution flow:
1.  **Input Phase (`beforeLLM`):** The `PromptGuard` checks for malicious payloads, and the `PiiRedactor` scrubs sensitive data before the messages are sent to the LLM provider.
2.  **Output Phase (`afterLLM`):** The `OutputSanitizer` cleans the response, and the `PiiRedactor` ensures the LLM has not inadvertently revealed sensitive information in its completion.

If an observability plugin is registered with the agent's `PluginHost`, security events (such as a blocked injection attempt or a PII detection) are automatically forwarded as logs and metrics.

## Configuration
Developers can configure security hooks either by using the high-level `securityHooks()` helper or by manually composing individual middleware hooks.

### Using the securityHooks Helper
The `securityHooks()` function provides a pre-wired configuration for the most common security components.

```ts
import { Agent, securityHooks } from 'yaaf';

const agent = new Agent({
  systemPrompt: 'You are a secure assistant.',
  // Enables PromptGuard, OutputSanitizer, and PiiRedactor with defaults
  hooks: securityHooks({
    promptGuard: { mode: 'block', sensitivity: 'high' },
    piiRedactor: { mode: 'redact', categories: ['email', 'api_key'] },
    outputSanitizer: { stripHtml: true }
  }),
});
```

### Manual Hook Composition
For more granular control, individual components can be instantiated and assigned to specific lifecycle hooks.

```ts
import { Agent, PromptGuard, PiiRedactor } from 'yaaf';

const guard = new PromptGuard({ mode: 'block', sensitivity: 'medium' });
const redactor = new PiiRedactor({ mode: 'redact' });

const agent = new Agent({
  hooks: {
    beforeLLM: async (messages) => {
      // Run prompt injection detection
      const guarded = await guard.hook()(messages);
      const msgs = guarded ?? messages;
      
      // Run PII redaction on the input
      return await redactor.beforeHook()(msgs) ?? msgs;
    },
    afterLLM: async (response, iteration) => {
      // Run PII redaction on the output
      return await redactor.afterHook()(response, iteration);
    },
  },
});
```

### PromptGuard Sensitivity Levels
The `PromptGuard` component supports three sensitivity levels:
*   `low`: Detects obvious instruction overrides.
*   `medium`: Adds detection for encoding attacks and delimiter escapes.
*   `high`: Adds role hijacking detection, system prompt extraction attempts, and deep content scanning.

### PiiRedactor Categories
The `PiiRedactor` can be configured to scan for specific categories, including `email`, `phone`, `ssn`, `credit_card`, `api_key`, `ipv4`, `ipv6`, `passport`, and `iban`. It also supports `customPatterns` using regular expressions.