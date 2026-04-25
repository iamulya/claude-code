---
title: PromptGuard
entity_type: api
summary: A `beforeLLM` hook that detects common prompt injection patterns and can block or flag suspicious messages.
export_name: PromptGuard
source_file: src/security/promptGuard.ts
category: class
search_terms:
 - prompt injection detection
 - how to prevent prompt injection
 - security middleware for LLMs
 - instruction override attack
 - role hijacking
 - system prompt leakage
 - canary token
 - LLM input sanitization
 - regex-based security
 - LLM classifier for injection
 - defense in depth for agents
 - block malicious prompts
 - detect suspicious user input
 - input filtering
stub: false
compiled_at: 2026-04-24T17:29:46.856Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/promptGuard.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/promptGuard.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`PromptGuard` is a security middleware class designed to detect and mitigate [Prompt Injection](../concepts/prompt-injection.md) attacks before they reach the Large Language Model ([LLM](../concepts/llm.md)). It functions as a `beforeLLM` hook within an agent's lifecycle, scanning chat messages for common malicious patterns. [Source 1, 2]

It can identify several categories of attacks:
- **Instruction Overrides**: Attempts to make the model ignore its original instructions (e.g., "ignore previous instructions").
- **Role Hijacking**: Attempts to make the model adopt a different persona (e.g., "act as...").
- **Encoding Attacks**: Use of base64 or other encodings to hide malicious instructions.
- **Delimiter Escapes**: Attempts to break out of structured data formats like XML or Markdown.
- **[System Prompt](../concepts/system-prompt.md) Extraction**: Attempts to leak the agent's core instructions.
- **Payload Injection**: Embedding of potentially harmful content like `<script>` tags or SQL fragments.
- **Canary Token Detection**: Checks if a secret token placed in the system prompt has been leaked into user input.
- **Homoglyph Normalization**: Normalizes visually similar Unicode characters to prevent evasion.
- **Multi-language Detection**: Detects injection patterns in non-English text. [Source 1, 2]

`PromptGuard` operates in two primary modes:
- **`detect`**: Logs a warning [when](./when.md) a suspicious pattern is found but allows the message to proceed.
- **`block`**: Replaces the suspicious message with a sanitized placeholder, preventing it from reaching the LLM. [Source 1, 2]

As a regex-based defense layer, `PromptGuard` provides a strong first line of defense. For high-security applications, it is recommended to use it as part of a [Defense-in-depth](../concepts/defense-in-depth.md) strategy, layered with other security measures like LLM-based classifiers, anomaly detection, and strict tool permissions. [Source 1, 2]

## Constructor

The `PromptGuard` class is instantiated with a configuration object that customizes its behavior.

```typescript
import type { PromptGuardConfig } from 'yaaf';

const guard = new PromptGuard(config?: PromptGuardConfig);
```

### `PromptGuardConfig`

The constructor accepts an optional `PromptGuardConfig` object with the following properties:

| Property | Type | Description |
| --- | --- | --- |
| `mode` | `"detect" \| "block"` | Sets the operational mode. `detect` logs warnings (default), while `block` replaces malicious messages. [Source 1, 2] |
| `sensitivity` | `"low" \| "medium" \| "high"` | Controls the strictness of the pattern matching. `low` checks for basic instruction overrides. `medium` (default) adds role hijacking and encoding attacks. `high` includes all checks, such as content scanning and multi-language detection. [Source 1, 2] |
| `canaryToken` | `string` | An optional secret token to inject into the system prompt. If this token appears in user input, it signals a prompt leakage attack. [Source 1, 2] |
| `customPatterns` | `PromptGuardPattern[]` | An array of custom regex patterns to detect, each with a name, pattern, and severity. [Source 1, 2] |
| `onDetection` | `(event: PromptGuardEvent) => void` | A callback function invoked whenever an injection attempt is detected. Useful for logging, auditing, or alerting. [Source 1, 2] |
| `blockMessage` | `string` | A custom message to use as a replacement when a message is blocked in `block` mode. Defaults to `"[Message blocked: potential prompt injection detected]"`. [Source 1, 2] |
| `classifyFn` | `PromptGuardClassifyFn` | An optional LLM-based classifier function for Layer 2 verification. When a regex pattern (Layer 1) flags a message, this function can perform a semantic check to reduce false positives. Use the `createLLMClassifier` helper to create one. [Source 1, 2] |

