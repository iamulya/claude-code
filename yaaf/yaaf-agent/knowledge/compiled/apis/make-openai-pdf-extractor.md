---
summary: Creates a PDF extraction function powered by OpenAI's GPT-4o or compatible models.
export_name: makeOpenAIPdfExtractor
source_file: src/knowledge/compiler/ingester/pdf.ts
category: function
title: makeOpenAIPdfExtractor
entity_type: api
stub: false
compiled_at: 2026-04-16T14:24:22.177Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/ingester/pdf.ts
confidence: 1
---

## Overview
`makeOpenAIPdfExtractor` is a factory function that creates a PDF extraction utility compatible with the YAAF ingestion system. It utilizes the OpenAI Chat Completions API (specifically multimodal models like GPT-4o) to convert PDF documents into structured Markdown.

Unlike traditional text-based PDF parsers, this LLM-based approach preserves complex document structures, including tables, mathematical equations, figures, and multi-column layouts. The function is also compatible with OpenAI-compliant provider APIs, such as Azure OpenAI, Together, or Fireworks, through the configuration of the base URL.

## Signature / Constructor

```typescript
export function makeOpenAIPdfExtractor(options?: OpenAIPdfExtractorOptions): PdfExtractFn;
```

### Parameters

The function accepts an optional `OpenAIPdfExtractorOptions` object:

| Property | Type | Description |
| :--- | :--- | :--- |
| `apiKey` | `string` | OpenAI API key. If omitted, the function attempts to use the `OPENAI_API_KEY` environment variable. |
| `model` | `string` | The model identifier to use. Defaults to `gpt-4o`. |
| `temperature` | `number` | The sampling temperature for extraction. Lower values (e.g., 0.1) are recommended for faithful reproduction. Defaults to `0.1`. |
| `maxTokens` | `number` | The maximum number of tokens allowed in the generated Markdown output. Defaults to `16384`. |
| `baseUrl` | `string` | The base URL for the API request. Defaults to `https://api.openai.com/v1`. |

### Return Type

The function returns a `PdfExtractFn`, which is an asynchronous function with the following signature:
```typescript
type PdfExtractFn = (pdfBase64: string, filename: string) => Promise<string>;
```

## Examples

### Basic Usage
This example demonstrates creating an extractor using the default OpenAI configuration and an environment variable for the API key.

```typescript
import { makeOpenAIPdfExtractor } from 'yaaf';

// Initialize the extractor
const extract = makeOpenAIPdfExtractor({
  apiKey: process.env.OPENAI_API_KEY
});

// Use the extractor to convert a base64 PDF string to Markdown
const markdown = await extract(pdfBase64String, 'research_paper.pdf');
console.log(markdown);
```

### Azure OpenAI Configuration
The `baseUrl` option allows the extractor to work with Azure OpenAI deployments or other OpenAI-compatible endpoints.

```typescript
import { makeOpenAIPdfExtractor } from 'yaaf';

const extract = makeOpenAIPdfExtractor({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  baseUrl: 'https://my-resource.openai.azure.com/openai/deployments/gpt-4o',
  model: 'gpt-4o',
});

const markdown = await extract(pdfBase64String, 'document.pdf');
```

## See Also
- `makeGeminiPdfExtractor`
- `makeClaudePdfExtractor`
- `autoDetectPdfExtractor`