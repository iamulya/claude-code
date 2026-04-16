/**
 * PDF Ingester — LLM-based extraction with configurable model
 *
 * Uses an LLM (multimodal) to convert PDF documents to structured Markdown,
 * preserving tables, equations, figures, and multi-column layouts.
 *
 * Default model: gemini-3-flash-preview (fast, cheap, excellent quality)
 * Configurable to any multimodal LLM that supports PDF/image input.
 *
 * Extraction strategy:
 * 1. If a PdfExtractFn is provided → use it (LLM-based, high quality)
 * 2. Otherwise → fall back to basic pdf-parse text dump (low quality)
 */

import { readFile } from 'fs/promises'
import { detectMimeType } from './types.js'
import type { Ingester, IngestedContent, IngesterOptions } from './types.js'

// ── PDF extraction function type ──────────────────────────────────────────────

/**
 * A function that converts raw PDF bytes to structured Markdown using an LLM.
 *
 * This is the core abstraction for PDF ingestion — it receives the PDF as a
 * base64 string and returns clean Markdown with tables, equations, and figures.
 *
 * @example Using the built-in Gemini extractor:
 * ```ts
 * const extractFn = makeGeminiPdfExtractor({ apiKey: 'AIza...', model: 'gemini-3-flash-preview' })
 * ```
 *
 * @example Custom extractor with any LLM:
 * ```ts
 * const extractFn: PdfExtractFn = async (pdfBase64) => {
 *   const response = await myLlm.generateContent({
 *     parts: [
 *       { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
 *       { text: 'Convert this PDF to Markdown. Preserve tables, equations, and figures.' },
 *     ],
 *   })
 *   return response.text()
 * }
 * ```
 */
export type PdfExtractFn = (pdfBase64: string, filename: string) => Promise<string>

// ── System prompt for PDF-to-Markdown ─────────────────────────────────────────

const PDF_SYSTEM_PROMPT = `You are a document conversion expert. Convert the provided PDF into clean, structured Markdown.

Rules:
1. Preserve ALL text content faithfully — do not summarize or skip sections
2. Use proper heading hierarchy (# for title, ## for sections, ### for subsections)
3. Convert tables to proper Markdown table syntax with aligned columns
4. Convert mathematical equations to LaTeX notation wrapped in $...$ (inline) or $$...$$ (block)
5. Represent figures as: ![Figure N: caption](figure_N) with the original caption text
6. Preserve numbered references/citations as [N] links
7. Handle multi-column layouts by reading left-to-right, top-to-bottom
8. Preserve bullet/numbered lists
9. Mark code blocks with appropriate language tags
10. Include the paper's metadata (title, authors, abstract) at the top

Output ONLY the markdown. No commentary.`

// ── Built-in Gemini PDF extractor ─────────────────────────────────────────────

export type GeminiPdfExtractorOptions = {
  /** Gemini API key. Falls back to GEMINI_API_KEY env var. */
  apiKey?: string
  /** Model to use. Default: 'gemini-3-flash-preview' */
  model?: string
  /** Temperature for extraction (lower = more faithful). Default: 0.1 */
  temperature?: number
  /** Max output tokens. Default: 65536 */
  maxOutputTokens?: number
}

/**
 * Create a PdfExtractFn backed by the Gemini REST API.
 *
 * @example
 * ```ts
 * const extract = makeGeminiPdfExtractor({ apiKey: process.env.GEMINI_API_KEY })
 * const markdown = await extract(pdfBase64, 'paper.pdf')
 * ```
 */
