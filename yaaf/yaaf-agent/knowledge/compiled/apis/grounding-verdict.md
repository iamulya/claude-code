---
summary: TypeScript type inferred from GroundingVerdictSchema, representing the verdict of an LLM grounding process.
export_name: GroundingVerdict
source_file: src/knowledge/compiler/schemas.ts
category: type
title: GroundingVerdict
entity_type: api
search_terms:
 - LLM verification result
 - knowledge base grounding
 - fact checking type
 - supported unsupported uncertain
 - grounding pipeline output
 - LLM verifier schema
 - knowledge compiler validation
 - how to check if a claim is supported
 - grounding verdict schema
 - type for grounding result
 - YAAF knowledge base
stub: false
compiled_at: 2026-04-24T17:09:52.294Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/schemas.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

The `GroundingVerdict` type represents the [Structured Output](../concepts/structured-output.md) from the [LLM](../concepts/llm.md) verifier within the YAAF [Knowledge Base Compiler](../subsystems/knowledge-base-compiler.md) [Source 1]. It is used to classify whether a claim or piece of information is supported by the provided source materials.

This type is the result of a "grounding" process, where an LLM is tasked with fact-checking a statement against a set of documents. The verdict can be `supported`, `unsupported`, or `uncertain`. The `uncertain` state serves as a fail-closed mechanism; if the LLM's response cannot be parsed or is otherwise ambiguous, the grounding pipeline defaults to this verdict [Source 1].

`GroundingVerdict` is a TypeScript type automatically inferred from the `GroundingVerdictSchema` Zod schema, which ensures that all data from the LLM verifier is validated before being used by the system [Source 1].

## Signature

`GroundingVerdict` is derived from the `GroundingVerdictSchema` Zod schema [Source 1].

```typescript
import { z } from "zod";

export const GroundingVerdictSchema = z.object({
  verdict: z.enum(["supported", "unsupported", "uncertain"]),
  reason: z.string().max(500).optional(),
});

export type GroundingVerdict = z.infer<typeof GroundingVerdictSchema>;
```

The resulting TypeScript type is:

```typescript
type GroundingVerdict = {
  verdict: "supported" | "unsupported" | "uncertain";
  reason?: string;
};
```

## Properties

*   **`verdict`**: `"supported" | "unsupported" | "uncertain"`
    The core classification from the LLM verifier.
    *   `"supported"`: The claim is directly supported by the provided source material.
    *   `"unsupported"`: The claim is contradicted by or not found in the source material.
    *   `"uncertain"`: The LLM could not confidently determine the validity of the claim, or its response failed to parse.

*   **`reason`**: `string | undefined`
    An optional, human-readable explanation from the LLM detailing why it reached its verdict. The string is limited to a maximum of 500 characters [Source 1].

## Examples

### Supported Verdict

A verdict indicating a claim was successfully verified against its sources.

```typescript
import type { GroundingVerdict } from 'yaaf';

const supportedVerdict: GroundingVerdict = {
  verdict: "supported",
  reason: "The claim is directly stated in paragraph 3 of Source Document A."
};
```

### Unsupported Verdict

A verdict indicating a claim was contradicted by the sources.

```typescript
import type { GroundingVerdict } from 'yaaf';

const unsupportedVerdict: GroundingVerdict = {
  verdict: "unsupported",
  reason: "Source Document B explicitly states the opposite of the claim."
};
```

### Uncertain Verdict

A verdict used [when](./when.md) the LLM cannot make a clear determination or when parsing fails.

```typescript
import type { GroundingVerdict } from 'yaaf';

const uncertainVerdict: GroundingVerdict = {
  verdict: "uncertain",
  reason: "The source material is ambiguous and does not provide enough context to confirm or deny the claim."
};
```

## Sources

[Source 1] `src/knowledge/compiler/schemas.ts`