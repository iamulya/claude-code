---
title: LLM-based Injection Classifiers
entity_type: concept
summary: A secondary defense layer for prompt injection that uses an LLM to semantically verify suspicious inputs flagged by initial filters.
related_subsystems:
 - security
search_terms:
 - prompt injection defense
 - semantic injection detection
 - layer 2 security
 - using LLM to detect attacks
 - how to reduce false positives in prompt guard
 - YAAF security layers
 - ADR-009
 - classifyFn
 - createLLMClassifier
 - semantic verification of user input
 - dual-layer prompt security
 - LLM as a judge
 - prompt guard false positives
stub: false
compiled_at: 2026-04-24T17:57:49.338Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/promptGuard.ts
compiled_from_quality: unknown
confidence: 1
---

## What It Is

An [LLM](./llm.md)-based Injection Classifier is a secondary, semantic defense layer against [Prompt Injection](./prompt-injection.md) attacks within YAAF [Source 1]. It is designed to be used in conjunction with a primary, pattern-based filter like `PromptGuard`. While pattern-based filters (Layer 1) are effective at catching common attack signatures using regular expressions, they can sometimes produce false positives by flagging benign user input that coincidentally matches a pattern [Source 1].

The LLM-based classifier (Layer 2) addresses this by using another LLM to analyze the intent and meaning of a message that has been flagged as suspicious by the primary filter. This provides a more nuanced, semantic verification, helping to distinguish between genuine attacks and harmless inputs, thereby increasing the accuracy of the overall [Security System](../subsystems/security-system.md) [Source 1]. This approach is recommended for high-security applications requiring [Defense-in-depth](./defense-in-depth.md) [Source 1].

## How It Works in YAAF

This mechanism is implemented as an optional component within the `PromptGuard` security subsystem, referred to as "Layer 2 verification" [Source 1].

[when](../apis/when.md) a developer configures `PromptGuard` with a classifier function, the detection process follows these steps:

1.  **Layer 1 Filtering**: `PromptGuard` first scans all incoming messages using its configured regex patterns. If a message matches a pattern, it is flagged as potentially malicious [Source 1].
2.  **Layer 2 Verification**: Instead of immediately acting on the flagged message, `PromptGuard` passes the suspicious text to the provided LLM classifier function (`classifyFn`) [Source 1].
3.  **Classification**: The classifier function sends the text to an LLM with a specialized prompt, asking it to classify the input as `"safe"`, `"suspicious"`, or `"malicious"` [Source 1].
4.  **Verdict and Action**:
    *   If the classifier returns `"safe"`, the initial regex detection is treated as a false positive. The detection event is discarded, and the original message is allowed to proceed. This is recorded as a `layer2Overrides` in the final result [Source 1].
    *   If the classifier returns `"malicious"`, the initial detection is confirmed, and `PromptGuard` takes its configured action (e.g., blocking the message) [Source 1].
    *   If the classifier returns `"suspicious"` or an error occurs, the system fails-closed. The initial detection is upheld to ensure security is prioritized [Source 1].

The result of this second-layer check is stored in the `layer2Verdict` field of the `PromptGuardEvent` for auditing purposes. If no classifier function is configured, this entire verification step is skipped [Source 1].

YAAF provides a helper utility, `createLLMClassifier`, which can wrap any standard LLM generation function into the `PromptGuardClassifyFn` type required by the configuration [Source 1].

## Configuration

An LLM-based classifier is enabled by providing a `classifyFn` in the `PromptGuardConfig`. The recommended way to create this function is by using the `createLLMClassifier` helper, which adapts an existing [LLM Client](./llm-client.md)'s generation method.

The following example demonstrates how to configure a `PromptGuard` instance to use an LLM for Layer 2 verification [Source 1].

```typescript
import { PromptGuard, createLLMClassifier } from 'yaaf';
import { model } from './my-llm-provider'; // An example LLM client

// Create a classifier function by wrapping the model's generate method.
const llmClassifier = createLLMClassifier(
  async (prompt: string) => model.generate(prompt)
);

// Configure PromptGuard to use the classifier.
const guard = new PromptGuard({
  mode: 'block',
  sensitivity: 'high',
  classifyFn: llmClassifier,
});

// This guard will now use the LLM to verify any detections
// before blocking a message.
```

In this configuration, when the regex-based `PromptGuard` detects a potential threat (e.g., an instruction override), it will not immediately block the message. Instead, it will invoke the `llmClassifier`, which in turn calls `model.generate()`. Only if the model confirms the input is malicious will the message be blocked [Source 1].

## Sources

[Source 1]: src/security/promptGuard.ts