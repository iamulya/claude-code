---
summary: Validates that synthesized article claims are grounded in source material using keyword overlap scoring.
export_name: validateGrounding
source_file: src/knowledge/compiler/validator.ts
category: function
title: validateGrounding
entity_type: api
stub: false
compiled_at: 2026-04-16T14:27:19.424Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/validator.ts
confidence: 0.95
---

## Overview
`validateGrounding` is a post-synthesis validation utility used to ensure that generated content remains faithful to its source material. It operates during the final stages of the knowledge compilation pipeline (Phase 5C) to detect potential hallucinations. 

Unlike LLM-based validation, this function uses a keyword overlap scoring mechanism, making it a high-performance, cost-effective check that does not require external API calls. It analyzes the article body sentence-by-sentence and compares the lexical density against the provided source texts.

## Signature / Constructor

### Function Signature
```typescript
export function validateGrounding(
  articleBody: string,
  sourceTexts: string[],
  threshold: number = 0.3,
): GroundingResult
```

### Parameters
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `articleBody` | `string` | The markdown body of the synthesized article to be validated. |
| `sourceTexts` | `string[]` | An array of raw text contents from the original sources. |
| `threshold` | `number` | The minimum keyword overlap ratio (0.0 to 1.0) required to consider a claim "supported". Defaults to `0.3`. |

### GroundingResult Interface
The function returns a `GroundingResult` object containing the following properties:

| Property | Type | Description |
| :--- | :--- | :--- |
| `score` | `number` | A 0-1 score representing the percentage of article claims backed by source material. |
| `totalClaims` | `number` | The total number of sentences/claims analyzed in the article. |
| `supportedClaims` | `number` | The number of claims that met or exceeded the keyword overlap threshold. |
| `unsupportedClaims` | `string[]` | An array of specific sentences that failed the grounding check. |
| `warnings` | `string[]` | A list of summary warnings generated during the validation process. |

## Examples

### Basic Grounding Check
This example demonstrates how to validate a synthesized string against a set of source documents.

```typescript
import { validateGrounding } from 'yaaf/knowledge/compiler/validator';

const articleBody = "YAAF is a TypeScript-first framework for building production-grade agents.";
const sources = [
  "YAAF (Yet Another Agent Framework) is built with TypeScript.",
  "It is designed for production-grade LLM agent development."
];

const result = validateGrounding(articleBody, sources, 0.5);

if (result.score > 0.8) {
  console.log("Article is well-grounded.");
} else {
  console.warn("Potential hallucinations found:", result.unsupportedClaims);
}
```

### Handling Low Grounding Scores
When the grounding score falls below a specific threshold, the `unsupportedClaims` property can be used to identify which parts of the article require manual review or re-synthesis.

```typescript
const result = validateGrounding(generatedMarkdown, rawSources);

if (result.unsupportedClaims.length > 0) {
  result.unsupportedClaims.forEach(claim => {
    console.error(`Unverified claim: ${claim}`);
  });
}
```

## Sources
- `src/knowledge/compiler/validator.ts`