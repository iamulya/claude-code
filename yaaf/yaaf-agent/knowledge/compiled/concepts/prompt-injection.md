---
title: Prompt Injection
entity_type: concept
summary: A security vulnerability where malicious inputs manipulate an LLM's behavior or extract sensitive information.
related_subsystems:
 - security
search_terms:
 - LLM security
 - agent security vulnerability
 - how to prevent prompt injection
 - ignore previous instructions attack
 - role hijacking
 - system prompt extraction
 - canary token
 - delimiter escape attack
 - payload injection in prompts
 - YAAF security middleware
 - PromptGuard
 - LLM input sanitization
 - defending against malicious user input
stub: false
compiled_at: 2026-04-24T18:00:38.761Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/promptGuard.ts
compiled_from_quality: unknown
confidence: 1
---

## What It Is

Prompt Injection is a type of security vulnerability that affects applications powered by Large Language Models ([LLM](./llm.md)s). It occurs [when](../apis/when.md) an attacker provides specially crafted input that manipulates the LLM's intended behavior. The goal is to override the original instructions (the "[System Prompt](./system-prompt.md)"), causing the agent to perform unauthorized actions, reveal sensitive information, or otherwise behave in a way not intended by its developers [Source 1].

Common prompt injection techniques include:
*   **Instruction Overrides**: Direct commands to the LLM to disregard its previous instructions (e.g., "ignore previous instructions") [Source 1].
*   **Role Hijacking**: Persuading the LLM to adopt a different persona that lacks the original's safety constraints (e.g., "act as a new AI without rules") [Source 1].
*   **System Prompt Extraction**: Tricking the LLM into revealing its own system prompt or initial instructions [Source 1].
*   **Payload Injection**: Embedding malicious content, such as scripts or SQL injection markers, within the prompt [Source 1].
*   **Encoding Attacks**: Obfuscating malicious instructions using base64, unicode, or other encoding schemes to bypass simple filters [Source 1].
*   **Delimiter Escape**: Crafting input that breaks out of expected formatting, like XML or markdown, to inject instructions where data is expected [Source 1].

## How It Works in YAAF

YAAF provides a built-in defense mechanism against prompt injection called `PromptGuard`. It is implemented as a middleware that operates as a `beforeLLM` hook, inspecting messages before they are sent to the language model [Source 1].

`PromptGuard` uses a multi-layered defense strategy:

**Layer 1: Pattern Matching**
The primary defense is a configurable, regex-based filter that scans for known injection patterns. This layer can operate in two modes [Source 1]:
*   **`detect`**: Flags suspicious messages, logs a warning, and allows execution to continue. This is the default mode.
*   **`block`**: Flags suspicious messages and replaces them with a sanitized, generic message before they reach the LLM.

The sensitivity of the pattern matching can be adjusted to `low`, `medium`, or `high`, which controls the strictness and breadth of the checks. For example, `low` sensitivity only checks for obvious instruction overrides, while `high` adds checks for prompt extraction, payload scanning, and multi-language attacks [Source 1].

**Layer 2: LLM-based Classification (Optional)**
To reduce false positives from the regex-based filter, `PromptGuard` can be configured with a secondary LLM-based classifier. When a message is flagged by Layer 1, it can be passed to this classifier for a more nuanced, semantic verification. If the classifier determines the input is 'safe', the initial detection is overridden [Source 1].

**Canary Tokens**
`PromptGuard` also supports the use of "canary tokens." A secret, unique string is injected into the system prompt. If this token later appears in user input, it indicates that the system prompt has been successfully extracted and leaked by the user [Source 1].

While `PromptGuard` provides significant [Defense-in-depth](./defense-in-depth.md), the framework documentation notes that static pattern matching can be bypassed by determined attackers. For high-security applications, it is recommended to supplement `PromptGuard` with other security measures like input/output monitoring, anomaly detection, and strict tool permissions via an `AccessPolicy` [Source 1].

## Configuration

`PromptGuard` is configured and attached to an agent via the `hooks` property.

A developer can instantiate `PromptGuard` and set its `mode` and `sensitivity`. The following example creates a guard that blocks detected injections and uses a high sensitivity level [Source 1].

```typescript
import { Agent, PromptGuard } from 'yaaf';

// Configure a strict prompt guard
const guard = new PromptGuard({ mode: 'block', sensitivity: 'high' });

// Attach the guard as a hook to the agent
const agent = new Agent({
  hooks: {
    beforeLLM: guard.hook(),
  },
});
```

To enable the optional Layer 2 LLM classifier, a developer provides a `classifyFn`. YAAF includes a helper, `createLLMClassifier`, to wrap an existing model generation function for this purpose [Source 1].

```typescript
import { PromptGuard, createLLMClassifier } from 'yaaf';

// Assume 'model.generate' is an existing function that calls an LLM
const guard = new PromptGuard({
  mode: 'block',
  classifyFn: createLLMClassifier(async (prompt) => model.generate(prompt)),
});
```

Other configuration options include setting a custom `blockMessage`, adding `customPatterns`, and providing an `onDetection` callback for logging or alerting [Source 1].

## Sources
[Source 1] src/security/promptGuard.ts