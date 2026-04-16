---
summary: Builds the system prompt for the LLM-based knowledge extraction pass, grounding the model in the ontology and registry.
export_name: buildExtractionSystemPrompt
source_file: src/knowledge/compiler/extractor/prompt.ts
category: function
title: buildExtractionSystemPrompt
entity_type: api
stub: false
compiled_at: 2026-04-16T14:23:04.971Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/extractor/prompt.ts
confidence: 1
---

## Overview
The `buildExtractionSystemPrompt` function is a utility within the YAAF knowledge base compiler. It generates the system-level instructions for a Large Language Model (LLM) during the knowledge extraction and classification phase. 

The purpose of this prompt is to ground the LLM in the specific domain of the target knowledge base by providing the ontology's entity types and frontmatter schemas. This ensures that the model understands the structural constraints and expected metadata of the articles it will eventually propose or update. The extraction process typically utilizes fast, cost-effective models (such as Gemini 1.5 Flash) to produce a JSON-formatted compilation plan.

## Signature
```typescript
export function buildExtractionSystemPrompt(ontology: KBOntology): string;
```

### Parameters
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `ontology` | `KBOntology` | The definition of the knowledge base structure, including entity types and their respective schemas. |

### Returns
`string`: A formatted system prompt string designed to instruct an LLM on how to perform knowledge extraction.

## Methods & Properties
While `buildExtractionSystemPrompt` is a standalone function, it is designed to work in tandem with `buildExtractionUserPrompt`, which provides the specific source text and pre-computed static analysis to the LLM.

The prompt engineering principles applied by this function include:
*   **Domain Grounding**: Establishing the ontology rules before the model processes any source text.
*   **Constraint Front-loading**: Placing entity types and registry information early in the context.
*   **Schema Specification**: Defining a minimal and explicit JSON schema for the model's output.
*   **Few-shot Prompting**: Including examples of the expected JSON compilation plan format.

## Examples

### Basic Usage
This example demonstrates how to generate a system prompt using a defined ontology.

```typescript
import { buildExtractionSystemPrompt } from 'yaaf/knowledge/compiler/extractor/prompt';

const myOntology = {
  entityTypes: {
    concept: {
      summary: "General knowledge entities",
      fields: ["title", "tags"]
    },
    api: {
      summary: "Technical API references",
      fields: ["export_name", "source_file", "category"]
    }
  }
};

const systemPrompt = buildExtractionSystemPrompt(myOntology);

// The resulting string contains instructions for the LLM to 
// identify 'concept' and 'api' entities based on the provided schemas.
console.log(systemPrompt);
```

## See Also
* `buildExtractionUserPrompt`: The companion function that generates the user-side prompt containing the content to be analyzed.