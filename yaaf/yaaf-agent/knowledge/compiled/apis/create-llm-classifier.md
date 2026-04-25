---
title: createLLMClassifier
entity_type: api
summary: A utility function to adapt any LLM `generateFn` into a `PromptGuardClassifyFn` for semantic verification of prompt injections.
export_name: createLLMClassifier
source_file: src/security/promptGuard.ts
category: function
search_terms:
 - LLM-based injection detection
 - semantic prompt verification
 - PromptGuard Layer 2
 - how to use an LLM to check for prompt injection
 - classifyFn for PromptGuard
 - ADR-009
 - wrap LLM for classification
 - false positive reduction
 - prompt injection classifier
 - security middleware
 - generateFn to classifier
 - semantic analysis of user input
stub: false
compiled_at: 2026-04-24T16:59:30.965Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/promptGuard.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `create[[[[[[[[LLM]]]]]]]]Classifier` function is a factory that adapts a generic Large Language Model (LLM) generation function into a specialized classifier for detecting prompt injections [Source 1]. It is a key component of the `PromptGuard` security subsystem's "Layer 2" verification mechanism, as outlined in ADR-009 [Source 1].

While `PromptGuard`'s primary defense (Layer 1) uses fast, regex-based pattern matching to flag potential threats, this can sometimes result in false positives. To address this, `createLLMClassifier` enables a second layer of defense. [when](./when.md) a message is flagged by Layer 1, it can be passed to the LLM-based classifier for a more nuanced, semantic analysis [Source 1].

The function wraps the provided `generateFn` with a dedicated prompt that instructs the LLM to classify the suspicious text as `"safe"`, `"suspicious"`, or `"malicious"`. If the LLM determines the input is `"safe"`, the initial regex-based detection is overridden, reducing false positives and improving the accuracy of the [Security System](../subsystems/security-system.md) [Source 1].

## Signature

```typescript
export function createLLMClassifier(
  generateFn: (prompt: string) => Promise<string>,
): PromptGuardClassifyFn;
```

**Parameters:**

*   `generateFn`: `(prompt: string) => Promise<string>`
    *   An asynchronous function that takes a string prompt and returns a promise that resolves to the LLM's generated text response. This can be the same LLM generation function used for the agent's primary synthesis tasks [Source 1].

**Returns:**

*   `PromptGuardClassifyFn`: `(text: string) => Promise<"safe" | "suspicious" | "malicious">`
    *   A function that conforms to the `PromptGuardClassifyFn` type. This returned function takes the suspicious text as input and uses the provided `generateFn` to get a classification from the LLM [Source 1].

## Examples

The most common use case is to configure a `PromptGuard` instance with a `classifyFn` for Layer 2 verification.

```typescript
import { PromptGuard, createLLMClassifier } from 'yaaf';
import { model } from './my-llm-provider'; // An example LLM instance

// Assume `model.generate` is a function: (prompt: string) => Promise<string>
const llmClassifier = createLLMClassifier(
  async (prompt) => model.generate(prompt)
);

const guard = new PromptGuard({
  mode: 'block',
  sensitivity: 'high',
  // Add the LLM classifier for Layer 2 verification
  classifyFn: llmClassifier,
});

// This guard can now be used in an agent's hooks.
// Messages flagged by regexes will be sent to the LLM for a second opinion.
```
[Source 1]

## See Also

*   `PromptGuard`: The security middleware that uses the classifier.
*   `PromptGuardConfig`: The configuration object for `PromptGuard`, where the `classifyFn` is set.
*   `PromptGuardClassifyFn`: The type definition for the classifier function returned by this factory.

## Sources

*   [Source 1]: `src/security/promptGuard.ts`