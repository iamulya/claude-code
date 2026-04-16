---
summary: Interface representing the outcome of a grounding validation process, including scores and unsupported claims.
export_name: GroundingResult
source_file: src/knowledge/compiler/validator.ts
category: interface
title: GroundingResult
entity_type: api
stub: false
compiled_at: 2026-04-16T14:27:22.121Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/validator.ts
confidence: 0.95
---

## Overview
`GroundingResult` is an interface that defines the structure of the data returned by the grounding validation process within the YAAF knowledge compiler. It is primarily used during Phase 5C (Post-Synthesis Validation) to assess whether a synthesized article is accurately supported by its source materials.

The validation process uses keyword overlap scoring to detect potential hallucinations or unsupported claims without requiring an additional LLM call. The `GroundingResult` provides both a quantitative score and a list of specific claims that failed the validation threshold.

## Signature
```typescript
export interface GroundingResult {
  score: number
  totalClaims: number
  supportedClaims: number
  unsupportedClaims: string[]
  warnings: string[]
}
```

## Methods & Properties
- **`score`**: A number between 0 and 1 representing the percentage of article claims backed by source material (e.g., `0.85` for 85% grounding).
- **`totalClaims`**: The total number of sentences or claims analyzed within the synthesized article.
- **`supportedClaims`**: The count of claims that met or exceeded the keyword overlap threshold when compared against the source texts.
- **`unsupportedClaims`**: An array of strings containing the specific sentences from the article that were identified as potentially ungrounded or hallucinated.
- **`warnings`**: An array of summary warnings generated during the validation process.

## Examples
The following example demonstrates how a `GroundingResult` is produced by the `validateGrounding` function.

```typescript
import { validateGrounding, GroundingResult } from './knowledge/compiler/validator';

const articleBody = "YAAF is a TypeScript-first framework. It was released in 2024.";
const sourceTexts = [
  "YAAF is a framework built with TypeScript for production-grade agents."
];

// Validate with a 30% keyword overlap threshold
const result: GroundingResult = validateGrounding(articleBody, sourceTexts, 0.3);

console.log(`Grounding Score: ${result.score}`); 
// If "It was released in 2024" is not in sources, score would be 0.5

if (result.unsupportedClaims.length > 0) {
  console.log("The following claims are unsupported:", result.unsupportedClaims);
}
```

## See Also
- `validateGrounding` (function)