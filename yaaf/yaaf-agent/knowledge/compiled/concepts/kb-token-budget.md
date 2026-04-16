---
summary: Configuration parameters that control the token consumption and image injection limits for compiled knowledge documents.
title: KB Token Budget
entity_type: concept
related_subsystems:
  - Knowledge Base
  - Knowledge Synthesizer
stub: false
compiled_at: 2026-04-16T14:29:12.746Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/ontology/types.ts
confidence: 0.9
---

## What It Is
The KB Token Budget is a core abstraction in YAAF used to manage the context window footprint of the Knowledge Base (KB). It provides a set of constraints that prevent the Knowledge Synthesizer from generating excessively large articles and limit the amount of visual data injected into an agent's prompt during runtime. By defining these limits, the framework ensures that KB content does not overwhelm the LLM's context window, maintaining space for agent reasoning and reducing inference costs.

## How It Works in YAAF
In YAAF, the token budget is defined within the `KBOntology` via the `KBBudgetConfig` interface. These constraints are applied during both the compilation of the knowledge base and the retrieval of documents at runtime.

The budget governs three primary constraints:
1.  **Text Volume**: The `textDocumentTokens` parameter sets the maximum token count for a single compiled markdown document. This is used by the Knowledge Synthesizer to ensure that authored articles remain concise.
2.  **Image Token Cost**: The `imageTokens` parameter defines the maximum number of vision tokens allowed for images injected during a single fetch operation.
3.  **Image Quantity**: The `maxImagesPerFetch` parameter limits the total number of images returned when an agent invokes the `fetch_kb_document` tool.