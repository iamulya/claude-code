---
title: PromptGuardMode
entity_type: api
summary: "Defines the operational modes for `PromptGuard`: `detect` or `block`."
export_name: PromptGuardMode
source_file: src/security/promptGuard.ts
category: type
search_terms:
 - prompt guard modes
 - detect vs block
 - prompt injection handling
 - how to configure PromptGuard
 - security middleware modes
 - block malicious prompts
 - detect prompt injection
 - PromptGuardConfig mode
 - YAAF security settings
 - agent input filtering
 - sanitizing user input
stub: false
compiled_at: 2026-04-24T17:30:03.008Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/promptGuard.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`PromptGuardMode` is a TypeScript string literal type that specifies the operational behavior of the `PromptGuard` security middleware [when](./when.md) it identifies a potential [Prompt Injection](../concepts/prompt-injection.md) attempt. This setting allows developers to choose between passively monitoring for threats or actively blocking them [Source 1].

The mode is configured via the `mode` property in the `PromptGuardConfig` object passed to the `PromptGuard` constructor. The two available modes are:

-   **`detect`**: In this mode, `PromptGuard` identifies and logs suspicious messages but allows them to pass through to the [LLM](../concepts/llm.md) unmodified. This is the default behavior and is useful for monitoring, testing, or when a less intrusive security posture is desired [Source 1].
-   **`block`**: In this mode, `PromptGuard` replaces any message that triggers a detection with a sanitized, static message. This prevents the potentially malicious content from ever reaching the LLM, providing a stronger security guarantee for production environments [Source 1].

## Signature

`PromptGuardMode` is defined as a union of two string literals [Source 1].

```typescript
export type PromptGuardMode = "detect" | "block";
```

### Modes

| Value      | Description                                                                                                                            |
| :--------- | :------------------------------------------------------------------------------------------------------------------------------------- |
| `'detect'` | Logs a warning for suspicious messages but allows them to proceed. This is the default mode [Source 1].                                  |
| `'block'`  | Replaces suspicious messages with a sanitized placeholder, preventing them from reaching the LLM. The placeholder can be customized [Source 1]. |

## Examples

The following examples demonstrate how to configure the `PromptGuard` with different modes.

### Block Mode (Recommended for Production)

This example configures `PromptGuard` to actively block any detected prompt injection attempts.

```typescript
import { Agent, PromptGuard } from 'yaaf';

// Create a guard that will block malicious messages.
const guard = new PromptGuard({
  mode: 'block',
  sensitivity: 'high',
});

const agent = new Agent({
  hooks: {
    beforeLLM: guard.hook(),
  },
});
```

### Detect Mode (For Monitoring)

This example configures `PromptGuard` to only log detections, which is useful for observing potential attacks without interfering with the agent's operation. This is the default behavior if `mode` is not specified.

```typescript
import { Agent, PromptGuard, PromptGuardEvent } from 'yaaf';

const handleDetection = (event: PromptGuardEvent) => {
  console.warn('Prompt injection detected:', event);
  // Send to an external logging or alerting service.
};

// Create a guard that only detects and logs.
const guard = new PromptGuard({
  mode: 'detect', // This is the default, but shown for clarity
  onDetection: handleDetection,
});

const agent = new Agent({
  hooks: {
    beforeLLM: guard.hook(),
  },
});
```

## See Also

-   `PromptGuard`: The security middleware class that uses this mode.
-   `PromptGuardConfig`: The configuration object for `PromptGuard`.
-   `PromptGuardSensitivity`: A type for configuring the detection strictness.

## Sources

[Source 1]: src/security/promptGuard.ts