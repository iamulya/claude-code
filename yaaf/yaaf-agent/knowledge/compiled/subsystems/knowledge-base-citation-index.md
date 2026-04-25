---
summary: Provides a reverse citation index for the knowledge base, mapping source files to compiled articles and vice-versa, facilitating traceability and impact analysis.
primary_files:
 - src/knowledge/compiler/citationIndex.ts
title: Knowledge Base Citation Index
entity_type: subsystem
exports:
 - CitationIndex
 - buildCitationIndex
 - writeCitationIndex
 - loadCitationIndex
 - articlesAffectedBySource
 - articlesWithSharedSources
search_terms:
 - source to article mapping
 - article to source mapping
 - knowledge base traceability
 - impact analysis of source files
 - find articles from a source
 - find sources for an article
 - compiled_from frontmatter
 - .kb-citation-index.json
 - detecting content contamination
 - finding related articles by source
 - bidirectional source mapping
 - knowledge base compilation
 - which articles cite this source
stub: false
compiled_at: 2026-04-24T18:13:56.907Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/citationIndex.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The Knowledge Base Citation Index subsystem creates and maintains a bidirectional mapping between the raw source files used for compilation and the final articles generated in the knowledge base [Source 1]. Its primary purpose is to provide traceability and enable impact analysis.

This allows operators and developers to answer key questions about the knowledge base's composition [Source 1]:
*   **Source to Article:** Which articles were compiled using a specific source file?
*   **Article to Source:** Which source files contributed to a specific article?
*   **Source Importance:** Which source files are cited by the most articles?
*   **Impact Analysis:** If a source file is found to be unreliable or incorrect, which articles are potentially "contaminated" and require review?

The index is designed for efficient offline querying after the main knowledge base compilation process is complete [Source 1].

## Architecture

The core of the subsystem is the `[[[[[[[[CitationIndex]]]]]]]]` data structure, which contains several key mappings [Source 1]:
*   `sourceToArticles`: A record mapping a source file path to an array of article document IDs that cite it.
*   `articleToSources`: A record mapping an article document ID to an array of source file paths it was compiled from.
*   `topSources`: An array of source files, ordered in descending order by the number of articles they contribute to.
*   Metadata fields such as `generatedAt`, `totalSources`, and `totalArticles`.

This index is constructed by scanning the [Frontmatter](../concepts/frontmatter.md) of every compiled article within the knowledge base. Specifically, it reads the `compiled_from` field in each article to build the bidirectional relationships [Source 1]. This scan is designed to be efficient, piggybacking on other existing post-compilation processes like [Linting](../concepts/linting.md) [Source 1].

Once built, the complete index is persisted to a file named `.kb-citation-index.json` in the knowledge base directory, allowing other [Tools](./tools.md) to consume it without needing to re-scan the entire set of compiled articles [Source 1].

## Integration Points

The Citation Index subsystem is primarily integrated with the knowledge base compilation process. The compiler is responsible for invoking `buildCitationIndex` and `writeCitationIndex` as a final step after all articles have been generated.

Other external tools, such as analysis scripts, CI/CD validation steps, or administrative dashboards, can then use `loadCitationIndex` to load the persisted index file and perform queries without interacting directly with the compiler or the compiled article files [Source 1].

## Key APIs

The public API for this subsystem is exposed through functions in `src/knowledge/compiler/CitationIndex.ts` [Source 1].

*   **`CitationIndex`**: The primary type definition for the index object, containing the mappings and metadata.
*   **`buildCitationIndex(compiledDir: string)`**: Scans all compiled articles in the specified directory and returns an in-[Memory](../concepts/memory.md) `CitationIndex` object.
*   **`writeCitationIndex(kbDir: string, compiledDir: string)`**: A utility function that builds the index and then persists it to the `.kb-citation-index.json` file within the `kbDir`.
*   **`loadCitationIndex(kbDir: string)`**: Loads a previously persisted citation index from the `.kb-citation-index.json` file. Returns `null` if the file does not exist.
*   **`articlesAffectedBySource(index: CitationIndex, sourcePath: string)`**: A query function that takes a loaded index and a source file path, returning an array of article IDs affected by that source.
*   **`articlesWithSharedSources(index: CitationIndex, docId: string)`**: A query function that finds other articles that share one or more sources with the given article ID, which is useful for discovering related content.

## Sources

[Source 1]: src/knowledge/compiler/CitationIndex.ts