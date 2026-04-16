---
summary: Automatically selects the best available PDF extractor based on environment variables.
export_name: autoDetectPdfExtractor
source_file: src/knowledge/compiler/ingester/pdf.ts
category: function
title: autoDetectPdfExtractor
entity_type: api
stub: false
compiled_at: 2026-04-16T14:24:23.671Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/ingester/pdf.ts
confidence: 1
---

## Overview
`autoDetectPdfExtractor` is a utility function designed to simplify the configuration of high-quality PDF ingestion. It inspects the system environment for known LLM provider API keys and returns a pre-configured extraction function (`PdfExtractFn`) for the first provider it finds.

This function is primarily used to enable multimodal LLM-based PDF extraction, which preserves complex document structures like tables, equations, and multi-column layouts more effectively than traditional text-parsing methods.

The function follows a specific priority order optimized for cost and speed for the specific task of document conversion:
1.  **Gemini** (checks for `GEMINI_API_KEY`): Preferred for being fast and cost-effective for PDF processing.
2.  **OpenAI** (checks for `OPENAI_API_KEY`): Used if Gemini is unavailable.
3.  **Claude** (checks for `ANTHROPIC_API_KEY`): Used for high-quality extraction if other keys are missing.

If no supported API keys are detected, the function returns `undefined`. In the context of the YAAF PDF ingester, this result typically triggers a fallback to basic text extraction using the `pdf-parse` library.

## Signature / Constructor

```typescript
export function autoDetectPdfExtractor(): PdfExtractFn | undefined;
```

### Return Value
Returns a `PdfExtractFn` (an asynchronous function that accepts a base64 string and filename and returns Markdown) or `undefined` if no environment variables are set.

## Examples

### Basic Usage
This example demonstrates how to use the detector to conditionally enable LLM-based extraction during PDF ingestion.

```typescript
import { autoDetectPdfExtractor, pdfIngester } from 'yaaf/knowledge';

const pdfExtractFn = autoDetectPdfExtractor();

if (pdfExtractFn) {
  console.log('Using LLM-based PDF extraction');
}

const content = await pdfIngester.ingest('path/to/document.pdf', {
  pdfExtractFn
});
```

## See Also
* `makeGeminiPdfExtractor`
* `makeClaudePdfExtractor`
* `makeOpenAIPdfExtractor`
* `pdfIngester`