export function makeGeminiPdfExtractor(options: GeminiPdfExtractorOptions = {}): PdfExtractFn {
  const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error(
      'Gemini PDF extractor requires an API key.\n' +
      'Set GEMINI_API_KEY environment variable or pass apiKey in options.',
    )
  }

  const model = options.model ?? 'gemini-3-flash-preview'
  const temperature = options.temperature ?? 0.1
  const maxOutputTokens = options.maxOutputTokens ?? 65536

  return async (pdfBase64: string, filename: string): Promise<string> => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: PDF_SYSTEM_PROMPT }] },
        contents: [{
          parts: [
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: pdfBase64,
              },
            },
            {
              text: `Convert this PDF (${filename}) to clean, structured Markdown. Preserve all content including tables, equations, and figure captions.`,
            },
          ],
        }],
        generationConfig: {
          maxOutputTokens,
          temperature,
        },
      }),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(
        `Gemini PDF extraction failed (${response.status}).\n` +
        `Model: ${model}\n` +
        `File: ${filename}\n` +
        `Response: ${body.slice(0, 300)}`,
      )
    }

    const json = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
      usageMetadata?: Record<string, unknown>
    }

    const text = json.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      throw new Error(
        `Gemini returned empty response for PDF extraction.\n` +
        `Model: ${model}\n` +
        `File: ${filename}`,
      )
    }

    return text
  }
}

// ── Built-in Claude (Anthropic) PDF extractor ─────────────────────────────────

export type ClaudePdfExtractorOptions = {
  /** Anthropic API key. Falls back to ANTHROPIC_API_KEY env var. */
  apiKey?: string
  /** Model to use. Default: 'claude-sonnet-4-20250514' */
  model?: string
  /** Temperature for extraction (lower = more faithful). Default: 0.1 */
  temperature?: number
  /** Max output tokens. Default: 16384 */
  maxTokens?: number
}

/**
 * Create a PdfExtractFn backed by the Anthropic Messages API.
 *
 * Claude has native PDF understanding via `document` content blocks.
 * Each page is processed as both text and image for comprehensive understanding.
 *
 * @example
 * ```ts
 * const extract = makeClaudePdfExtractor({ apiKey: process.env.ANTHROPIC_API_KEY })
 * const markdown = await extract(pdfBase64, 'paper.pdf')
 * ```
 */
export function makeClaudePdfExtractor(options: ClaudePdfExtractorOptions = {}): PdfExtractFn {
  const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error(
      'Claude PDF extractor requires an API key.\n' +
      'Set ANTHROPIC_API_KEY environment variable or pass apiKey in options.',
    )
  }

  const model = options.model ?? 'claude-sonnet-4-20250514'
  const temperature = options.temperature ?? 0.1
  const maxTokens = options.maxTokens ?? 16384

  return async (pdfBase64: string, filename: string): Promise<string> => {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        system: PDF_SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64,
              },
            },
            {
              type: 'text',
              text: `Convert this PDF (${filename}) to clean, structured Markdown. Preserve all content including tables, equations, and figure captions.`,
            },
          ],
        }],
      }),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(
        `Claude PDF extraction failed (${response.status}).\n` +
        `Model: ${model}\n` +
        `File: ${filename}\n` +
        `Response: ${body.slice(0, 300)}`,
      )
    }

    const json = await response.json() as {
      content?: Array<{ type: string; text?: string }>
    }

    const text = json.content?.find(block => block.type === 'text')?.text
    if (!text) {
      throw new Error(
        `Claude returned empty response for PDF extraction.\n` +
        `Model: ${model}\n` +
        `File: ${filename}`,
      )
    }

    return text
  }
}

// ── Built-in OpenAI PDF extractor ─────────────────────────────────────────────

export type OpenAIPdfExtractorOptions = {
  /** OpenAI API key. Falls back to OPENAI_API_KEY env var. */
  apiKey?: string
  /** Model to use. Default: 'gpt-4o' */
  model?: string
  /** Temperature for extraction (lower = more faithful). Default: 0.1 */
  temperature?: number
  /** Max output tokens. Default: 16384 */
  maxTokens?: number
  /** Base URL for OpenAI-compatible APIs. Default: 'https://api.openai.com/v1' */
  baseUrl?: string
}

/**
 * Create a PdfExtractFn backed by the OpenAI Chat Completions API.
 *
 * Uses the file content input format to send PDFs directly to GPT-4o
 * and compatible models. Also works with OpenAI-compatible APIs (e.g.,
 * Azure OpenAI, Together, Fireworks) via the `baseUrl` option.
 *
 * @example
 * ```ts
 * const extract = makeOpenAIPdfExtractor({ apiKey: process.env.OPENAI_API_KEY })
 * const markdown = await extract(pdfBase64, 'paper.pdf')
 * ```
 *
 * @example Azure OpenAI
 * ```ts
 * const extract = makeOpenAIPdfExtractor({
 *   apiKey: process.env.AZURE_OPENAI_API_KEY,
 *   baseUrl: 'https://my-resource.openai.azure.com/openai/deployments/gpt-4o',
 *   model: 'gpt-4o',
 * })
 * ```
 */
