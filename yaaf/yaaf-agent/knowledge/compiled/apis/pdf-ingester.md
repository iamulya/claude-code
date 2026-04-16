---
summary: The default implementation for processing PDF files within the YAAF knowledge system.
export_name: pdfIngester
source_file: src/knowledge/compiler/ingester/pdf.ts
category: constant
title: pdfIngester
entity_type: api
stub: false
compiled_at: 2026-04-16T14:24:09.048Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/ingester/pdf.ts
confidence: 1
---

## Overview
`pdfIngester` is the standard implementation for processing PDF documents within the YAAF knowledge subsystem. It converts PDF files into structured Markdown content using one of two strategies: high-quality LLM-based extraction or basic text extraction via `pdf-parse`.

The ingester is designed to handle complex document elements such as tables, equations, figures, and multi-column layouts when paired with a multimodal LLM. If no LLM extractor is provided, it falls back to a lossy text-only extraction.

## Signature / Constructor

```typescript
export const pdfIngester: Ingester;
```

### PdfIngesterOptions
The `ingest` method accepts an options object extending the base `IngesterOptions`.

```typescript
export type PdfIngesterOptions = IngesterOptions & {
  /**
   * LLM-based PDF extraction function.
   * When provided, enables high-quality extraction with tables, equations, and figures.
   * When omitted, falls back to basic pdf-parse text dump.
   */
  pdfExtractFn?: PdfExtractFn
}
```

### PdfExtractFn
A functional type used to define how the PDF bytes are converted to Markdown.

```typescript
export type PdfExtractFn = (pdfBase64: string, filename: string) => Promise<string>;
```

## Methods & Properties

### ingest()
The primary method for processing a file.
- **Parameters**: 
  - `filePath`: `string` - Path to the PDF file.
  - `options`: `PdfIngesterOptions` (optional) - Configuration including the extraction strategy.
- **Returns**: `Promise<IngestedContent>`

### Extractor Factories
The framework provides several factory functions to create `PdfExtractFn` instances for major LLM providers:

#### makeGeminiPdfExtractor()
Creates an extractor using the Gemini REST API.
- **Default Model**: `gemini-3-flash-preview`
- **Environment Variable**: `GEMINI_API_KEY`

#### makeClaudePdfExtractor()
Creates an extractor using the Anthropic Messages API.
- **Default Model**: `claude-sonnet-4-20250514`
- **Environment Variable**: `ANTHROPIC_API_KEY`

#### makeOpenAIPdfExtractor()
Creates an extractor using the OpenAI Chat Completions API. Supports OpenAI-compatible APIs (Azure, Together, Fireworks) via the `baseUrl` option.
- **Default Model**: `gpt-4o`
- **Environment Variable**: `OPENAI_API_KEY`

#### autoDetectPdfExtractor()
Automatically detects and creates the best available PDF extractor based on environment variables. It prioritizes Gemini (for cost/speed), followed by OpenAI, and then Claude.

## Examples

### High-Quality Extraction with Gemini
This approach preserves tables and formatting by using a multimodal LLM.

```typescript
import { pdfIngester, makeGeminiPdfExtractor } from 'yaaf';

const content = await pdfIngester.ingest('path/to/paper.pdf', {
  pdfExtractFn: makeGeminiPdfExtractor({
    apiKey: process.env.GEMINI_API_KEY,
    model: 'gemini-3-flash-preview'
  })
});

console.log(content.text); // Structured Markdown
```

### Automatic Extractor Detection
Simplifies configuration by relying on available environment variables.

```typescript
import { pdfIngester, autoDetectPdfExtractor } from 'yaaf';

const content = await pdfIngester.ingest('path/to/document.pdf', {
  pdfExtractFn: autoDetectPdfExtractor()
});
```

### Basic Text Fallback
If no `pdfExtractFn` is provided, the ingester requires the `pdf-parse` package to be installed.

```typescript
import { pdfIngester } from 'yaaf';

// Requires: npm install pdf-parse
const content = await pdfIngester.ingest('path/to/document.pdf');
console.log(content.metadata.extractionMethod); // 'pdf-parse'
```

## See Also
- `Ingester` (interface)
- `IngestedContent` (type)