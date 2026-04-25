---
summary: A bidirectional mapping system in YAAF's knowledge base that tracks which source files contribute to which compiled articles and vice-versa.
title: Reverse Citation Index
entity_type: concept
related_subsystems:
 - knowledge-base-compiler
see_also:
 - "[object Object]"
 - "[object Object]"
 - "[object Object]"
 - "[object Object]"
 - "[object Object]"
 - "[object Object]"
 - "[object Object]"
 - "[object Object]"
search_terms:
 - source to article mapping
 - article to source mapping
 - find articles from source file
 - what sources make up an article
 - knowledge base dependency tracking
 - compiled_from frontmatter
 - .kb-citation-index.json
 - data lineage in knowledge base
 - content contamination analysis
 - find related articles by source
 - top contributing sources
 - impact analysis for KB sources
stub: false
compiled_at: 2026-04-25T00:24:11.180Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/citationIndex.ts
compiled_from_quality: unknown
confidence: 0.98
---

## What It Is

The Reverse Citation Index is a bidirectional mapping system within the YAAF Knowledge Base that tracks the relationship between raw source files and the final compiled articles [Source 1]. It is designed to provide data lineage, enabling operators to answer critical questions about the knowledge base's composition:

*   **Source to Article:** "Which articles were generated from this specific source file?"
*   **Article to Source:** "Which source files were used to compile this specific article?"
*   **Source Importance:** "Which source files contribute to the most articles?"

This index is a key tool for maintaining the integrity, traceability, and quality of the knowledge base, especially for tasks like impact analysis when a source is found to be unreliable or outdated [Source 1].

## How It Works in YAAF

The Reverse Citation Index is generated during the knowledge base compilation process. The compiler scans the [Frontmatter](./frontmatter.md) of every compiled article and reads the `compiled_from` field, which lists the source files used to create that article [Source 1]. This process piggybacks on existing compilation scans, adding minimal overhead.

The core logic is encapsulated in the `[[buildCitationIndex]]` function. The resulting index is an object conforming to the `[[CitationIndex]]` type, which includes two primary mappings:

*   `sourceToArticles`: A record mapping a source file path to an array of article [docId](./doc-id.md)s.
*   `articleToSources`: A record mapping an article [docId](./doc-id.md) to an array of its source file paths.

The index also contains metadata, such as a list of `topSources` (ordered by the number of articles they contribute to), total source and article counts, and a generation timestamp [Source 1].

For persistence and offline analysis, the index is saved to a file named `.kb-citation-index.json` within the knowledge base directory using the `[[writeCitationIndex]]` function. It can be loaded back into memory with `[[loadCitationIndex]]` [Source 1].

YAAF provides utility functions that leverage this index for common operational tasks:
*   `[[articlesAffectedBySource]]`: Identifies all articles that might be "contaminated" if a given source file is found to be incorrect or untrustworthy [Source 1].
*   `[[articlesWithSharedSources]]`: Finds other articles that share common sources with a given article, which is useful for discovering related content or identifying potential contradiction chains [Source 1].

## Sources
[Source 1]: src/knowledge/compiler/citationIndex.ts