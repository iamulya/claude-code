---
summary: Provides functionality for reading and parsing compiled knowledge base articles from the filesystem, extracting frontmatter and body content.
primary_files:
 - src/knowledge/compiler/linter/reader.ts
title: Compiled Article Reader
entity_type: subsystem
exports:
 - ParsedCompiledArticle
 - readCompiledArticles
 - parseCompiledArticle
search_terms:
 - read knowledge base files
 - parse markdown frontmatter
 - load compiled articles
 - extract YAML from markdown
 - filesystem article loading
 - knowledge base parser
 - how to read compiled docs
 - frontmatter parsing
 - docId extraction
 - ConceptRegistry article reading
 - read compiled markdown
 - knowledge linter utilities
stub: false
compiled_at: 2026-04-24T18:11:04.369Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/linter/reader.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Purpose

The Compiled Article Reader subsystem is responsible for reading and parsing compiled knowledge base articles from the filesystem. Its primary function is to take a file path, read the raw content, and separate it into its two main components: the YAML [Frontmatter](../concepts/frontmatter.md) block and the markdown body. This allows other systems, such as the knowledge base [Linter](../concepts/linter.md), to access and validate the metadata and content of the final, compiled documentation artifacts [Source 1].

## Architecture

The subsystem's logic is centralized in `src/knowledge/compiler/linter/reader.ts`. It defines a core data structure, `ParsedCompiledArticle`, which represents a single parsed file. This structure contains the document's unique identifier (`docId`), its absolute `filePath`, the parsed `frontmatter` as a key-value object, and the raw markdown `body` [Source 1].

For parsing the YAML frontmatter from the raw file content, this subsystem relies on a shared utility function, `parseYamlFrontmatter`, located in `knowledge/utils/frontmatter.ts` [Source 1].

The subsystem exposes two main functions:
1.  `readCompiledArticles`: A high-level asynchronous function that reads a batch of articles. It uses a `ConceptRegistry` to determine which articles to read from a specified compiled directory. It is designed to be resilient, skipping any files that cannot be read due to permissions or other errors and logging a warning via an optional callback [Source 1].
2.  `parseCompiledArticle`: A lower-level synchronous function that performs the parsing logic for a single file's raw string content, returning a `ParsedCompiledArticle` object [Source 1].

## Integration Points

The Compiled Article Reader is primarily used by other components of the [Knowledge Base Compiler](./knowledge-base-compiler.md) and toolchain. As its location within the `compiler/linter/` directory suggests, a key consumer is the [Knowledge Base Linter](./knowledge-base-linter.md), which would use this subsystem to load all compiled articles for validation.

It also integrates with the [Ontology System](./ontology-system.md) by accepting a `ConceptRegistry` instance. This registry provides the list of `docId`s that the `readCompiledArticles` function uses to locate the corresponding files on disk [Source 1].

## Key APIs

-   **`readCompiledArticles(registry: ConceptRegistry, compiledDir: string, onSkip?: (docId: string, reason: string) => void): Promise<ParsedCompiledArticle[]>`**
    Reads all compiled articles that are referenced in the provided `ConceptRegistry` from the specified `compiledDir`. It returns a promise that resolves to an array of `ParsedCompiledArticle` objects. The optional `onSkip` callback can be used to handle cases where an article fails to be read [Source 1].

-   **`parseCompiledArticle(docId: string, filePath: string, raw: string): ParsedCompiledArticle`**
    Parses the raw string content of a single compiled markdown file into its frontmatter and body. It returns a `ParsedCompiledArticle` object containing the parsed data along with the provided `docId` and `filePath` [Source 1].

-   **`ParsedCompiledArticle` (type)**
    The primary data structure returned by this subsystem. It is an object with the following properties [Source 1]:
    -   `docId`: The relative document ID without the file extension (e.g., "concepts/attention-mechanism").
    -   `filePath`: The absolute path to the compiled file.
    -   `frontmatter`: A `Record<string, unknown>` containing the parsed key-value pairs from the YAML frontmatter.
    -   `body`: A string containing the markdown body of the article, which is all content after the frontmatter block.

## Sources

[Source 1]: src/knowledge/compiler/linter/reader.ts