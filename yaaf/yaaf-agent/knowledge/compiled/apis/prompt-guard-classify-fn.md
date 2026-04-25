---
title: PromptGuardClassifyFn
entity_type: api
summary: Defines the signature for an LLM-based classifier function used by `PromptGuard` for Layer 2 verification of suspicious inputs.
export_name: PromptGuardClassifyFn
source_file: src/security/promptGuard.ts
category: type
search_terms:
 - LLM-based injection detection
 - semantic verification for prompt injection
 - Layer 2 security check
 - how to use an LLM to classify prompts
 - PromptGuard classifier function
 - reduce false positives in PromptGuard
 - ADR-009 security
 - createLLMClassifier return type
 - asynchronous security classifier
 - safe suspicious malicious
 - prompt injection verifier
 - custom prompt injection logic
stub: false
compiled_at: 2026-04-24T17:29:46.324Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/promptGuard.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`PromptGuardClassifyFn` is a TypeScript type definition for an asynchronous function that classifies a given text input as "safe", "suspicious", or "malicious" [Source 1].

This function signature is used by the `PromptGuard` security middleware to implement an optional second layer of verification for potential [Prompt Injection](../concepts/prompt-injection.md) attacks. [when](./when.md) `PromptGuard`'s initial regex-based scan (Layer 1) flags a message as suspicious, it can pass the message content to a function of this type for a more nuanced, semantic analysis using an [LLM](../concepts/llm.md) [Source 1].

If the classifier function returns `"safe"`, the initial detection is treated as a false positive and is overridden. This allows for more accurate threat detection by reducing the number of false positives from static pattern matching. This feature is part of the system's [Defense-in-depth](../concepts/defense-in-depth.md) strategy, as outlined in ADR-009 [Source 1].

A function conforming to this type is provided in the `classifyFn` property of the `PromptGuardConfig` object. The `createLLMClassifier` factory function is the recommended way to create a compatible classifier from an existing LLM generation function [Source 1].

## Signature

The type is defined as an asynchronous function that takes a string and returns a promise resolving to one of three classification strings [Source 1].

```typescript
export type PromptGuardClassifyFn = (
  text: string
) => Promise<"safe" | "suspicious" | "malicious">;
```

### Parameters

-   `text` (`string`): The suspicious text content from a user message that needs to be classified.

### Return Value

-   `Promise<"safe" | "suspicious" | "malicious">`: A promise that resolves to one of the following classification verdicts:
    -   `"safe"`: The LLM has determined the input is not a threat. This verdict will override the Layer 1 regex detection [Source 1].
    -   `"suspicious"`: The LLM's analysis was inconclusive, or an error occurred. The system fails-closed, and the original Layer 1 detection is upheld [Source 1].
    -   `"malicious"`: The LLM has confirmed that the input is a likely prompt injection attempt [Source 1].

## Examples

The primary use case is to create a classifier using the `createLLMClassifier` helper and pass it to the `PromptGuard` constructor.

```typescript
import { Agent } from 'yaaf';
import { PromptGuard, createLLMClassifier } from 'yaaf';

// Assume 'model.generate' is an existing function that calls an LLM
declare const model: { generate: (prompt: string) => Promise<string> };

// Create a classifier function that conforms to the PromptGuardClassifyFn signature
const classifyWithLLM = createLLMClassifier(
  async (prompt) => model.generate(prompt)
);

// Configure PromptGuard to use this classifier for Layer 2 verification
const guard = new PromptGuard({
  mode: 'block',
  sensitivity: 'high',
  classifyFn: classifyWithLLM,
});

// Add the guard as a hook to the agent
const agent = new Agent({
  hooks: {
    beforeLLM: guard.hook(),
  },
});
```

## See Also

-   `PromptGuard`: The security middleware class that uses this function type.
-   `PromptGuardConfig`: The configuration object where a `PromptGuardClassifyFn` is provided.
-   `createLLMClassifier`: A factory function that creates a `PromptGuardClassifyFn` from a generic LLM generate function.

## Sources

[Source 1]: src/security/promptGuard.ts