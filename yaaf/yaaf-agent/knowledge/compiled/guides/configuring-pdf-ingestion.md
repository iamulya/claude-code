---
summary: How to set up high-quality PDF extraction using LLMs or basic text extraction fallback.
title: Configuring PDF Ingestion
entity_type: guide
stub: false
compiled_at: 2026-04-16T14:24:28.821Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/ingester/pdf.ts
confidence: 0.9
---

---
title: Configuring PDF Ingestion
entity_type: guide
summary: How to set up high-quality PDF extraction using LLMs or basic text extraction fallback.
difficulty: intermediate

## Overview
YAAF provides a flexible PDF ingestion system designed to handle everything from simple text documents to complex research papers containing tables, equations, and multi-column layouts. The framework supports two primary extraction strategies:

1.  **LLM-based Extraction (Recommended):** Uses multimodal LLMs to convert PDF pages into structured Markdown. This method preserves formatting, mathematical notation, and tabular data.
2.  **Basic Text Extraction (Fallback):** Uses the `pdf-parse` library to perform a standard text dump. This method is faster and works offline but often loses structural context and garbles complex layouts.

## Prerequisites
To use LLM-based extraction, you must have an API key for a supported provider:
*   **Google:** `GEMINI_API_KEY`
*   **OpenAI:** `OPENAI_API_KEY`
*   **Anthropic:** `ANTHROPIC_API_KEY`

To use the basic fallback, you must install the optional dependency:
```bash
npm install pdf-parse
```

## Step-by-Step

### 1. Using Automatic Detection
The simplest way to enable high-quality extraction is to use `autoDetectPdfExtractor()`. This function checks your environment variables and selects the best available provider.

```typescript
import { pdfIngester, autoDetectPdfExtractor } from 'yaaf/knowledge';

const pdfExtractFn = autoDetectPdfExtractor();

const content = await pdfIngester.ingest('path/to/document.pdf', {
  pdfExtractFn
});
```
**Priority Order:** Gemini (fastest/cheapest) > OpenAI > Claude.

### 2. Configuring a Specific Provider
If you need to customize the model, temperature, or API credentials, you can instantiate a specific extractor.

#### Gemini Extractor
Gemini is the default recommended provider due to its native PDF support and cost efficiency.
```typescript
import { makeGeminiPdfExtractor } from 'yaaf/knowledge';

const extractFn = makeGeminiPdfExtractor({
  apiKey: process.env.CUSTOM_GEMINI_KEY,
  model: 'gemini-3-flash-preview',
  temperature: 0.1
});
```

#### Claude Extractor
Claude uses a combination of text and image processing for high-fidelity extraction.
```typescript
import { makeClaudePdfExtractor } from 'yaaf/knowledge';

const extractFn = makeClaudePdfExtractor({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-sonnet-4-20250514'
});
```

#### OpenAI Extractor
The OpenAI extractor is compatible with GPT-4o and OpenAI-compatible APIs like Azure or Together AI.
```typescript
import { makeOpenAIPdfExtractor } from 'yaaf/knowledge';

const extractFn = makeOpenAIPdfExtractor({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o'
});
```

### 3. Implementing a Custom Extractor
You can provide a custom implementation of the `PdfExtractFn` type to use any LLM or external service.

```typescript
import { PdfExtractFn } from 'yaaf/knowledge';

const myCustomExtractor: PdfExtractFn = async (pdfBase64, filename) => {
  // Your custom logic here
  const response = await myLlm.generate({
    files: [{ data: pdfBase64, mimeType: 'application/pdf' }],
    prompt: 'Convert this PDF to Markdown.'
  });
  return response.text;
};
```

## Configuration Reference

### GeminiPdfExtractorOptions
| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `apiKey` | `string` | `GEMINI_API_KEY` | Google AI API key. |
| `model` | `string` | `'gemini-3-flash-preview'` | Multimodal model to use. |
| `temperature` | `number` | `0.1` | Lower values are more faithful to the source. |
| `maxOutputTokens`| `number` | `65536` | Maximum length of the extracted Markdown. |

### ClaudePdfExtractorOptions
| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `apiKey` | `string` | `ANTHROPIC_API_KEY` | Anthropic API key. |
| `model` | `string` | `'claude-sonnet-4-20250514'` | Model with PDF support. |
| `maxTokens` | `number` | `16384` | Maximum output tokens. |

### OpenAIPdfExtractorOptions
| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `apiKey` | `string` | `OPENAI_API_KEY` | OpenAI API key. |
| `model` | `string` | `'gpt-4o'` | Model with vision/file support. |
| `baseUrl` | `string` | `https://api.openai.com/v1` | Useful for Azure or local proxies. |

## Common Mistakes
*   **Missing `pdf-parse`:** If no `pdfExtractFn` is provided and the `pdf-parse` package is not installed, the ingester will throw an error.
*   **Non-Multimodal Models:** Attempting to use a text-only model (like `gpt-3.5-turbo`) for PDF extraction will fail, as these models cannot process the raw file bytes.
*   **Large Files:** Very large PDFs may exceed the token limits of the extraction model. For extremely long documents, consider splitting the PDF before ingestion.

## Next Steps
*   Learn about the **Knowledge Compiler** to see how PDF ingestion fits into the broader RAG pipeline.
*   Explore **Custom Ingesters** to handle non-standard document formats.