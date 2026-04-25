---
summary: A collection of canonical terms and their aliases, representing the 'known terminology' within a knowledge base, used to guide LLM extraction and enhance search query expansion.
title: Vocabulary
entity_type: concept
related_subsystems:
 - subsystems/concept-extractor
see_also:
 - concepts/ontology
 - subsystems/concept-extractor
 - plugins/tf-idf-search-plugin
 - apis/vocabulary-entry
search_terms:
 - known terminology
 - term registry
 - concept aliases
 - synonym list
 - how does yaaf handle synonyms
 - what is a vocabulary entry
 - using aliases in knowledge base
 - ontology terminology
 - concept extraction grounding
 - search query expansion
 - vocab file
 - term list
stub: false
compiled_at: 2026-04-25T00:26:25.003Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/extractor/prompt.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/index.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/tfidfSearch.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

A Vocabulary is a collection of canonical terms and their associated aliases (synonyms) that represent the "known terminology" within a YAAF knowledge base [Source 1]. It is a fundamental component of the [Ontology](./ontology.md), providing a structured way to manage the names and variations of concepts within a specific domain.

The Vocabulary serves two primary purposes:

1.  **Grounding LLMs**: It provides the [Concept Extractor](../subsystems/concept-extractor.md) subsystem with a definitive list of terms, which helps ground the LLM during the analysis of new content. This ensures that the model can correctly identify and link concepts even when they are referred to by different names [Source 1].
2.  **Enhancing Search**: It enables features like automatic query expansion in search components. By understanding the relationships between terms and their synonyms, search functionality can return more relevant and comprehensive results [Source 3].

## How It Works in YAAF

The Vocabulary is implemented as a collection of [VocabularyEntry](../apis/vocabulary-entry.md) objects, a type defined within the [Ontology](./ontology.md) layer [Source 2]. Each entry typically links a canonical term to its known aliases.

### In Concept Extraction

During the knowledge ingestion pipeline, the [Concept Extractor](../subsystems/concept-extractor.md)'s prompt builder, specifically the [buildExtractionUserPrompt](../apis/build-extraction-user-prompt.md) function, incorporates the Vocabulary into the prompt sent to the LLM. The vocabulary is provided alongside the [Ontology](./ontology.md)'s entity types, the concept registry (existing articles), and static analysis results. This front-loads the LLM with the domain's specific terminology, constraining its output and improving the accuracy of its plan to create or update articles [Source 1].

### In Search

The default `KBSearchAdapter`, the [TfIdfSearchPlugin](../plugins/tf-idf-search-plugin.md), uses the Vocabulary to perform "vocabulary-aware query expansion." When a search is executed, the plugin can automatically expand the query to include synonyms for the given search terms. This process broadens the search without requiring the user to list all possible variations, leading to more effective information retrieval [Source 3].

## Configuration

While the Vocabulary is an integral part of the [Ontology](./ontology.md), it can also be passed directly to components that consume it. For example, when manually configuring the [TfIdfSearchPlugin](../plugins/tf-idf-search-plugin.md), the vocabulary from a loaded ontology can be provided in its constructor options.

```typescript
// Explicitly provide the vocabulary to the search plugin
const plugin = new TfIdfSearchPlugin({
  tokenizer: new EnglishTokenizer(),
  vocabulary: ontology.vocabulary, // Sourced from the main ontology object
});

await host.register(plugin);
```
[Source 3]

## See Also

*   [Ontology](./ontology.md): The Vocabulary is a core component of the broader knowledge base ontology.
*   [Concept Extractor](../subsystems/concept-extractor.md): This subsystem uses the Vocabulary to ground the LLM during content analysis.
*   [TfIdfSearchPlugin](../plugins/tf-idf-search-plugin.md): The default search plugin uses the Vocabulary for query expansion.
*   [VocabularyEntry](../apis/vocabulary-entry.md): The API type definition for a single entry within the Vocabulary.

## Sources

*   [Source 1]: `src/knowledge/compiler/extractor/prompt.ts`
*   [Source 2]: `src/knowledge/ontology/index.ts`
*   [Source 3]: `src/knowledge/store/tfidfSearch.ts`