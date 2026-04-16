---
title: Prompt Injection Protection
entity_type: concept
summary: Strategies and patterns used in YAAF to mitigate malicious prompt overrides, role hijacking, and data leakage.
related_subsystems:
  - security
  - agents
stub: false
compiled_at: 2026-04-16T14:35:05.866Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/security/promptGuard.ts
confidence: 0.95
---

## What It Is
Prompt Injection Protection in YAAF is a security layer designed to defend LLM-powered agents against adversarial inputs. These inputs, known as prompt injections, attempt to subvert the agent's intended behavior by overriding system instructions, hijacking the agent's persona, or extracting sensitive configuration data, a process known as prompt leakage.

YAAF provides these protections to ensure that agents remain within their defined operational boundaries and do not execute unauthorized commands or leak internal logic when processing untrusted user input.

## How It Works in YAAF
The primary implementation of this concept is the `PromptGuard` middleware, located in the `security/promptGuard` module. It operates as a `beforeLLM` hook within the agent's execution lifecycle, allowing it to intercept and analyze the conversation history before it is dispatched to the Language Model.

`PromptGuard` utilizes pattern matching and heuristic analysis to identify several categories of attacks:

*   **Instruction Overrides:** Detection of phrases intended to bypass existing constraints, such as "ignore previous instructions" or "you are now a [new role]".
*   **Role Hijacking:** Attempts to force the AI into a new persona using phrases like "act as" or "pretend you are".
*   **Encoding Attacks:** Identification of instructions hidden within Base64 encoding or Unicode-based obfuscation.
*   **Delimiter Escapes:** Detection of attempts to break out of structural boundaries, such as XML tags or Markdown blocks, used to isolate user input.
*   **System Prompt Extraction:** Identification of queries designed to reveal the agent's internal instructions (e.g., "repeat your system prompt").
*   **Payload Injection:** Scanning for embedded malicious payloads, including `<script>` tags, `javascript:` URIs, or SQL injection markers.
*   **Canary Token Detection:** A specialized defense where a unique, hidden string (a "canary") is placed in the system prompt. If this token is detected in a user message, it indicates that the system prompt has been successfully extracted or manipulated.

### Operational Modes
The framework supports two primary modes of operation:
*   **detect:** Flags suspicious messages and triggers the `onDetection` callback for logging or auditing, but allows the message to pass through to the LLM.
*   **block:** Flags suspicious messages and replaces the offending content with a sanitized `blockMessage` before it reaches the LLM.

## Configuration
Developers configure protection by passing a `PromptGuardConfig` object to the `PromptGuard` class or the `promptGuard()` factory function. The `sensitivity` level determines which patterns are active:

*   `low`: Only checks for obvious instruction overrides.
*   `medium`: Adds checks for encoding attacks and delimiter escapes (default).
*   `high`: Adds checks for role hijacking, extraction attempts, and general content scanning.

### Example Configuration
```typescript
import { PromptGuard, Agent } from 'yaaf';

const guard = new PromptGuard({
  mode: 'block',
  sensitivity: 'high',
  canaryToken: 'MY_HIDDEN_CANARY_TOKEN',
  onDetection: (event) => {
    console.error(`Security Alert: ${event.patternName} detected from ${event.messageRole}`);
  },
  blockMessage: "[Security Trigger: This message has been redacted.]"
});

const agent = new Agent({
  hooks: {
    beforeLLM: guard.hook(),
  },
});
```

The framework also provides a `strictPromptGuard()` helper function, which initializes a guard pre-configured to `block` mode with high sensitivity.

## Sources
* `src/security/promptGuard.ts`