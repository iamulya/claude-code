---
title: Content Ingestion System
summary: The YAAF subsystem responsible for processing raw content from various sources (e.g., files, web pages) into a standardized `IngestedContent` format, handling parsing, metadata extraction, and asset resolution.
primary_files:
 - src/knowledge/compiler/ingester/markdown.ts
 - src/knowledge/compiler/ingester/types.ts
 - src/knowledge/compiler/ingester/images.ts
entity_type: subsystem
exports:
 - Ingester
 - IngestedContent
 - IngesterOptions
 - markdownIngester
search_terms:
 - how to add knowledge to agent
 - processing source documents
 - markdown parsing
 - extracting images from files
 - file ingestion pipeline
 - knowledge base creation
 - content processing
 - data ingestion
 - web clipper content
 - Obsidian Web Clipper format
 - local asset resolution
 - frontmatter extraction
 - normalize source data
stub: false
compiled_at: 2026-04-24T18:11:29.238Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/markdown.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The [Content Ingestion](../concepts/content-ingestion.md) System is responsible for reading raw source files from various formats and transforming them into a standardized, structured representation known as `IngestedContent`. This subsystem acts as the entry point for external knowledge into the YAAF framework. Its primary goal is to handle the complexities of different file types, such as parsing syntax, extracting metadata from [Frontmatter](../concepts/frontmatter.md), and resolving local asset paths (e.g., images), to provide a clean, consistent data structure for downstream processes like chunking and embedding [Source 1].

## Architecture

The system is designed around a pluggable `[[[[[[[[Ingester]]]]]]]]` interface. Each implementation of this interface is specialized for one or more file formats, identified by MIME types or file extensions.

A key implementation provided by the framework is the `markdownIngester`, which is considered the highest-fidelity ingestion path and is optimized for content produced by [Tools](./tools.md) like the Obsidian Web Clipper or Joplin Web Clipper [Source 1].

The typical [workflow](../concepts/workflow.md) for an Ingester, exemplified by `markdownIngester`, is as follows:
1.  **Read File**: The raw content of the source file is read from the filesystem [Source 1].
2.  **Parse Content**: The content is parsed to separate metadata from the main body. For Markdown, this involves parsing YAML frontmatter [Source 1].
3.  **Extract Metadata**: Key information like the document `title` is extracted. The system first checks the frontmatter and falls back to using the first H1 heading if no title is specified there [Source 1]. All frontmatter fields are preserved in a `metadata` object.
4.  **Resolve Assets**: The ingester scans the content for references to local assets, such as `![]()` image tags in Markdown. It resolves these relative paths to absolute paths and prepares them for inclusion in the final output. A designated output directory (`imageOutputDir`) is used for these assets [Source 1].
5.  **Handle Failures**: If any assets cannot be resolved, their paths are recorded in the `metadata` object under the `_unresolved_images` key for later inspection [Source 1].
6.  **Normalize Output**: All extracted information—text body, resolved images, metadata, source file path, title, and MIME type—is packaged into a single, standardized `IngestedContent` object [Source 1].

## Key APIs

The public API surface of this subsystem revolves around the `Ingester` interface and the data structures it consumes and produces.

*   **`Ingester`**: An interface that defines the contract for a content ingester. It includes:
    *   `supportedMimeTypes`: An array of MIME types the ingester can handle (e.g., `["text/markdown"]`).
    *   `supportedExtensions`: An array of file extensions the ingester supports (e.g., `["md", "mdx"]`).
    *   `requiresOptionalDeps`: A boolean indicating if the ingester relies on [Optional Dependencies](../concepts/optional-dependencies.md).
    *   `ingest(filePath, options)`: An asynchronous method that takes a file path and returns a promise resolving to an `IngestedContent` object [Source 1].

*   **`IngestedContent`**: The standardized output object produced by all ingesters. It contains:
    *   `text`: The main body of the content.
    *   `images`: An array of resolved image asset information.
    *   `mimeType`: The MIME type of the original content.
    *   `sourceFile`: The absolute path to the original source file.
    *   `title`: The extracted title of the document.
    *   `metadata`: A key-value record of all metadata, including frontmatter.
    *   `lossy`: A boolean indicating if the ingestion process was lossy.
    *   `sourceUrl`: The original source URL of the content, if available [Source 1].

*   **`markdownIngester`**: The concrete `Ingester` implementation for Markdown (`.md`, `.mdx`) files. It has no optional dependencies [Source 1].

## Configuration

The behavior of an ingester can be modified at runtime by passing an `IngesterOptions` object to its `ingest` method. Key configuration options include:

*   `imageOutputDir`: Specifies the directory where resolved images should be copied. If not provided, it defaults to an `assets` subdirectory within the source file's parent directory [Source 1].
*   `sourceUrl`: Allows explicitly setting the source URL of the content, which overrides any `source` or `url` fields found in the document's frontmatter [Source 1].

## Extension Points

The primary mechanism for extending the Content Ingestion System is to create new classes that implement the `Ingester` interface. By providing implementations for different file formats (e.g., PDF, HTML, DOCX), developers can enable YAAF to process a wider variety of knowledge sources. These custom ingesters would then be registered with the part of the framework responsible for dispatching ingestion tasks.

## Sources

*   [Source 1] `src/knowledge/compiler/ingester/markdown.ts`