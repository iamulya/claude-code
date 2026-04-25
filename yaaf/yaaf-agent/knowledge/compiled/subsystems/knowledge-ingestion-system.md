---
summary: The subsystem responsible for ingesting raw source documents and preparing them for the knowledge compilation process.
primary_files:
 - src/knowledge/compiler/ingester/types.ts
 - src/knowledge/compiler/ingester/html.ts
 - src/knowledge/compiler/ingester/text.ts
contains:
 - apis/source-trust-level
title: Knowledge Ingestion System
entity_type: subsystem
exports:
 - Ingester
 - IngestedContent
 - SourceTrustLevel
 - KBClipper
 - htmlIngester
 - plainTextIngester
 - jsonIngester
 - codeIngester
search_terms:
 - document parsing
 - content extraction
 - ingesting source material
 - supported file formats
 - HTML to markdown conversion
 - web clipping
 - source code ingestion
 - image handling during ingestion
 - Mozilla Readability integration
 - Turndown for markdown
 - SourceTrustLevel classification
 - KBClipper usage
 - how to add new file types
 - parse raw documents
stub: false
compiled_at: 2026-04-24T18:16:07.945Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/extractor/types.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/html.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/text.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/types.ts
compiled_from_quality: unknown
confidence: 1
---

## Purpose

The Knowledge Ingestion System is the first stage of the knowledge compilation pipeline. Its primary responsibility is to process raw source documents in various formats (e.g., HTML, Markdown, source code, plain text) and transform them into a standardized, normalized representation. This decouples the downstream components, such as the [Concept Extractor](./concept-extractor.md), from the complexities of file parsing, content cleaning, and metadata extraction [Source 4].

This subsystem handles tasks such as:
- Reading source files from disk.
- Parsing format-specific content.
- Extracting the main textual content while removing noise like ads, navigation bars, and sidebars from web pages [Source 2].
- Identifying, downloading, and resolving paths for images embedded in documents [Source 2, Source 4].
- Extracting relevant metadata, such as titles and authors [Source 2, Source 3, Source 4].
- Classifying the source's credibility using a `SourceTrustLevel` [Source 4].
- Producing a single, consistent `IngestedContent` object that serves as the input for the rest of the compilation process [Source 4].

## Architecture

The system is designed around a pluggable architecture centered on the `[[[[[[[[Ingester]]]]]]]]` interface. This interface defines a contract that any format-specific parser must adhere to, ensuring that new file types can be supported by creating new implementations [Source 4].

The core components include:

*   **`Ingester` Interface**: A contract specifying the supported file extensions and MIME types, and an `ingest` method that takes a file path and returns a promise of `IngestedContent` [Source 4].
*   **`IngestedContent`**: The standardized output data structure. It contains the extracted text, a list of resolved `ImageRef` objects, metadata, the source file path, a flag indicating if the extraction was `lossy`, and a `SourceTrustLevel` [Source 4].
*   **Concrete Ingesters**: The framework provides several built-in Ingesters:
    *   `htmlIngester`: Handles `.html` and `.htm` files. It uses a pipeline of JSDOM for parsing, Mozilla Readability for main content extraction, and Turndown for converting the cleaned HTML to Markdown. This Ingester also manages downloading external images and resolving local image paths. It requires optional peer dependencies (`@mozilla/readability`, `jsdom`, `turndown`) and provides clear error messages if they are not installed [Source 2].
    *   `plainTextIngester`: A lossless ingester for `.txt`, `.csv`, and `.tsv` files [Source 3].
    *   `jsonIngester`: Handles `.json` and `.yml` files. It attempts to extract a title from common fields and formats the content as a pretty-printed JSON code block within a Markdown structure [Source 3].
    *   `codeIngester`: Processes various source code files (e.g., `.ts`, `.py`, `.go`). It wraps the code in a fenced Markdown block with language detection, extracts file-level docstrings to use as a summary, and caps file reads at 500KB to prevent out-of-[Memory](../concepts/memory.md) errors on large, generated files [Source 3].
*   **`KBClipper`**: A high-level utility class that uses the `htmlIngester` to programmatically "clip" content from a URL, mimicking the functionality of a web clipper browser extension. It fetches the URL, extracts the content, downloads images, and saves the result as a Markdown file [Source 2].
*   **[Source Trust Classification](../concepts/source-trust-classification.md)**: During ingestion, a `SourceTrustLevel` is assigned to the content based on heuristics like directory structure (e.g., files in `papers/` are marked `academic`) or source type (e.g., URL-clipped content is marked `web`). This classification influences how the content is weighted in later stages [Source 4].

## Integration Points

The Knowledge Ingestion System is the entry point for the [Knowledge Compiler](./knowledge-compiler.md). Its output directly feeds into the next major subsystem, the Concept Extractor.

*   The Concept Extractor consumes the `IngestedContent` objects produced by this system [Source 1].
*   The `text` and `metadata` from `IngestedContent` are used to perform static analysis and generate prompts for the [LLM](../concepts/llm.md) during concept extraction [Source 1].
*   The `SourceTrustLevel` assigned during ingestion is carried forward into the `ArticlePlan` within the `CompilationPlan`, where it affects grounding scores and is recorded in the final compiled article's [Frontmatter](../concepts/frontmatter.md) [Source 1, Source 4].

## Key APIs

*   **`Ingester`**: The primary interface for creating new file format handlers. It requires implementers to define `supportedMimeTypes`, `supportedExtensions`, and an `async ingest(...)` method [Source 4].
*   **`IngestedContent`**: The normalized data structure that represents a processed source document. It is the main data transfer object produced by this subsystem [Source 4].
*   **`SourceTrustLevel`**: A type alias for the strings `"academic" | "documentation" | "web" | "unknown"`, used to classify the credibility of a source document. The associated `SOURCE_TRUST_WEIGHTS` constant defines multipliers used in downstream scoring [Source 4].
*   **`KBClipper`**: A class providing a high-level API for fetching and ingesting web content from a URL. Its primary method is `clip(url)` [Source 2].
*   **`htmlIngester`, `plainTextIngester`, `jsonIngester`, `codeIngester`**: The concrete ingester objects for various common file types [Source 2, Source 3].

## Configuration

Configuration is provided via the `IngesterOptions` object passed to an ingester's `ingest` method. Key options include:

*   `imageOutputDir`: Specifies a custom directory for saving downloaded images. If not provided, it defaults to an `assets/` subdirectory next to the source file [Source 4].
*   `sourceUrl`: Provides the original URL for content that was clipped from the web, used for citation purposes in the compiled article [Source 4].

## Extension Points

The subsystem is designed for extension. To add support for a new file format, a developer can create a new object or class that implements the `Ingester` interface. This new ingester would define its supported file types and provide the logic for parsing the file and returning a valid `IngestedContent` object. The framework's compiler would then need to be configured to use this new ingester for the relevant file extensions.

## Sources

*   [Source 1]: `src/knowledge/compiler/extractor/types.ts`
*   [Source 2]: `src/knowledge/compiler/ingester/html.ts`
*   [Source 3]: `src/knowledge/compiler/ingester/text.ts`
*   [Source 4]: `src/knowledge/compiler/ingester/types.ts`