export function makeOpenAIPdfExtractor(options: OpenAIPdfExtractorOptions = {}): PdfExtractFn {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error(
      'OpenAI PDF extractor requires an API key.\n' +
      'Set OPENAI_API_KEY environment variable or pass apiKey in options.',
    )
  }

  const model = options.model ?? 'gpt-4o'
  const temperature = options.temperature ?? 0.1
  const maxTokens = options.maxTokens ?? 16384
  const baseUrl = (options.baseUrl ?? 'https://api.openai.com/v1').replace(/\/+$/, '')

  return async (pdfBase64: string, filename: string): Promise<string> => {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: maxTokens,
        messages: [
          {
            role: 'system',
            content: PDF_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: [
              {
                type: 'file',
                file: {
                  filename,
                  file_data: `data:application/pdf;base64,${pdfBase64}`,
                },
              },
              {
                type: 'text',
                text: `Convert this PDF (${filename}) to clean, structured Markdown. Preserve all content including tables, equations, and figure captions.`,
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(
        `OpenAI PDF extraction failed (${response.status}).\n` +
        `Model: ${model}\n` +
        `File: ${filename}\n` +
        `Response: ${body.slice(0, 300)}`,
      )
    }

    const json = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>
    }

    const text = json.choices?.[0]?.message?.content
    if (!text) {
      throw new Error(
        `OpenAI returned empty response for PDF extraction.\n` +
        `Model: ${model}\n` +
        `File: ${filename}`,
      )
    }

    return text
  }
}

// ── Auto-detect PDF extractor from environment ────────────────────────────────

/**
 * Automatically detect and create the best available PDF extractor
 * based on which API keys are present in the environment.
 *
 * Priority order (optimized for cost/speed on PDF extraction):
 * 1. Gemini (GEMINI_API_KEY) — fastest, cheapest for this task
 * 2. OpenAI (OPENAI_API_KEY) — widely available
 * 3. Claude (ANTHROPIC_API_KEY) — excellent quality
 *
 * Returns `undefined` if no API key is found (falls back to pdf-parse).
 *
 * @example
 * ```ts
 * const pdfExtractFn = autoDetectPdfExtractor()
 * if (pdfExtractFn) {
 *   console.log('Using LLM-based PDF extraction')
 * }
 * ```
 */
export function autoDetectPdfExtractor(): PdfExtractFn | undefined {
  // 1. Gemini — cheapest and fastest for PDF extraction (~$0.002/paper)
  if (process.env.GEMINI_API_KEY) {
    return makeGeminiPdfExtractor()
  }

  // 2. OpenAI — widely available, good quality
  if (process.env.OPENAI_API_KEY) {
    return makeOpenAIPdfExtractor()
  }

  // 3. Claude — excellent quality, supports native PDF document blocks
  if (process.env.ANTHROPIC_API_KEY) {
    return makeClaudePdfExtractor()
  }

  // No API key found — caller should fall back to pdf-parse
  return undefined
}

// ── Fallback: basic pdf-parse text extraction ─────────────────────────────────

function cleanPdfText(text: string): string {
  return text
    // Form feeds → paragraph breaks
    .replace(/\f/g, '\n\n')
    // Dehyphenation: "hyphen-\nated" → "hyphenated"
    .replace(/([a-z])-\n([a-z])/gi, '$1$2')
    // Collapse excessive whitespace
    .replace(/\n{3,}/g, '\n\n')
    // Remove leading/trailing whitespace per line
    .split('\n')
    .map(l => l.trim())
    .join('\n')
    .trim()
}

function extractTitleFromText(text: string): string {
  // First non-empty, non-whitespace line
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  // Skip lines that look like headers/metadata
  const titleLine = lines.find(l =>
    l.length > 5 && l.length < 200 &&
    !l.startsWith('http') &&
    !l.match(/^\d+$/) &&
    !l.match(/^page\s+\d+/i) &&
    !l.match(/^copyright/i),
  )
  return titleLine?.slice(0, 120) ?? 'Untitled PDF'
}

function extractTitleFromMarkdown(markdown: string): string {
  // Try to find a # heading
  const h1Match = markdown.match(/^#\s+(.+)/m)
  if (h1Match) return h1Match[1]!.trim().slice(0, 120)

  // Try bold-text title
  const boldMatch = markdown.match(/^\*\*(.{10,120})\*\*/m)
  if (boldMatch) return boldMatch[1]!.trim()

  // Fall back to first substantial line
  return extractTitleFromText(markdown)
}

// ── PDF ingester options extension ────────────────────────────────────────────

export type PdfIngesterOptions = IngesterOptions & {
  /**
   * LLM-based PDF extraction function.
   * When provided, enables high-quality extraction with tables, equations, and figures.
   * When omitted, falls back to basic pdf-parse text dump.
   *
   * Create one with `makeGeminiPdfExtractor()` or provide your own.
   */
  pdfExtractFn?: PdfExtractFn
}

// ── Ingester ──────────────────────────────────────────────────────────────────

export const pdfIngester: Ingester = {
  supportedExtensions: ['pdf'],
  supportedMimeTypes: ['application/pdf'],
  requiresOptionalDeps: false, // LLM extraction has no local deps
  optionalDeps: [],

  async ingest(filePath: string, options?: PdfIngesterOptions): Promise<IngestedContent> {
    const buffer = await readFile(filePath)
    const filename = filePath.split('/').pop() ?? 'document.pdf'

    // ── Strategy 1: LLM-based extraction (high quality) ───────────────────
    if (options?.pdfExtractFn) {
      const pdfBase64 = buffer.toString('base64')
      const markdown = await options.pdfExtractFn(pdfBase64, filename)

      return {
        sourceFile: filePath,
        title: extractTitleFromMarkdown(markdown),
        text: markdown,
        images: [],
        mimeType: detectMimeType(filePath),
        lossy: false, // LLM extraction preserves structure faithfully
        metadata: {
          extractionMethod: 'llm',
          extractionNote: 'Converted from PDF using multimodal LLM. Tables, equations, and figures preserved as Markdown.',
        },
      }
    }

    // ── Strategy 2: Fallback to pdf-parse (basic text dump) ───────────────
    let pdfParse: (buffer: Buffer) => Promise<{
      text: string
      numpages: number
      info?: Record<string, unknown>
    }>

    try {
      // Dynamic import — pdf-parse is an optional dependency
      // @ts-ignore — pdf-parse is an optional peer dep, may not be installed
      const mod = await import('pdf-parse')
      pdfParse = (mod.default ?? mod) as typeof pdfParse
    } catch {
      throw new Error(
        `PDF ingestion requires either:\n` +
        `  1. An LLM extractor (recommended): pass pdfExtractFn in options\n` +
        `     Example: makeGeminiPdfExtractor({ apiKey: '...' })\n` +
        `  2. The "pdf-parse" package: npm install pdf-parse\n` +
        `\n` +
        `LLM extraction is strongly recommended for research papers with\n` +
        `tables, equations, and complex layouts.`,
      )
    }

    const data = await pdfParse(buffer)
    const cleanedText = cleanPdfText(data.text)

    // Try to extract title from PDF metadata, fall back to text
    const metadataTitle =
      typeof data.info?.['Title'] === 'string' && data.info['Title'].length > 2
        ? data.info['Title']
        : undefined

    return {
      sourceFile: filePath,
      title: metadataTitle ?? extractTitleFromText(cleanedText),
      text: cleanedText,
      images: [],  // pdf-parse doesn't extract images
      mimeType: detectMimeType(filePath),
      lossy: true, // PDF text extraction is always lossy (layout info lost)
      metadata: {
        extractionMethod: 'pdf-parse',
        pages: data.numpages,
        author: data.info?.['Author'] ?? undefined,
        creationDate: data.info?.['CreationDate'] ?? undefined,
        producer: data.info?.['Producer'] ?? undefined,
        extractionNote: 'Basic text extraction only. Tables, equations, and figures may be garbled. Use LLM extraction for better results.',
      },
    }
  },
}
