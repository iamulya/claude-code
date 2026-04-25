---
title: strictPromptGuard
entity_type: api
summary: A factory function to create a `PromptGuard` instance configured for strict blocking of detected injections.
export_name: strictPromptGuard
source_file: src/security/promptGuard.ts
category: function
search_terms:
 - prompt injection blocking
 - secure agent configuration
 - block prompt attacks
 - strict security settings
 - factory for prompt guard
 - how to block injections
 - prevent prompt hacking
 - high security agent
 - default block mode guard
 - easy security setup
 - YAAF security
 - injection detection and blocking
stub: false
compiled_at: 2026-04-24T17:41:31.291Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/promptGuard.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `strictPromptGuard` function is a factory that creates and configures an instance of the `PromptGuard` class for high-security applications [Source 1]. It provides a convenient way to instantiate a [Prompt Injection](../concepts/prompt-injection.md) detector that is pre-configured to `block` any detected threats, rather than just logging them.

This function is intended for users who want a simple, secure-by-default setup. It enforces a `block` mode and uses a non-configurable sensitivity level, preventing accidental misconfiguration. [when](./when.md) a message is flagged as a potential injection, it is replaced with a sanitized placeholder message [Source 1].

Use `strictPromptGuard` when you need to enforce a strict policy against prompt injection attacks and prefer a simple setup over granular configuration of the guard's mode and sensitivity [Source 1]. For more control, you can instantiate the `PromptGuard` class directly or use the more flexible `promptGuard` factory function.

## Signature

The function accepts an optional configuration object and returns a `PromptGuard` instance. The `mode` and `sensitivity` properties are omitted from the configuration type, as they are set internally by the factory to enforce its strict policy [Source 1].

```typescript
export function strictPromptGuard(
  config?: Omit<PromptGuardConfig, "mode" | "sensitivity">,
): PromptGuard;
```

### Parameters

- **`config`** `Omit<PromptGuardConfig, "mode" | "sensitivity">` (optional): An object to configure the `PromptGuard` instance. All properties of `PromptGuardConfig` are available except for `mode` and `sensitivity`.
  - `canaryToken?: string`: A secret token to detect [System Prompt](../concepts/system-prompt.md) leakage.
  - `customPatterns?: PromptGuardPattern[]`: Additional custom regex patterns to detect.
  - `onDetection?: (event: PromptGuardEvent) => void`: A callback for logging or alerting when an injection is detected and blocked.
  - `blockMessage?: string`: A custom message to use when replacing a blocked prompt.
  - `classifyFn?: PromptGuardClassifyFn`: An optional [LLM](../concepts/llm.md)-based classifier for Layer 2 verification of potential threats.

### Returns

- `PromptGuard`: A configured instance of the `PromptGuard` class, ready to be used as a `beforeLLM` hook.

## Examples

The following example demonstrates how to create a strict prompt guard and integrate it into an agent's [Lifecycle Hooks](../concepts/lifecycle-hooks.md).

```typescript
import { Agent } from 'yaaf'; // Assuming Agent is a valid export
import { strictPromptGuard } from 'yaaf';

// 1. Create a guard that blocks injections with strict settings.
//    An onDetection callback is provided for logging purposes.
const guard = strictPromptGuard({
  onDetection: (event) => {
    console.error(`[SECURITY] Prompt injection blocked: ${event.patternName}`, event);
  },
  blockMessage: "[Content removed due to security policy]"
});

// 2. Create an agent and add the guard's hook to the `beforeLLM` lifecycle event.
const agent = new Agent({
  hooks: {
    // The hook() method returns a function that will be executed
    // before any call to the LLM.
    beforeLLM: guard.hook(),
  },
  // ... other agent configuration
});

// Now, any user input sent to this agent will be scanned, and
// malicious prompts will be blocked before reaching the LLM.
```

## See Also

- `PromptGuard`: The class that performs injection detection, which this function instantiates.
- `promptGuard`: A more flexible factory function for creating `PromptGuard` instances.
- `PromptGuardConfig`: The configuration type detailing all available options for a `PromptGuard`.

## Sources

[Source 1]: src/security/promptGuard.ts