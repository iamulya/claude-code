---
title: PromptGuardConfig
entity_type: api
summary: Defines the configuration options for the `PromptGuard` class, including mode, sensitivity, and custom patterns.
export_name: PromptGuardConfig
source_file: src/security/promptGuard.ts
category: type
search_terms:
 - prompt injection settings
 - configure prompt guard
 - prompt security options
 - block vs detect mode
 - prompt guard sensitivity levels
 - custom injection patterns
 - canary token configuration
 - prompt leakage detection
 - LLM classifier for prompt guard
 - onDetection callback
 - ADR-009
 - Layer 2 verification
 - classifyFn setup
 - security middleware config
 - injection detection rules
stub: false
compiled_at: 2026-04-24T17:29:55.227Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/promptGuard.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`PromptGuardConfig` is a TypeScript type alias that defines the configuration object for the `PromptGuard` class. It allows developers to customize the behavior of the [Prompt Injection](../concepts/prompt-injection.md) detection system, including its operational mode, the strictness of its pattern matching, and custom rules. [Source 1]

This configuration is passed to the `PromptGuard` constructor or the `promptGuard` factory function to create a customized security hook for an agent. [Source 1]

## Signature

`PromptGuardConfig` is an object type with the following properties:

```typescript
export type PromptGuardConfig = {
  /**
   * Detection mode:
   * - `detect` — log warnings, allow messages through (default)
   * - `block` — replace detected injection attempts with a sanitized message
   */
  mode?: PromptGuardMode;

  /**
   * Sensitivity level controls which patterns are checked:
   * - `low` — only obvious injection attempts (instruction overrides)
   * - `medium` — adds role hijacking, encoding attacks, delimiter escapes (default)
   * - `high` — adds extraction attempts, content scanning, multilanguage
   */
  sensitivity?: PromptGuardSensitivity;

  /**
   * Optional canary token to inject into the System Prompt.
   * If the canary appears in a user message, it indicates the System Prompt
   * was extracted (prompt leakage attack).
   */
  canaryToken?: string;

  /**
   * Additional custom patterns to detect.
   * Each pattern has a name, regex, and severity.
   */
  customPatterns?: PromptGuardPattern[];

  /**
   * Called [[[[[[[[when]]]]]]]] an injection attempt is detected.
   * Use for audit logging, alerting, or custom handling.
   */
  onDetection?: (event: PromptGuardEvent) => void;

  /**
   * Message to substitute when blocking in `block` mode.
   * Default: "[Message blocked: potential prompt injection detected]"
   */
  blockMessage?: string;

  /**
   * ADR-009: Optional [[[[[[[[LLM]]]]]]]] classifier function for Layer 2 verification.
   *
   * When provided, messages flagged by the regex pre-filter (Layer 1) are
   * sent to this function for semantic verification. If the LLM classifies
   * the input as 'safe', the regex detection is treated as a false positive.
   */
  classifyFn?: PromptGuardClassifyFn;
};
```
[Source 1]

### Properties

*   **`mode`** (`PromptGuardMode`, optional): Sets the operational mode.
    *   `'detect'`: (Default) Logs a warning when a potential injection is found but allows the message to proceed.
    *   `'block'`: Replaces any message containing a potential injection with the `blockMessage`. [Source 1]
*   **`sensitivity`** (`PromptGuardSensitivity`, optional): Controls the aggressiveness of the pattern matching.
    *   `'low'`: Checks only for direct instruction overrides.
    *   `'medium'`: (Default) Adds checks for role hijacking, encoding attacks, and delimiter escapes. Role hijacking patterns are included at this level as they are a common attack vector.
    *   `'high'`: Adds checks for [System Prompt](../concepts/system-prompt.md) extraction, payload scanning (e.g., `<script>` tags), and multi-language patterns. [Source 1]
*   **`canaryToken`** (`string`, optional): A secret string to be placed in the system prompt. If `PromptGuard` detects this token in user input, it signals a potential prompt leakage attack. [Source 1]
*   **`customPatterns`** (`PromptGuardPattern[]`, optional): An array of custom patterns to check for, allowing developers to extend the default detection rules. [Source 1]
*   **`onDetection`** (`(event: PromptGuardEvent) => void`, optional): A callback function that is executed whenever an injection attempt is detected. This is useful for custom logging, alerting, or other side effects. [Source 1]
*   **`blockMessage`** (`string`, optional): The message to use as a replacement when `mode` is set to `'block'`. The default is `"[Message blocked: potential prompt injection detected]"`. [Source 1]
*   **`classifyFn`** (`PromptGuardClassifyFn`, optional): A function for Layer 2 verification, as described in ADR-009. When a regex pattern (Layer 1) flags a message, this function can be used to pass the message to an LLM for a more nuanced, semantic classification. If the LLM determines the message is safe, the initial detection is overridden. This function can be created using the `createLLMClassifier` helper. [Source 1]

## Examples

### Basic Configuration

Creating a `PromptGuard` instance that blocks injections with high sensitivity.

```typescript
import { PromptGuard, PromptGuardConfig } from 'yaaf';

const config: PromptGuardConfig = {
  mode: 'block',
  sensitivity: 'high',
};

const guard = new PromptGuard(config);

// This guard can now be used in an agent's `beforeLLM` hook.
```
[Source 1]

### Advanced Configuration

Configuring a `PromptGuard` with custom patterns, a canary token, and a detection handler for logging.

```typescript
import { PromptGuard, PromptGuardConfig, PromptGuardEvent } from 'yaaf';

const advancedConfig: PromptGuardConfig = {
  mode: 'block',
  sensitivity: 'medium',
  canaryToken: 'SECRET_CANARY_TOKEN_12345',
  customPatterns: [
    {
      name: 'internal-api-key-leak',
      pattern: /prj_sk_[a-zA-Z0-9]+/,
      severity: 'high',
      description: 'Detects leakage of internal project secret keys.',
    },
  ],
  onDetection: (event: PromptGuardEvent) => {
    console.error('SECURITY ALERT: Potential prompt injection detected!', event);
    // Forward to a security information and event management (SIEM) system.
  },
  blockMessage: 'This message has been blocked due to a security policy violation.',
};

const customGuard = new PromptGuard(advancedConfig);
```
[Source 1]

## See Also

*   `PromptGuard`: The class that uses this configuration.
*   `promptGuard`: The factory function for creating a `PromptGuard` instance.
*   `PromptGuardMode`: Type for the `mode` property.
*   `PromptGuardSensitivity`: Type for the `sensitivity` property.
*   `PromptGuardPattern`: The structure for defining custom detection patterns.
*   `PromptGuardEvent`: The object passed to the `onDetection` callback.
*   `PromptGuardClassifyFn`: The function signature for the Layer 2 LLM classifier.

## Sources

[Source 1]: src/security/promptGuard.ts