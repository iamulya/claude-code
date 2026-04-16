---
summary: The process of auto-detecting, parsing, and normalizing diverse file formats into a unified representation for the framework's knowledge base.
title: Knowledge Ingestion
entity_type: concept
stub: false
compiled_at: 2026-04-16T14:23:35.960Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/ingester/html.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/ingester/index.ts
confidence: 0.95
---

## What It Is
Knowledge Ingestion is the normalization layer of the YAAF knowledge subsystem. It provides a unified mechanism for transforming heterogeneous data sources—such as raw HTML, PDFs, source code, and structured data—into a consistent internal representation (`IngestedContent`). 

The primary goal of ingestion is to strip away format-specific "noise" (such as navigation bars in HTML or binary headers in PDFs) while preserving essential semantic content, metadata, and associated assets like images. This ensures that downstream processes, such as embedding and retrieval, operate on clean, high-signal text.

## How It Works in YAAF
The ingestion process is managed by an **Ingester Registry**, which acts as a central dispatch. When a file is processed, the framework auto-detects the appropriate handler based on file extension and MIME type.

### The Ingestion Pipeline
1.  **Resolution**: The `resolveIngester` function identifies the correct `Ingester` implementation for a given file path.
2.  **Extraction**: The specific ingester parses the raw file. For complex formats like HTML, this involves noise removal.
3.  **Asset Management**: Ingesters identify and extract external or embedded assets (primarily images). These are downloaded or saved to a local `assets/` directory and tracked via `ImageRef` objects.
4.  **Normalization**: Content is converted into a standard format (usually Markdown) and returned as an `IngestedContent` object containing the text, metadata, and image references.

### Supported Formats
YAAF includes several specialized ingesters:

| Format | Extensions | Implementation Details |
| :--- | :--- | :--- |
| **Markdown** | `.md`, `.mdx` | Primary path; handles Obsidian Web Clipper (OWC) output with zero overhead. |
| **HTML** | `.html`, `.htm` | Uses Mozilla Readability for article extraction and Turndown for Markdown conversion. |
| **Plain Text** | `.txt`, `.csv`, `.tsv` | Ingested as-is. |
| **Structured Data** | `.json`, `.yaml` | Pretty-printed to maintain structural context. |
| **Source Code** | `.ts`, `.py`, etc. | Wrapped in fenced blocks with docstring preservation. |
| **PDF** | `.pdf` | Requires specialized extractors (e.g., Gemini, Claude, or OpenAI-based extractors). |

### HTML Ingestion and Clipping
The `htmlIngester` utilizes a production-grade pipeline to ensure high-quality text extraction:
*   **JSDOM**: Provides a Node.js-compatible DOM for parsing.
*   **Mozilla Readability**: The same algorithm used in Firefox Reader Mode to strip ads, sidebars, and cookie banners.
*   **Turndown**: Converts the cleaned HTML into clean Markdown.

For programmatic web scraping, the `KBClipper` class provides a wrapper around the `htmlIngester`. It fetches a URL, extracts the content, and saves it in a directory structure compatible with the Obsidian Web Clipper.

### Optional Dependencies
To keep the core framework lightweight, certain ingesters (HTML and PDF) require optional peer dependencies. If a developer attempts to ingest a file without the necessary libraries (e.g., `@mozilla/readability`, `jsdom`, or `turndown`), the framework throws a descriptive error. The `requiredOptionalDeps` utility allows the framework to perform pre-flight checks before starting a bulk compilation.

## Configuration
Developers interact with the ingestion system primarily through the `ingestFile` function and the `IngesterOptions` interface.

```typescript
import { ingestFile } from 'yaaf/knowledge/compiler/ingester';

const content = await ingestFile('path/to/document.html', {
  imageOutputDir: './assets/images',
  sourceUrl: 'https://example.com/article',
});

console.log(content.title);
console.log(content.text); // Normalized Markdown
```

### IngesterOptions
The ingestion process can be customized with the following parameters:
*   `imageOutputDir`: The directory where extracted images should be stored.
*   `sourceUrl`: The original URL of the content (used for resolving relative links in HTML).
*   `metadata`: Additional key-value pairs to attach to the ingested content.

## See Also
* [[Knowledge Base]]
* [[KBClipper]]