---
summary: A subsystem that builds and queries a reverse citation index, creating a bidirectional mapping between raw source files and the compiled knowledge base articles they contribute to.
primary_files:
 - src/knowledge/compiler/citationIndex.ts
 - src/knowledge/compiler/atomicWrite.js
title: Knowledge Base Compilation System
entity_type: subsystem
exports:
 - CitationIndex
 - buildCitationIndex
 - writeCitationIndex
 - loadCitationIndex
 - articlesAffectedBySource
 - articlesWithSharedSources
search_terms:
 - reverse citation index
 - which articles use a source
 - find sources for an article
 - source to article mapping
 - article to source mapping
 - knowledge base dependencies
 - impact analysis of source changes
 - find contaminated articles
 - related articles by source
 - compiled_from frontmatter
 - kb-citation-index.json
 - source file traceability
stub: false
compiled_at: 2026-04-25T00:29:04.820Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/citationIndex.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The Knowledge Base Citation Index subsystem provides a [Reverse Citation Index](../concepts/reverse-citation-index.md) for the YAAF [Knowledge Base System](./knowledge-base-system.md) [Source 1]. Its primary purpose is to create and maintain a bidirectional mapping between the raw source files used for compilation and the final, compiled knowledge base articles. This allows developers and other systems to trace the lineage of information within the knowledge base [Source 1].

This subsystem solves several key problems [Source 1]:
- **Source-to-Article Traceability**: It answers the question, "Which articles cite this specific source file?"
- **Article-to-Source Traceability**: It answers the reverse question, "Which source files were used to compile this specific article?"
- **Impact Analysis**: It can determine which articles are affected or "contaminated" if a source file is found to be unreliable or incorrect.
- **Content Discovery**: It helps find related articles by identifying those that share common sources, which can be useful for detecting potential contradictions or finding topically similar content.
- **Influence Ranking**: It can identify the most influential sources by counting how many articles are compiled from them.

## Architecture

The core of the subsystem is the `CitationIndex` data structure. This index is built by scanning the [Frontmatter](../concepts/frontmatter.md) of every compiled article within the knowledge base directory. Specifically, it reads the `compiled_from` field in each article's frontmatter to establish the link between the article and its sources [Source 1].

The `CitationIndex` object contains several key fields [Source 1]:
- `sourceToArticles`: A mapping from a source file path to an array of article document IDs that were compiled from it.
- `articleToSources`: A mapping from an article document ID to an array of source file paths it was compiled from.
- `topSources`: An array of the most frequently used sources, ordered by the number of articles they contribute to.
- Metadata fields such as `generatedAt`, `totalSources`, and `totalArticles`.

Once generated, the index is persisted to a file named `.kb-citation-index.json` within the knowledge base directory. This allows for efficient, offline querying without needing to re-scan all articles. The system uses an atomic write operation via [atomicWriteFile](../apis/atomic-write-file.md) to ensure that the index file is never left in a corrupted state during updates [Source 1]. The cost of building the index is low, as it can be generated during an existing scan of compiled articles, such as a linting or post-processing pass [Source 1].

## Integration Points

The Knowledge Base Citation Index is a foundational component within the broader [Knowledge Base System](./knowledge-base-system.md).
- **Compilation Process**: The index is a consumer of data produced during article compilation. It relies on the compilation process to accurately populate the `compiled_from` field in the [Frontmatter](../concepts/frontmatter.md) of each article.
- **Maintenance & Analysis Tools**: Other systems and operators use the index's query functions to perform maintenance and analysis. For example, a system for managing source reliability would use [articlesAffectedBySource](../apis/articles-affected-by-source.md) to flag potentially compromised articles.
- **Content Discovery Systems**: A system designed to find related content or detect contradictions could use [articlesWithSharedSources](../apis/articles-with-shared-sources.md) as an input to identify articles that should be compared [Source 1].

## Key APIs

The public API surface of this subsystem revolves around building, persisting, loading, and querying the citation index.

- **[CitationIndex](../apis/citation-index.md)**: The primary data type representing the bidirectional mapping and associated metadata [Source 1].
- **[buildCitationIndex](../apis/build-citation-index.md)**: A function that scans a directory of compiled articles and constructs a `CitationIndex` object in memory [Source 1].
- **[writeCitationIndex](../apis/write-citation-index.md)**: A function that builds the index and then serializes it to the `.kb-citation-index.json` file in the specified knowledge base directory [Source 1].
- **[loadCitationIndex](../apis/load-citation-index.md)**: A function that deserializes and returns a previously persisted `CitationIndex` from disk. It returns `null` if the index file does not exist [Source 1].
- **[articlesAffectedBySource](../apis/articles-affected-by-source.md)**: A query function that takes an index and a source file path, returning an array of all article docIds that cite that source [Source 1].
- **[articlesWithSharedSources](../apis/articles-with-shared-sources.md)**: A query function that takes an index and an article docId, returning a list of other articles that share one or more sources with the given article [Source 1].

## Configuration

This subsystem does not have a dedicated configuration block within the main agent configuration. Its behavior is configured at runtime by passing file system paths (such as the knowledge base directory and the compiled articles directory) as arguments to its API functions like [buildCitationIndex](../apis/build-citation-index.md) and [writeCitationIndex](../apis/write-citation-index.md) [Source 1].

## Sources

[Source 1]: src/knowledge/compiler/citationIndex.ts