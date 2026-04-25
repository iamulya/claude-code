---
title: Knowledge Linter
entity_type: subsystem
summary: The Knowledge Linter subsystem is responsible for reading, parsing, and preparing compiled knowledge articles for validation and further processing.
primary_files:
 - src/knowledge/compiler/linter/reader.ts
exports:
 - ParsedCompiledArticle
 - readCompiledArticles
 - parseCompiledArticle
search_terms:
 - validate knowledge base
 - check compiled articles
 - parse markdown frontmatter
 - read KB files
 - knowledge base quality control
 - linting markdown files
 - how to read compiled knowledge
 - frontmatter parsing utility
 - KB file reader
 - article validation process
 - load compiled markdown
 - extract YAML from markdown
stub: false
compiled_at: 2026-04-25T00:29:07.603Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/linter/reader.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The Knowledge Linter subsystem serves as the initial stage of the overall [Knowledge Base](./knowledge-base.md) validation process, commonly known as the [Linter](../concepts/linter.md). Its primary responsibility is to read compiled knowledge articles from the file system, parse their contents into distinct frontmatter and body sections, and structure this data for consumption by subsequent linting rules and validation checks [Source 1]. This subsystem effectively bridges the gap between the on-disk representation of compiled knowledge and the in-memory objects required for quality assurance and analysis.

## Architecture

The subsystem's architecture is centered around file I/O and parsing operations. It is designed to process a batch of articles efficiently based on a provided registry [Source 1].

The core components are:
- **File Reader**: The `readCompiledArticles` function takes a [Concept Registry](./concept-registry.md) and the path to the compiled knowledge directory. It iterates through the concepts in the registry, constructs the full file path for each article, and reads its raw content asynchronously using Node.js's `fs/promises` module [Source 1].
- **Parser**: The `parseCompiledArticle` function takes the raw string content of a file and separates it into its constituent parts. It leverages a shared utility, `parseYamlFrontmatter`, to parse the YAML frontmatter block into a JavaScript object [Source 1].
- **Data Structure**: The output of the parsing process is the [ParsedCompiledArticle](../apis/parsed-compiled-article.md) type. This object encapsulates the article's `docId`, its absolute `filePath`, the parsed `frontmatter` as a key-value record, and the remaining markdown `body` as a string [Source 1].
- **Error Handling**: The subsystem is designed to be resilient. If an article referenced in the registry cannot be read from the disk (e.g., due to file permissions or it being deleted), it is skipped, and an optional `onSkip` callback is invoked to log a warning without halting the entire process [Source 1].

## Integration Points

The Knowledge Linter subsystem integrates with several other parts of the YAAF framework:

- **[Concept Registry](./concept-registry.md)**: This subsystem is a primary consumer of the [Concept Registry](./concept-registry.md). It uses the registry as the source of truth for which compiled articles exist and need to be read and validated [Source 1].
- **[Frontmatter Parsing Subsystem](./frontmatter-parsing-subsystem.md)**: It relies on the shared `parseYamlFrontmatter` utility for the low-level task of parsing YAML from the markdown files, making it a client of the [Frontmatter Parsing Subsystem](./frontmatter-parsing-subsystem.md) [Source 1].
- **Linter Rule Engine**: The array of [ParsedCompiledArticle](../apis/parsed-compiled-article.md) objects produced by this subsystem is the direct input for the main linter engine, which applies various validation rules to the frontmatter and body of each article.

## Key APIs

- **[readCompiledArticles](../apis/read-compiled-articles.md)**: The main entry point function. It orchestrates the process of reading all compiled articles listed in a [Concept Registry](./concept-registry.md) from a specified directory and returns a promise that resolves to an array of [ParsedCompiledArticle](../apis/parsed-compiled-article.md) objects [Source 1].
- **[parseCompiledArticle](../apis/parse-compiled-article.md)**: A utility function that parses the raw string content of a single compiled article into a [ParsedCompiledArticle](../apis/parsed-compiled-article.md) object [Source 1].
- **[ParsedCompiledArticle](../apis/parsed-compiled-article.md)**: A type definition that represents a successfully read and parsed article, containing its `docId`, `filePath`, `frontmatter` object, and `body` string [Source 1].

## Extension Points

The primary extension point is the `onSkip` callback function that can be provided to [readCompiledArticles](../apis/read-compiled-articles.md). This allows developers to inject custom logic for handling and reporting cases where a compiled article fails to be read from the disk [Source 1].

## Sources

[Source 1]: src/knowledge/compiler/linter/reader.ts