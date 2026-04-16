---
summary: Creates a PDF extraction function powered by Google's Gemini multimodal models.
export_name: makeGeminiPdfExtractor
source_file: src/knowledge/compiler/ingester/pdf.ts
category: function
title: makeGeminiPdfExtractor
entity_type: api
stub: false
compiled_at: 2026-04-16T14:24:17.662Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/ingester/pdf.ts
confidence: 1
---

## Overview
`makeGeminiPdfExtractor` is a factory function that creates a high-quality PDF extraction utility backed by the Google Gemini REST API. Unlike traditional PDF parsers that perform basic text dumps, this extractor uses Gemini's multimodal capabilities to convert PDF documents into structured Markdown.

This approach is specifically designed to preserve complex document elements that are often lost in standard extraction, including:
*   Multi-column layouts
*   Data tables
*   Mathematical equations
*   Figures and captions

The function returns a `PdfExtractFn`, which can be passed to the YAAF PDF ingester to enable LLM-based document processing.

## Signature / Constructor

```typescript
export function makeGeminiPdfExtractor(options?: GeminiPdfExtractorOptions): PdfExtractFn
```

### Parameters

The function accepts an optional `GeminiPdfExtractorOptions` object:

| Property | Type | Description |
| :--- | :--- | :--- |
| `apiKey` | `string` | Gemini API key. If not provided, the function falls back to the `GEMINI_API_KEY` environment variable. |
| `model` | `string` | The specific Gemini model to use. Defaults to `gemini-3-flash-preview`. |
| `temperature` | `number` | Controls the randomness of the extraction. Lower values (e.g., 0.1) are recommended for faithful document reproduction. Defaults to `0.1`. |
| `maxOutputTokens` | `number` | The maximum length of the generated Markdown. Defaults to `65536`. |

### Return Type

The function returns a `PdfExtractFn`:
```typescript
type PdfExtractFn = (pdfBase64: string, filename: string) => Promise<string>;
```

## Examples

### Basic Usage
Creating an extractor and manually processing a PDF file.

```typescript
import { makeGeminiPdfExtractor } from 'yaaf';

const extract = makeGeminiPdfExtractor({ 
  apiKey: process.env.GEMINI_API_KEY 
});

// Assuming pdfBase64 is a base64-encoded string of a PDF file
const markdown = await extract(pdfBase64, 'research-paper.pdf');
console.log(markdown);
```

### Integration with PDF Ingester
Using the Gemini extractor to provide high-quality ingestion for the YAAF knowledge subsystem.

```typescript
import { makeGeminiPdfExtractor, pdfIngester } from 'yaaf';

const pdfExtractFn = makeGeminiPdfExtractor({
  model: 'gemini-3-flash-preview',
  temperature: 0
});

const content = await pdfIngester.ingest('path/to/document.pdf', {
  pdfExtractFn
});

console.log(content.text); // Structured Markdown with tables and equations
```