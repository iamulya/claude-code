---
primary_files:
  - src/knowledge/compiler/ingester/index.ts
  - src/knowledge/compiler/ingester/types.ts
  - src/knowledge/compiler/ingester/markdown.ts
  - src/knowledge/compiler/ingester/html.ts
  - src/knowledge/compiler/ingester/pdf.ts
title: Knowledge Ingestion Subsystem
entity_type: subsystem
summary: A central dispatch system that auto-detects file formats and delegates to specialized ingesters to produce normalized content for the YAAF knowledge base.
exports:
  - ingestFile
  - resolveIngester
  - canIngest
  - makeGeminiPdfExtractor
  - makeClaudePdfExtractor
  - makeOpenAIPdfExtractor
  - autoDetectPdfExtractor
stub: false
compiled_at: 2026-04-16T14:23:57.258Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/ingester/index.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/ingester/markdown.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/ingester/pdf.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/ingester/text.ts
confidence: 1
---

## Purpose
The Knowledge Ingestion Subsystem serves as the entry point for raw data into the YAAF knowledge pipeline. Its primary role is to resolve the format of a source file—via file extension or MIME type—and delegate the extraction process to a specialized `Ingester`. 

The subsystem normalizes diverse inputs (Markdown, PDF, HTML, source code, JSON, and plain text) into a standard `IngestedContent` object. This object contains cleaned text, metadata, and resolved asset references (such as images), ensuring that downstream processes like embedding and indexing receive consistent data regardless of the original source format.

## Architecture
The subsystem is structured around a central registry and a set of format-specific implementation modules.

### Ingester Registry
The registry (defined in `index.ts`) acts as the dispatcher. It provides logic to:
- **Resolve Ingesters**: Matches a file path to an implementation based on a priority-ordered list of extensions and MIME types.
- **Dependency Management**: Identifies if a specific file requires optional peer dependencies (e.g., `jsdom` for HTML or `pdf-parse` for basic PDF extraction) before processing begins.

### Specialized Ingesters
- **Markdown Ingester**: The primary ingestion path, optimized for outputs from tools like Obsidian Web Clipper. It handles YAML frontmatter extraction, title resolution from H1 tags, and local image path resolution.
- **PDF Ingester**: Features a dual-strategy approach. It prefers high-fidelity, LLM-based extraction to preserve tables and layouts but can fall back to basic text extraction if no LLM provider is configured.
- **Source Code Ingester**: Supports multiple languages (TypeScript, Python, Go, etc.). It wraps code in Markdown fenced blocks and attempts to extract file-level docstrings or JSDoc comments to serve as the document title and summary.
- **Structured Data Ingester**: Handles JSON and YAML by pretty-printing the content and generating a structural summary of top-level fields.
- **Plain Text Ingester**: Provides a zero-dependency path for `.txt`, `.csv`, and `.tsv` files.

## Key APIs
The subsystem exposes several high-level functions for file processing:

- `ingestFile(filePath, options)`: The main entry point. Automatically selects the correct ingester and returns `Promise<IngestedContent>`.
- `resolveIngester(filePath)`: Returns the `Ingester` instance associated with the file type.
- `canIngest(filePath)`: A boolean check to verify if the framework supports a given file format.
- `autoDetectPdfExtractor()`: Utility to initialize the best available LLM-based PDF extractor based on environment variables (`GEMINI_API_KEY`, `OPENAI_API_KEY`, or `ANTHROPIC_API_KEY`).

### Data Structures
The core output of any ingester is the `IngestedContent` interface:
```typescript
export interface IngestedContent {
  text: string;           // The extracted/normalized text
  images: ImageRef[];     // Resolved local paths to images
  mimeType: string;       // Original or normalized MIME type
  sourceFile: string;     // Path to the original file
  title?: string;         // Extracted document title
  metadata: Record<string, unknown>; // Format-specific metadata
  lossy: boolean;         // Whether structural information was lost
  sourceUrl?: string;     // Original URL if the content was clipped
}
```

## Configuration
Ingestion behavior is controlled via `IngesterOptions`. Specific ingesters may extend these options, most notably the `PdfIngesterOptions` which allows for the injection of a `PdfExtractFn`.

### PDF Extraction Strategies
The PDF ingester supports three primary LLM providers for high-quality extraction:
1. **Gemini**: Created via `makeGeminiPdfExtractor()`. Recommended for its speed and native PDF support.
2. **Claude**: Created via `makeClaudePdfExtractor()`. Uses Anthropic's native document processing.
3. **OpenAI**: Created via `makeOpenAIPdfExtractor()`. Compatible with GPT-4o and OpenAI-compatible APIs (e.g., Azure).

If no LLM extractor is provided, the system requires the `pdf-parse` package to be installed for basic text-only extraction.

### Optional Dependencies
Certain formats require external libraries that are not bundled with the core framework:
- **HTML**: Requires `@mozilla/readability`, `jsdom`, and `turndown`.
- **Basic PDF**: Requires `pdf-parse`.

## Extension Points
Developers can extend the ingestion capabilities in two ways:
1. **Custom PDF Extractors**: By implementing the `PdfExtractFn` type, developers can use any multimodal LLM to convert PDFs to Markdown.
2. **Ingester Implementation**: New formats can be supported by creating objects that satisfy the `Ingester` interface, which requires `supportedExtensions`, `supportedMimeTypes`, and an `ingest` method.

```typescript
export type PdfExtractFn = (pdfBase64: string, filename: string) => Promise<string>;

export interface Ingester {
  supportedMimeTypes: string[];
  supportedExtensions: string[];
  requiresOptionalDeps: boolean;
  ingest(filePath: string, options?: IngesterOptions): Promise<IngestedContent>;
}
```

## Sources
- `src/knowledge/compiler/ingester/index.ts`
- `src/knowledge/compiler/ingester/markdown.ts`
- `src/knowledge/compiler/ingester/pdf.ts`
- `src/knowledge/compiler/ingester/text.ts`