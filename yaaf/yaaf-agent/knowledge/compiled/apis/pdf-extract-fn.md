---
summary: A function type definition for converting PDF bytes to structured Markdown using an LLM.
export_name: PdfExtractFn
source_file: src/knowledge/compiler/ingester/pdf.ts
category: type
title: PdfExtractFn
entity_type: api
stub: false
compiled_at: 2026-04-16T14:24:09.130Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/ingester/pdf.ts
confidence: 1
---

## Overview
`PdfExtractFn` is a function type definition that serves as the core abstraction for high-quality PDF ingestion within the YAAF knowledge subsystem. It defines the interface for converting raw PDF data into structured Markdown using multimodal Large Language Models (LLMs).

Unlike traditional PDF text extraction methods that often lose layout information, implementations of `PdfExtractFn` leverage LLMs to preserve complex elements such as tables, mathematical equations, figures, and multi-column layouts. Within the `pdfIngester` strategy, providing a `PdfExtractFn` enables high-fidelity extraction; if omitted, the system falls back to basic text extraction using `pdf-parse`.

## Signature
```typescript
export type PdfExtractFn = (pdfBase64: string, filename: string) => Promise<string>;
```

### Parameters
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `pdfBase64` | `string` | The PDF document content encoded as a base64 string. |
| `filename` | `string` | The name of the source file, used for context or metadata. |

### Returns
`Promise<string>`: A promise that resolves to the structured Markdown representation of the PDF.

## Examples

### Using a Built-in Extractor
YAAF provides factory functions to create `PdfExtractFn` implementations for major providers.

```typescript
import { makeGeminiPdfExtractor } from 'yaaf/knowledge';

const extractFn = makeGeminiPdfExtractor({ 
  apiKey: process.env.GEMINI_API_KEY, 
  model: 'gemini-3-flash-preview' 
});

// The extractFn can now be passed to PdfIngesterOptions
```

### Custom Implementation
You can implement a custom extractor to use any multimodal LLM or specialized service.

```typescript
import { PdfExtractFn } from 'yaaf/knowledge';

const customExtractFn: PdfExtractFn = async (pdfBase64, filename) => {
  const response = await myLlm.generateContent({
    parts: [
      { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
      { text: 'Convert this PDF to Markdown. Preserve tables, equations, and figures.' },
    ],
  });
  return response.text();
};
```

## See Also
- `makeGeminiPdfExtractor`: Factory for Google Gemini-based extraction.
- `makeClaudePdfExtractor`: Factory for Anthropic Claude-based extraction.
- `makeOpenAIPdfExtractor`: Factory for OpenAI GPT-4o-based extraction.
- `autoDetectPdfExtractor`: Utility to automatically select an extractor based on available environment variables.
- `pdfIngester`: The ingester implementation that utilizes this function type.