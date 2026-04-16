---
summary: Creates a PDF extraction function powered by Anthropic's Claude models.
export_name: makeClaudePdfExtractor
source_file: src/knowledge/compiler/ingester/pdf.ts
category: function
title: makeClaudePdfExtractor
entity_type: api
stub: false
compiled_at: 2026-04-16T14:24:17.182Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/ingester/pdf.ts
confidence: 1
---

## Overview
`makeClaudePdfExtractor` is a factory function that creates a `PdfExtractFn` backed by the Anthropic Messages API. It is used within the YAAF knowledge ingestion pipeline to perform high-quality, LLM-based PDF extraction. 

Unlike basic text-dump methods, this extractor leverages Claude's native PDF understanding via `document` content blocks. It processes document pages as both text and images, allowing it to faithfully preserve complex structures such as tables, mathematical equations, figures, and multi-column layouts by converting them into structured Markdown.

## Signature / Constructor

```typescript
export function makeClaudePdfExtractor(options?: ClaudePdfExtractorOptions): PdfExtractFn
```

### ClaudePdfExtractorOptions
The configuration object for the Claude extractor:

| Property | Type | Description |
| :--- | :--- | :--- |
| `apiKey` | `string` | Anthropic API key. Falls back to the `ANTHROPIC_API_KEY` environment variable if not provided. |
| `model` | `string` | The specific Claude model to use. Defaults to `claude-sonnet-4-20250514`. |
| `temperature` | `number` | Controls the randomness of the extraction. Lower values (closer to 0) are more faithful to the source text. Default: `0.1`. |
| `maxTokens` | `number` | The maximum number of tokens in the generated Markdown output. Default: `16384`. |

### PdfExtractFn
The returned function has the following signature:
```typescript
type PdfExtractFn = (pdfBase64: string, filename: string) => Promise<string>;
```

## Examples

### Basic Usage
Creating an extractor and using it to convert a PDF to Markdown.

```typescript
import { makeClaudePdfExtractor } from 'yaaf';

const extract = makeClaudePdfExtractor({ 
  apiKey: process.env.ANTHROPIC_API_KEY 
});

// pdfBase64 is a base64-encoded string of the PDF file
const markdown = await extract(pdfBase64, 'research-paper.pdf');
console.log(markdown);
```

### Integration with pdfIngester
Passing the Claude extractor to the PDF ingester for high-quality document processing.

```typescript
import { pdfIngester, makeClaudePdfExtractor } from 'yaaf';

const content = await pdfIngester.ingest('path/to/document.pdf', {
  pdfExtractFn: makeClaudePdfExtractor({
    model: 'claude-sonnet-4-20250514',
    temperature: 0
  })
});
```

## See Also
- `PdfExtractFn`
- `pdfIngester`
- `makeGeminiPdfExtractor`
- `makeOpenAIPdfExtractor`