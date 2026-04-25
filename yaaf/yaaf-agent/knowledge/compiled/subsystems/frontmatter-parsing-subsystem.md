---
summary: Provides a centralized, spec-compliant utility for parsing YAML frontmatter from markdown documents within YAAF's knowledge management components.
primary_files:
 - src/knowledge/utils/frontmatter.ts
title: Frontmatter Parsing Subsystem
entity_type: subsystem
exports:
 - ParsedFrontmatter
 - parseFrontmatter
 - parseYamlFrontmatter
search_terms:
 - parse markdown frontmatter
 - extract YAML from markdown
 - YAML parsing in YAAF
 - knowledge base document parsing
 - frontmatter spec compliance
 - how to read document metadata
 - CRLF normalization
 - block scalar parsing
 - prototype pollution prevention
 - shared YAML utility
 - yaml library integration
 - markdown metadata extraction
stub: false
compiled_at: 2026-04-24T18:12:23.381Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/utils/frontmatter.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Purpose

The [Frontmatter](../concepts/frontmatter.md) Parsing Subsystem provides a single, centralized, and specification-compliant utility for parsing YAML frontmatter from markdown documents. It was created to replace four separate, hand-rolled parsers that existed within the YAAF knowledge management components [Source 1].

This consolidation addresses several issues present in the previous implementations, including:
*   Bugs related to parsing block scalars (`|`, `>`) [Source 1].
*   Incomplete handling of YAML 1.2 escape sequences [Source 1].
*   Complex and error-prone logic for splitting keys and values around colons within quoted strings [Source 1].
*   Code duplication and divergence, where the four parsers were drifting out of sync over time [Source 1].

By centralizing this logic, the subsystem ensures consistent, reliable, and secure parsing of document metadata across the framework.

## Architecture

The subsystem is a utility module built upon the third-party `yaml` library, which provides spec-compliant YAML 1.2 parsing capabilities [Source 1]. Its architecture is centered around two main functions and a data interface.

The primary function, `parseFrontmatter`, is designed to process a complete markdown document. It identifies and extracts the YAML block enclosed by `---` delimiters, normalizes line endings (CRLF to LF) to handle files from different operating systems, and then uses the `yaml` library to parse the extracted block [Source 1].

For security, the parser is designed to prevent prototype pollution by creating parsed objects with a null prototype using `Object.create(null)` [Source 1].

The subsystem defines the `ParsedFrontmatter` interface to structure its output, cleanly separating the parsed key-value metadata from the remaining markdown content of the document.

## Integration Points

This subsystem serves as a shared utility for various components within YAAF's knowledge management system. The source material explicitly notes that it consolidates the parsing logic previously found in four separate locations [Source 1]:
*   `ingester/markdown.ts`
*   `synthesizer/frontmatter.ts`
*   `linter/reader.ts`
*   `store/store.ts`

These components now call the centralized functions provided by this subsystem for all frontmatter parsing needs.

## Key APIs

The public API surface of this subsystem is exposed from the `knowledge/utils/frontmatter` module.

### `parseFrontmatter(markdown: string): ParsedFrontmatter`
This function is the primary entry point for parsing a full markdown document.

*   **Parameters**:
    *   `markdown`: A string containing the raw markdown content, which may or may not have a YAML frontmatter block.
*   **Returns**: An object conforming to the `ParsedFrontmatter` interface. If no frontmatter block is found, the returned object will have an empty `frontmatter` property and the `body` property will contain the original, unmodified markdown string [Source 1].
*   **Features**: It handles various YAML features including block scalars, escape sequences, flow mappings, and nested structures, as well as normalizing Windows-style CRLF line endings [Source 1].

### `parseYamlFrontmatter(yamlBlock: string): Record<string, unknown>`
A lower-level utility for parsing a string that is already known to be a YAML block.

*   **Parameters**:
    *   `yamlBlock`: A string containing only the YAML content to be parsed.
*   **Returns**: A `Record<string, unknown>` representing the parsed key-value pairs from the YAML string [Source 1]. This function was created to replace several similar internal parsers across the codebase [Source 1].

### `ParsedFrontmatter`
An interface that defines the structure of the object returned by `parseFrontmatter`.

*   **Properties**:
    *   `frontmatter: Record<string, unknown>`: An object containing the parsed key-value pairs from the YAML block.
    *   `body: string`: A string containing the rest of the markdown document after the closing `---` delimiter of the frontmatter block [Source 1].

## Sources
[Source 1] `src/knowledge/utils/frontmatter.ts`