---
summary: The subsystem responsible for reading, parsing, and structuring various content types into a unified `IngestedContent` format for the YAAF knowledge base.
primary_files:
 - src/knowledge/compiler/ingester/text.ts
 - src/knowledge/compiler/ingester/types.ts
title: Knowledge Ingestion
entity_type: subsystem
exports:
 - plainTextIngester
 - jsonIngester
 - codeIngester
search_terms:
 - how to add files to knowledge base
 - parsing source documents
 - file content extraction
 - supported file types
 - ingest text files
 - ingest json files
 - ingest source code
 - document ingestion pipeline
 - Ingester interface
 - IngestedContent format
 - content processing
 - knowledge source parsing
stub: false
compiled_at: 2026-04-25T00:29:05.011Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/text.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The Knowledge Ingestion System is a core component of the [Knowledge Base Compiler](./knowledge-base-compiler.md). Its primary responsibility is to read raw source files from various formats—such as plain text, JSON, and source code—and transform them into a standardized, structured representation known as [IngestedContent](../apis/ingested-content.md). This process normalizes diverse inputs, allowing subsequent stages of the knowledge compilation pipeline, like the [Knowledge Extraction Subsystem](./knowledge-extraction-subsystem.md), to operate on a consistent data model.

## Architecture

The subsystem is designed around the [Ingester](../apis/ingester.md) interface, which defines a contract for processing specific file types. Each ingester implementation specifies the file extensions and MIME types it supports and provides an `ingest` method to perform the conversion [Source 1]. The system includes several built-in ingesters for common file formats.

### `plainTextIngester`
This ingester handles plain text files (`.txt`, `.csv`, `.tsv`). It reads the entire file content into the `text` field of the [IngestedContent](../apis/ingested-content.md) object. It automatically attempts to derive a title by extracting the first non-empty line of the file, truncated to 80 characters [Source 1].

### `jsonIngester`
Designed for structured data files like `.json`, `.yaml`, and `.yml`. It first attempts to parse the file as JSON.
- If successful, it tries to find a `title`, `name`, or `id` field in the root object to use as the document title. It then creates a summary of the top-level keys and formats the full content as a pretty-printed JSON code block.
- If the file cannot be parsed as JSON (e.g., it is YAML or malformed), it falls back to treating the content as plain text [Source 1].

### `codeIngester`
This ingester processes a wide range of source code files (e.g., `.ts`, `.js`, `.py`, `.go`, `.rs`). Its key functions are:
- **Language Detection**: It identifies the programming language from the file extension and wraps the source code in a corresponding Markdown fenced code block (e.g., ` ```typescript `) [Source 1].
- **Title and Summary Extraction**: It attempts to extract file-level docstrings (like JSDoc or Python docstrings) or leading comments to use as the document's title and summary text [Source 1].
- **Safety Truncation**: To prevent out-of-memory errors from large, minified, or generated files, this ingester truncates source files larger than 500KB. It reads only the beginning of the file, which is typically sufficient to capture documentation and structural information, and appends a truncation notice [Source 1].

All ingesters populate an [IngestedContent](../apis/ingested-content.md) object, which includes the processed text, an optional title, metadata, and references to the original source file and URL [Source 1].

## Integration Points

- **[Knowledge Base Compiler](./knowledge-base-compiler.md)**: This is the primary consumer of the Knowledge Ingestion System. The compiler discovers source files on disk and invokes the appropriate ingester based on the file's extension or MIME type to begin the compilation process.
- **[Knowledge Extraction Subsystem](./knowledge-extraction-subsystem.md)**: This subsystem receives the [IngestedContent](../apis/ingested-content.md) objects produced by the ingesters. It uses this standardized format as the input for extracting concepts, facts, and relationships.

## Key APIs

- [Ingester](../apis/ingester.md): The core interface that defines the contract for all ingester implementations.
- [IngestedContent](../apis/ingested-content.md): The standardized data structure produced by all ingesters, representing a processed source document.
- [IngesterOptions](../apis/ingester-options.md): An options object passed to the `ingest` method, which can contain contextual information like a `sourceUrl`.
- [plainTextIngester](../apis/plain-text-ingester.md): The concrete implementation for handling plain text, CSV, and TSV files.
- [jsonIngester](../apis/json-ingester.md): The concrete implementation for handling JSON and YAML files.
- [codeIngester](../apis/code-ingester.md): The concrete implementation for handling various source code files.

## Extension Points

The system is extensible by design. Developers can support new file formats (e.g., PDF, Markdown, HTML) by creating a custom class that implements the [Ingester](../apis/ingester.md) interface. This new ingester would then need to be registered with the [Knowledge Base Compiler](./knowledge-base-compiler.md) to be used during the knowledge discovery and compilation process.

## Sources

[Source 1]: src/knowledge/compiler/ingester/text.ts