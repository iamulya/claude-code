---
summary: The practice of creating minimal placeholder articles for newly discovered entities to maintain graph integrity before full content is available.
title: Article Stubbing
entity_type: concept
related_subsystems:
  - Knowledge Compiler
  - Knowledge Synthesizer
stub: false
compiled_at: 2026-04-16T14:26:51.572Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/synthesizer/prompt.ts
confidence: 0.9
---

## What It Is
Article stubbing is a mechanism within the YAAF knowledge management system used to handle newly discovered entities that lack sufficient source material for a full article. When the knowledge compiler identifies a reference to a concept, API, or subsystem that does not yet exist in the knowledge base, it generates a "stub"—a minimal placeholder document.

This practice solves the problem of broken references within the knowledge graph. By ensuring every identified entity has at least a stub, the compiler can maintain graph integrity and valid wikilink targets while waiting for more comprehensive source data to be ingested.

## How It Works in YAAF
The stubbing process is integrated into the **Knowledge Synthesizer** subsystem. During the compilation pipeline, the synthesizer uses the `generateStubArticle` function (defined in `src/knowledge/compiler/synthesizer/prompt.ts`) to create these placeholders.

The synthesis model—typically a high-capability LLM such as Gemini 1.5 Pro—is instructed to produce a document that adheres to the framework's standard output contract. This includes:
1.  **YAML Frontmatter**: Basic metadata such as the entity title and type.
2.  **Minimal Structure**: A brief description or summary based on the context in which the entity was discovered.
3.  **Future Expansion**: These stubs are flagged to be "fleshed out" in subsequent compilation passes as more source material becomes available to the compiler.

## Configuration
Stub generation is a core behavior of the synthesizer's prompt builder. The synthesizer reads the **Entity Type Schema** to ensure that even a stub contains the mandatory frontmatter fields and section headers required for its specific entity type (e.g., concept, api, or subsystem).

## Sources
*   `src/knowledge/compiler/synthesizer/prompt.ts`