## Methods & Properties

### `hook()`

Returns a `beforeLLM` hook function that can be passed to an `Agent`'s configuration. This method integrates the `PromptGuard` instance into the agent's request lifecycle.

```typescript
public hook(): (messages: ChatMessage[]) => Promise<ChatMessage[]>;
```

## Events

When a potential injection is detected, `PromptGuard` can trigger the `onDetection` callback, passing a `PromptGuardEvent` object with details about the incident.

### `PromptGuardEvent`

| Property | Type | Description |
| --- | --- | --- |
| `patternName` | `string` | The human-readable name of the pattern that was matched. |
| `severity` | `"low" \| "medium" \| "high"` | The severity level of the detected pattern. |
| `messageRole` | `string` | The role of the message that triggered the detection (e.g., "user"). |
| `messageIndex` | `number` | The index of the suspicious message within the conversation history. |
| `matchExcerpt` | `string` | A truncated excerpt of the content that matched the pattern. |
| `action` | `"detected" \| "blocked"` | The action taken by `PromptGuard` in response to the detection. |
| `timestamp` | `Date` | The timestamp of when the detection occurred. |
| `layer2Verdict` | `"safe" \| "suspicious" \| "malicious"` | The verdict from the optional Layer 2 LLM classifier. `undefined` if `classifyFn` was not used. A verdict of `"safe"` indicates the LLM overrode the regex detection as a false positive. [Source 1, 2] |

## Examples

### Basic Usage (Block Mode)

This example creates a `PromptGuard` in `block` mode with `high` sensitivity and integrates it into an agent.

```typescript
import { Agent, PromptGuard } from 'yaaf';

// Create a guard that blocks high-sensitivity threats.
const guard = new PromptGuard({ mode: 'block', sensitivity: 'high' });

const agent = new Agent({
  // ... other agent config
  hooks: {
    beforeLLM: [guard.hook()],
  },
});
```

### Custom Logging with `onDetection`

This example demonstrates how to use the `onDetection` callback for custom audit logging.

```typescript
import { PromptGuard } from 'yaaf';
import type { PromptGuardEvent } from 'yaaf';

function logSuspiciousActivity(event: PromptGuardEvent) {
  console.warn('Prompt injection attempt detected:', {
    pattern: event.patternName,
    severity: event.severity,
    action: event.action,
    timestamp: event.timestamp.toISOString(),
  });
}

const guard = new PromptGuard({
  mode: 'detect', // Log only
  onDetection: logSuspiciousActivity,
});
```

### Using a Layer 2 LLM Classifier

This example shows how to add a second layer of verification using an LLM-based classifier to reduce false positives from the initial regex scan.

```typescript
import { Agent, PromptGuard, createLLMClassifier } from 'yaaf';
import { myLLM } from './my-llm-provider';

// Create a classifier function from an existing LLM generate function.
const classifyFn = createLLMClassifier(myLLM.generate);

const guard = new PromptGuard({
  mode: 'block',
  sensitivity: 'high',
  // Add the LLM classifier for Layer 2 verification.
  classifyFn: classifyFn,
});

const agent = new Agent({
  hooks: {
    beforeLLM: [guard.hook()],
  },
});
```

## See Also

- `promptGuard`: A factory function for creating `PromptGuard` instances.
- `strictPromptGuard`: A factory function for creating a pre-configured `PromptGuard` in `block` mode.
- `createLLMClassifier`: A helper function to create a Layer 2 classifier for `PromptGuard`.

## Sources

[Source 1] src/security/promptGuard.ts
[Source 2] src/security/promptGuard.ts