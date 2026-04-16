---
summary: A strategy for converting PDFs to Markdown using multimodal LLMs to preserve complex structures like tables, equations, and multi-column layouts.
title: LLM-based PDF Extraction
entity_type: concept
stub: false
compiled_at: 2026-04-16T14:24:06.873Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/ingester/pdf.ts
confidence: 0.98
---

---
title: LLM-based PDF Extraction
entity_type: concept
summary: A strategy for converting PDFs to Markdown using multimodal LLMs to preserve complex structures like tables, equations, and multi-column layouts.
related_subsystems:
  - knowledge-compiler
  - ingester

## What It Is
LLM-based PDF Extraction is a high-fidelity document processing strategy used within YAAF to convert PDF files into structured Markdown. Unlike traditional PDF parsing, which often results in garbled text when encountering multi-column layouts, tables, or mathematical equations, this approach leverages multimodal Large Language Models (LLMs) to "read" and reconstruct the document's visual and semantic structure.

This concept solves the problem of "lossy" data ingestion in RAG (Retrieval-Augmented Generation) pipelines, where the loss of structural context (such as table headers or equation formatting) significantly degrades the performance of the downstream agent.

## How It Works in YAAF
The core of this system is the `PdfExtractFn` type, an abstraction that defines a function taking a PDF as a base64 string and returning a clean Markdown string.

The `pdfIngester` implementation follows a two-tier strategy:
1.  **LLM-based Extraction (High Quality):** If a `PdfExtractFn` is provided in the `PdfIngesterOptions`, the ingester uses the LLM to perform the conversion. This method is considered non-lossy as it preserves the semantic layout of the document.
2.  **Basic Text Extraction (Fallback):** If no LLM extractor is provided, the system falls back to the `pdf-parse` library. This method is faster and requires no API calls but is marked as `lossy` because layout information, tables, and figures are typically lost or corrupted.

YAAF provides built-in factory functions for major multimodal providers:
*   **Gemini:** Uses `makeGeminiPdfExtractor`. It is the default recommendation due to its speed and cost-effectiveness for document processing.
*   **Claude:** Uses `makeClaudePdfExtractor`. It utilizes Anthropic's native PDF support, processing pages as both text and image blocks.
*   **OpenAI:** Uses `makeOpenAIPdfExtractor`. It supports GPT-4o and OpenAI-compatible APIs (such as Azure OpenAI) using the file content input format.

The `autoDetectPdfExtractor()` utility can be used to automatically select the best available extractor based on environment variables, prioritizing Gemini, then OpenAI, and finally Claude.

## Configuration
Developers configure PDF extraction by passing a `PdfExtractFn` to the ingester options.

### Using Built-in Extractors
```ts
import { 
  pdfIngester, 
  makeGeminiPdfExtractor, 
  makeClaudePdfExtractor 
} from 'yaaf/knowledge';

// Configure a Gemini-based extractor
const geminiExtractor = makeGeminiPdfExtractor({
  apiKey: process.env.GEMINI_API_KEY,
  model: 'gemini-3-flash-preview',
  temperature: 0.1
});

// Use the extractor with the PDF ingester
const content = await pdfIngester.ingest('path/to/document.pdf', {
  pdfExtractFn: geminiExtractor
});
```

### Custom Extractor Implementation
A custom extractor can be implemented to support any LLM or specialized processing logic:

```ts
const customExtractor: PdfExtractFn = async (pdfBase64, filename) => {
  const response = await myLlm.generateContent({
    parts: [
      { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
      { text: 'Convert this PDF to Markdown. Preserve tables, equations, and figures.' },
    ],
  });
  return response.text();
};
```

### Azure OpenAI Configuration
The OpenAI extractor can be redirected to Azure OpenAI or other compatible endpoints:

```ts
const azureExtractor = makeOpenAIPdfExtractor({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  baseUrl: 'https://my-resource.openai.azure.com/openai/deployments/gpt-4o',
  model: 'gpt-4o',
});
```