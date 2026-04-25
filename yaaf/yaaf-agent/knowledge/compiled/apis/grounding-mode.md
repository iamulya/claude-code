---
title: GroundingMode
entity_type: api
summary: "Defines the operational modes for the GroundingValidator: 'warn', 'annotate', or 'strict'."
export_name: GroundingMode
source_file: src/security/groundingValidator.ts
category: type
search_terms:
 - grounding validator modes
 - anti-hallucination settings
 - how to configure grounding
 - strict mode grounding
 - warn mode grounding
 - annotate mode grounding
 - LLM response validation
 - fact-checking agent output
 - hallucination detection levels
 - grounding validator behavior
 - control ungrounded claims
 - response override on hallucination
 - agent response safety levels
stub: false
compiled_at: 2026-04-24T17:09:31.883Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/groundingValidator.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

`GroundingMode` is a TypeScript string literal type that specifies the behavior of a `GroundingValidator` [when](./when.md) it detects claims in an [LLM](../concepts/llm.md)'s response that are not supported by evidence from tool outputs. This allows developers to control the trade-off between permissiveness and strictness in handling potential hallucinations.

There are three possible modes [Source 1]:

*   **`warn`**: This is the default mode. If ungrounded claims are detected, a warning is logged, but the LLM's response is passed through to the user without any modification. This mode is useful for monitoring and [Observability](../concepts/observability.md) without impacting the user experience.
*   **`annotate`**: In this mode, the `GroundingValidator` modifies the LLM's response by inserting a marker, such as `[ungrounded]`, next to each sentence that it identifies as lacking sufficient evidence. This makes the potential lack of grounding visible to the end-user while preserving the original content.
*   **`strict`**: This is the most restrictive mode. If the fraction of grounded sentences in the response falls below a configurable `minCoverage` threshold, the entire response is discarded and replaced with a predefined `overrideMessage`. This mode is suitable for applications where preventing the display of unverified information is critical.

## Signature

`GroundingMode` is defined as a union of string literals.

```typescript
export type GroundingMode = "warn" | "annotate" | "strict";
```

It is used as a property within the `GroundingValidatorConfig` interface [Source 1]:

```typescript
import type { GroundingMode } from 'yaaf';

export type GroundingValidatorConfig = {
  /**
   * Validation mode:
   * - `warn` — log warning, pass response through (default)
   * - `annotate` — add [⚠️ ungrounded] markers to unverified sentences
   * - `strict` — override response if below threshold
   */
  mode?: GroundingMode;

  // ... other configuration properties
};
```

## Examples

The following examples demonstrate how to configure a `GroundingValidator` with each of the available modes.

### Warn Mode (Default)

If no mode is specified, the validator defaults to `'warn'`. This configuration will log any detected hallucinations but will not alter the agent's response.

```typescript
import { GroundingValidator } from 'yaaf';

// This validator will log warnings for ungrounded claims.
const validator = new GroundingValidator({
  mode: 'warn',
});
```

### Annotate Mode

This configuration will add `[ungrounded]` markers to sentences in the agent's response that are not supported by tool evidence.

```typescript
import { GroundingValidator } from 'yaaf';

// This validator will modify the response to flag ungrounded sentences.
const validator = new GroundingValidator({
  mode: 'annotate',
});
```

### Strict Mode

This configuration will replace the agent's entire response if less than 50% of its sentences are grounded in evidence.

```typescript
import { GroundingValidator } from 'yaaf';

// This validator will override responses that fail the grounding check.
const validator = new GroundingValidator({
  mode: 'strict',
  minCoverage: 0.5, // At least 50% of sentences must be grounded.
  overrideMessage: "I'm sorry, I cannot provide a reliable answer based on the available information."
});
```

## Sources

[Source 1]: src/security/groundingValidator.ts