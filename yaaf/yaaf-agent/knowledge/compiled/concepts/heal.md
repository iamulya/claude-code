---
summary: A Phase C feature in YAAF that leverages LLM calls to automatically resolve issues, such as contradictions detected in the Knowledge Base.
title: Heal
entity_type: concept
related_subsystems:
 - subsystems/knowledge-compiler-contradiction-detection
see_also:
 - concepts/phase-c-features
 - concepts/knowledge-compiler-contradiction-detection
 - apis/llm-call-fn
 - apis/fence-content
 - concepts/negation-contradiction
 - concepts/numeric-disagreement
 - concepts/temporal-conflict
search_terms:
 - automatic contradiction resolution
 - LLM-based correction
 - self-healing agent
 - knowledge base repair
 - Phase C features
 - auto-fixing knowledge
 - resolve numeric disagreements
 - fix temporal conflicts
 - correct negation contradictions
 - heal pass
 - LLM data correction
 - automated content validation
stub: false
compiled_at: 2026-04-25T00:19:47.174Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/contradictions.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/llmClient.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/utils.ts
compiled_from_quality: unknown
confidence: 1
---

## What It Is

Heal is a [Phase C feature](./phase-c-features.md) within the YAAF framework designed to automatically correct or improve agent-related data using [LLM](./llm.md) calls [Source 2]. Its primary documented application is as an "LLM-powered heal pass" that attempts to resolve inconsistencies found within the YAAF Knowledge Base [Source 1].

This feature is invoked after a detection pass, such as the [Knowledge Compiler Contradiction Detection](../subsystems/knowledge-compiler-contradiction-detection.md) subsystem, identifies potential issues. The Heal process is responsible for the resolution step, whereas other components are responsible for detection. Examples of issues Heal can be tasked to resolve include [Source 1]:
*   [Negation Contradiction](./negation-contradiction.md): Sentences that appear to state opposite facts.
*   [Numeric Disagreement](./numeric-disagreement.md): Conflicting numerical claims about the same entity.
*   [Temporal Conflict](./temporal-conflict.md): Discrepancies in dates or timelines related to the same concept.

## How It Works in YAAF

The Heal feature functions by invoking an [LLM](./llm.md) to analyze and resolve identified problems. It is one of several [Phase C features](./phase-c-features.md) that utilize a common, simplified interface for making language model calls [Source 2].

The core mechanism involves the [LLMCallFn](../apis/llm-call-fn.md), a function type that provides a standard text-in, text-out interface for interacting with an LLM provider [Source 2]. The Heal logic formulates a prompt describing the detected issue (e.g., two contradictory claims) and sends it to the LLM via this function to get a corrected or resolved version.

For security, prompts sent by the Heal feature utilize the [fenceContent](../apis/fence-content.md) utility. This function wraps untrusted content, such as text from knowledge base articles, inside a cryptographically random delimiter. This prevents prompt injection attacks where the content itself might contain text that could be misinterpreted by the [LLM](./llm.md) as a new instruction [Source 3].

The typical workflow is:
1.  The [Knowledge Compiler Contradiction Detection](../subsystems/knowledge-compiler-contradiction-detection.md) system scans compiled articles and produces a report of potential contradictions [Source 1].
2.  The Heal pass is initiated, taking the contradiction report as input.
3.  For each contradiction, Heal constructs a "heal prompt," securely fencing the conflicting claims using [fenceContent](../apis/fence-content.md) [Source 3].
4.  It uses an [LLMCallFn](../apis/llm-call-fn.md) to ask an [LLM](./llm.md) to resolve the discrepancy [Source 2].
5.  The LLM's response is then used to update the knowledge base content.

## Configuration

While the Heal feature itself does not expose a direct configuration interface, its behavior is indirectly configured through the setup of the underlying LLM client it uses. The `makeKBLLMClient` function, which creates the [LLMCallFn](../apis/llm-call-fn.md) used by Heal, accepts options to specify the provider, model, and API key [Source 2].

```typescript
// Example of configuring the LLM client used by Phase C features like Heal
import { makeKBLLMClient } from './knowledge/compiler/llmClient';

const llmClientOptions = {
  provider: "anthropic",
  model: "claude-3-opus-20240229",
  apiKey: process.env.ANTHROPIC_API_KEY,
};

// This client would be passed to or used by the Heal process
const llm = makeKBLLMClient(llmClientOptions);
```

## See Also

*   [Phase C features](./phase-c-features.md)
*   [Knowledge Compiler Contradiction Detection](../subsystems/knowledge-compiler-contradiction-detection.md)
*   [LLMCallFn](../apis/llm-call-fn.md)
*   [fenceContent](../apis/fence-content.md)
*   [Negation Contradiction](./negation-contradiction.md)
*   [Numeric Disagreement](./numeric-disagreement.md)
*   [Temporal Conflict](./temporal-conflict.md)

## Sources

*   [Source 1]: `src/knowledge/compiler/contradictions.ts`
*   [Source 2]: `src/knowledge/compiler/llmClient.ts`
*   [Source 3]: `src/knowledge/compiler/utils.ts`