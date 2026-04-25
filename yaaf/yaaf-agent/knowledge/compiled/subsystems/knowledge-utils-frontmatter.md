---
summary: Provides shared utilities for parsing YAML frontmatter from markdown documents, ensuring consistent and spec-compliant handling across the framework.
primary_files:
 - src/knowledge/utils/frontmatter.ts
title: Knowledge Utils Frontmatter
entity_type: subsystem
exports:
 - parseFrontmatter
 - parseYamlFrontmatter
 - ParsedFrontmatter
search_terms:
 - parse YAML frontmatter
 - markdown frontmatter parsing
 - extract frontmatter from markdown
 - YAML block scalar parsing
 - spec-compliant YAML parser
 - shared frontmatter utility
 - how to handle frontmatter
 - CRLF normalization markdown
 - prototype pollution prevention yaml
 - frontmatter parser bugs
 - unify frontmatter parsing
stub: false
compiled_at: 2026-04-25T00:29:20.463Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/utils/frontmatter.ts
compiled_from_quality: unknown
confidence: 1
---

## Purpose

The Frontmatter Parsing Subsystem provides a centralized, spec-compliant utility for parsing YAML frontmatter from markdown documents within the YAAF framework [Source 1]. Its primary purpose is to replace multiple, inconsistent, hand-rolled parsers that existed across the codebase with a single, robust implementation.

This consolidation addresses several key issues [Source 1]:
- **Parsing Bugs**: Eliminates bugs related to block scalars (e.g., `|`, `>`).
- **Incomplete Handling**: Corrects gaps in handling YAML escape sequences.
- **Complexity**: Removes the need for complex logic to handle quote-aware colon splitting.
- **Code Drift**: Prevents copy-pasted parsers from diverging over time.

By providing a single source of truth for frontmatter parsing, this subsystem ensures that all parts of the framework interpret markdown document metadata consistently and correctly.

## Architecture

The subsystem is a utility module built around the `yaml` library, which ensures compliance with the YAML 1.2 specification. It consists of two core functions and one data interface [Source 1].

- **`parseFrontmatter`**: This function is the primary entry point for parsing a complete markdown document. It identifies the YAML frontmatter block (enclosed by `---` delimiters), separates it from the main body content, and parses the YAML into a JavaScript object. It also handles CRLF normalization, which is important for compatibility with files from different operating systems (e.g., Windows Obsidian exports).
- **`parseYamlFrontmatter`**: A more specialized function that parses a string containing only YAML content. This is used when the frontmatter block has already been extracted from the markdown document.
- **`ParsedFrontmatter`**: An interface that defines the return type for `parseFrontmatter`, containing the parsed `frontmatter` as an object and the remaining `body` of the markdown as a string.

For security, the parser is designed to prevent prototype pollution by creating objects with `Object.create(null)` [Source 1].

## Integration Points

This subsystem serves as a foundational utility for several other parts of the YAAF framework that handle knowledge base articles. The source material explicitly notes that it consolidates the parsing logic previously found in four separate locations [Source 1]:

- **[Content Ingestion System](./content-ingestion-system.md)**: The ingester uses this subsystem to parse metadata from new markdown files being added to the [Knowledge Base](./knowledge-base.md).
- **[Knowledge Synthesizer](./knowledge-synthesizer.md)**: When synthesizing or updating articles, this subsystem is used to read and manipulate frontmatter.
- **[Knowledge Base Linter](./knowledge-base-linter.md)**: The linter relies on this parser to read article frontmatter for validation and rule-checking.
- **[Storage System](./storage-system.md)**: The underlying storage mechanism for the knowledge base uses this utility to handle frontmatter when reading from or writing to the store.

## Key APIs

- **[parseFrontmatter](../apis/parse-frontmatter.md)**: Splits a markdown document into its YAML frontmatter and body, returning a `[[ParsedFrontmatter]]` object. If no frontmatter is found, it returns an empty frontmatter object and the original string as the body.
- **[parseYamlFrontmatter](../apis/parse-yaml-frontmatter.md)**: Parses a raw string containing only YAML into a `Record<string, unknown>`.
- **[ParsedFrontmatter](../apis/parsed-frontmatter.md)**: An interface representing the output of `[[parseFrontmatter]]`, with `frontmatter` and `body` properties.

## Sources

[Source 1]: src/knowledge/utils/frontmatter.ts