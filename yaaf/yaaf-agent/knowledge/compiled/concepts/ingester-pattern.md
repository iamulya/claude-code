---
summary: The core abstraction in YAAF for processing raw files into structured content via specialized handlers based on MIME types or extensions.
title: Ingester Pattern
entity_type: concept
stub: false
compiled_at: 2026-04-16T14:24:43.464Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/ingester/text.ts
confidence: 0.9
---

---
title: Ingester Pattern
entity_type: concept
summary: The core abstraction in YAAF for processing raw files into structured content via specialized handlers based on MIME types or extensions.
related_subsystems:
  - Knowledge Compiler

## What It Is
The Ingester Pattern is a design principle in YAAF used to normalize diverse data sources into a unified format suitable for LLM consumption. It solves the problem of handling various file formats (such as plain text, structured data, and source code) by providing a consistent interface for extraction, metadata generation, and content transformation.

By decoupling the file-reading logic from the core knowledge processing pipeline, YAAF allows for extensible support of new file types without modifying the underlying compiler architecture.

## How It Works in YAAF
In YAAF, an Ingester is an object that implements the `Ingester` interface. Each ingester defines the types of files it can handle and provides a method to transform those files into `IngestedContent`.

### The Ingester Interface
An ingester typically contains the following properties and methods:
- **supportedMimeTypes**: An array of strings (e.g., `['text/plain', 'application/json']`).
- **supportedExtensions**: An array of file extensions (e.g., `['txt', 'json', 'ts']`).
- **requiresOptionalDeps**: A boolean indicating if the ingester needs external libraries not included in the YAAF core.
- **ingest(filePath, options)**: An asynchronous method that reads a file and returns an `IngestedContent` object.

### Standard Implementations
YAAF provides several built-in ingesters:

1.  **Plain Text Ingester**: Handles `.txt`, `.csv`, and `.tsv` files. It performs a simple UTF-8 read and attempts to extract a title from the first non-empty line of the file.
2.  **JSON/YAML Ingester**: Processes structured data. It parses the content and extracts titles from common fields like `title`, `name`, or `id`. It also generates a structural summary of top-level keys before pretty-printing the content into a Markdown-compatible JSON block.
3.  **Source Code Ingester**: Supports multiple programming languages (TypeScript, Python, Go, etc.). It wraps the raw code in fenced code blocks with appropriate language tags and extracts file-level documentation (such as JSDoc or Python docstrings) to serve as the document's title and summary.

### IngestedContent Structure
The result of an ingestion process is a standardized object containing:
- `text`: The processed string content (often formatted as Markdown).
- `title`: An extracted or generated title for the document.
- `mimeType`: The detected or assigned MIME type.
- `sourceFile`: The path to the original file.
- `metadata`: A key-value store for implementation-specific data (e.g., programming language).
- `lossy`: A boolean indicating if information was discarded during processing.

## Configuration
Ingesters are typically invoked by the knowledge compiler. Developers can influence the ingestion process via `IngesterOptions`, which allows for passing context such as a `sourceUrl`.

```typescript
export const plainTextIngester: Ingester = {
  supportedMimeTypes: ['text/plain', 'text/csv'],
  supportedExtensions: ['txt', 'csv', 'tsv'],
  requiresOptionalDeps: false,

  async ingest(filePath: string, options: IngesterOptions = {}): Promise<IngestedContent> {
    const text = await readFile(filePath, 'utf-8')
    const firstLine = text.split('\n').find(l => l.trim().length > 0)?.trim()

    return {
      text,
      images: [],
      mimeType: 'text/plain',
      sourceFile: filePath,
      title: firstLine?.slice(0, 80),
      metadata: {},
      lossy: false,
      sourceUrl: options.sourceUrl,
    }
  },
}
```

## Sources
- `src/knowledge/compiler/ingester/text.ts`