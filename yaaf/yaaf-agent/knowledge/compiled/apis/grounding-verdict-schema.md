---
summary: Zod schema for validating the L3 grounding verdict returned by an LLM verifier.
export_name: GroundingVerdictSchema
source_file: src/knowledge/compiler/schemas.ts
category: const
title: GroundingVerdictSchema
entity_type: api
search_terms:
 - LLM verification schema
 - grounding validation
 - fact checking schema
 - supported unsupported uncertain
 - knowledge base compiler
 - zod schema for grounding
 - L3 grounding
 - LLM verifier output
 - validate grounding response
 - how to parse grounding verdict
 - schema for fact verification
 - zod enum validation
stub: false
compiled_at: 2026-04-24T17:10:06.909Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/schemas.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

`GroundingVerdictSchema` is a Zod schema used to validate the structure and content of a grounding verdict returned by an [LLM](../concepts/llm.md) verifier within the YAAF [Knowledge Base Compiler](../subsystems/knowledge-base-compiler.md) subsystem [Source 1].

This schema serves as a contract at the boundary between the YAAF framework and untrusted LLM output, ensuring that verification results are in a predictable format before further processing. It defines the possible outcomes of a Level 3 (L3) grounding check, which typically involves an LLM assessing whether a claim is supported by provided source material [Source 1].

The grounding pipeline is designed to fail-closed; if an LLM's response cannot be successfully parsed by this schema, the verdict is treated as 'uncertain' [Source 1].

## Signature

`GroundingVerdictSchema` is a `const` instance of a Zod object schema.

```typescript
import { z } from "zod";

export const GroundingVerdictSchema = z.object({
  verdict: z.enum(["supported", "unsupported", "uncertain"]),
  reason: z.string().max(500).optional(),
});
```

### Fields

- `verdict`: (Required) A string that must be one of `"supported"`, `"unsupported"`, or `"uncertain"`.
- `reason`: (Optional) A string of up to 500 characters explaining the rationale for the verdict.

### Inferred Type

The schema can be used to infer a TypeScript type for a valid grounding verdict object.

```typescript
import { z } from "zod";
import { GroundingVerdictSchema } from "yaaf";

export type GroundingVerdict = z.infer<typeof GroundingVerdictSchema>;

/*
Resulting type:
{
  verdict: "supported" | "unsupported" | "uncertain";
  reason?: string | undefined;
}
*/
```

## Examples

### Validating a "supported" verdict

The following example shows how to parse a valid verdict object where a claim is supported by the evidence.

```typescript
import { GroundingVerdictSchema } from "yaaf";

const llmOutput = {
  verdict: "supported",
  reason: "The claim is directly stated in paragraph 2 of Source A.",
};

try {
  const validatedVerdict = GroundingVerdictSchema.parse(llmOutput);
  console.log("Validation successful:", validatedVerdict);
  // Validation successful: { verdict: 'supported', reason: 'The claim is directly stated in paragraph 2 of Source A.' }
} catch (error) {
  console.error("Validation failed:", error);
}
```

### Validating an "unsupported" verdict without a reason

The `reason` field is optional, so a verdict without it is still valid.

```typescript
import { GroundingVerdictSchema } from "yaaf";

const llmOutput = {
  verdict: "unsupported",
};

try {
  const validatedVerdict = GroundingVerdictSchema.parse(llmOutput);
  console.log("Validation successful:", validatedVerdict);
  // Validation successful: { verdict: 'unsupported' }
} catch (error) {
  console.error("Validation failed:", error);
}
```

### Handling an invalid verdict

If the LLM returns a response that does not conform to the schema (e.g., an invalid `verdict` string), `parse` will throw an error.

```typescript
import { GroundingVerdictSchema } from "yaaf";

const invalidLlmOutput = {
  verdict: "maybe", // "maybe" is not a valid enum value
  reason: "The source is ambiguous.",
};

try {
  GroundingVerdictSchema.parse(invalidLlmOutput);
} catch (error) {
  console.error("Validation failed. The verdict should be handled as 'uncertain'.");
  // Validation failed. The verdict should be handled as 'uncertain'.
}
```

## Sources

[Source 1]: src/knowledge/compiler/schemas.ts