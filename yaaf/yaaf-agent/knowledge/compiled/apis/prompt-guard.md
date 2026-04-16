---
title: PromptGuard
entity_type: api
summary: A middleware class and hook provider for detecting and blocking prompt injection attacks in LLM interactions.
export_name: PromptGuard
source_file: src/security/promptGuard.ts
category: class
stub: false
compiled_at: 2026-04-16T14:35:00.480Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/security/promptGuard.ts
confidence: 1
---

## Overview
`PromptGuard` is a security middleware designed to protect LLM-powered agents from prompt injection and leakage attacks. It functions as a `beforeLLM` hook, scanning incoming message history for malicious patterns before they are sent to the model provider.

The class detects several categories of attacks:
*   **Instruction Overrides**: Attempts to bypass system instructions (e.g., "ignore previous instructions").
*   **Role Hijacking**: Attempts to force the AI into unauthorized personas (e.g., "act as an administrator").
*   **Encoding Attacks**: Instructions hidden via Base64, Unicode tricks, or other obfuscation methods.
*   **Delimiter Escapes**: Attempts to break out of structured data formats like XML or Markdown.
*   **System Prompt Extraction**: Attempts to trick the model into revealing its internal configuration or system prompt.
*   **Payload Injection**: Embedded scripts, SQL injection markers, or malicious code snippets.
*   **Canary Token Detection**: Verifies if a unique "canary" string from the system prompt has been leaked into a user response.

`PromptGuard` operates in two primary modes:
1.  **detect**: Flags suspicious messages and triggers callbacks but allows the original message to proceed.
2.  **block**: Replaces suspicious content with a sanitized placeholder message to prevent the attack from reaching the LLM.

## Signature / Constructor

### Constructor
```typescript
constructor(config?: PromptGuardConfig)
```

### Configuration Types

#### PromptGuardConfig
```typescript
export type PromptGuardConfig = {
  /**
   * Detection mode:
   * - `detect` — log warnings, allow messages through (default)
   * - `block` — replace detected injection attempts with a sanitized message
   */
  mode?: PromptGuardMode

  /**
   * Sensitivity level controls which patterns are checked:
   * - `low` — only obvious injection attempts (instruction overrides)
   * - `medium` — adds encoding attacks, delimiter escapes (default)
   * - `high` — adds role hijacking, extraction attempts, content scanning
   */
  sensitivity?: PromptGuardSensitivity

  /**
   * Optional canary token to inject into the system prompt.
   */
  canaryToken?: string

  /**
   * Additional custom patterns to detect.
   */
  customPatterns?: PromptGuardPattern[]

  /**
   * Called when an injection attempt is detected.
   */
  onDetection?: (event: PromptGuardEvent) => void

  /**
   * Message to substitute when blocking in `block` mode.
   * Default: "[Message blocked: potential prompt injection detected]"
   */
  blockMessage?: string
}
```

#### Supporting Types
*   **PromptGuardSensitivity**: `'low' | 'medium' | 'high'`
*   **PromptGuardMode**: `'detect' | 'block'`
*   **PromptGuardPattern**: An object containing a `name`, a `pattern` (RegExp), a `severity`, and an optional `description`.

## Methods & Properties

### hook()
Returns a hook function compatible with the `beforeLLM` agent lifecycle event. This hook processes the conversation history and applies detection or blocking logic based on the instance configuration.

### promptGuard(config)
A factory function that creates a `PromptGuard` instance with sensible production defaults.

### strictPromptGuard(config)
A factory function that creates a `PromptGuard` instance pre-configured with `mode: 'block'` and `sensitivity: 'high'`.

## Events
The `PromptGuard` triggers the `onDetection` callback with a `PromptGuardEvent` object when suspicious content is identified.

### PromptGuardEvent
| Property | Type | Description |
| :--- | :--- | :--- |
| `patternName` | `string` | The name of the detected attack pattern. |
| `severity` | `string` | The severity level (`low`, `medium`, `high`). |
| `messageRole` | `string` | The role of the message (e.g., 'user') that triggered the detection. |
| `messageIndex` | `number` | The position of the message in the conversation array. |
| `matchExcerpt` | `string` | A truncated excerpt of the content that matched the pattern. |
| `action` | `string` | The action taken: `'detected'` or `'blocked'`. |
| `timestamp` | `Date` | When the detection occurred. |

## Examples

### Basic Usage
```typescript
import { PromptGuard, Agent } from 'yaaf';

const guard = new PromptGuard({ 
  mode: 'block', 
  sensitivity: 'high' 
});

const agent = new Agent({
  hooks: {
    beforeLLM: guard.hook(),
  },
});
```

### Custom Detection and Logging
```typescript
import { promptGuard } from 'yaaf';

const guard = promptGuard({
  onDetection: (event) => {
    console.warn(`Security Alert: ${event.patternName} detected in ${event.messageRole} message.`);
  },
  customPatterns: [
    {
      name: 'Internal Project Code Leak',
      pattern: /PROJECT_PHOENIX_[0-9]+/i,
      severity: 'high'
    }
  ]
});
```

### Strict Mode
```typescript
import { strictPromptGuard } from 'yaaf';

const agent = new Agent({
  hooks: {
    beforeLLM: strictPromptGuard().hook()
  }
});
```