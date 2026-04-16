/**
 * Ingester Registry
 *
 * The central dispatch for format-specific ingesters.
 * Given a file path, it auto-detects the format and delegates
 * to the appropriate ingester.
 *
 * Supported formats in priority order:
 *
 * | Format              | Extensions             | Deps          | Notes                            |
 * |---------------------|------------------------|---------------|----------------------------------|
 * | Markdown            | .md, .mdx              | none          | Primary path (OWC output)        |
 * | HTML                | .html, .htm            | optional *    | Readability extraction           |
 * | Plain text          | .txt, .csv, .tsv       | none          | As-is                            |
 * | JSON / YAML         | .json, .yaml, .yml     | none          | Pretty-printed + structure       |
 * | Source code         | .ts .js .py .go etc.   | none          | Fenced block + docstring         |
 *
 * * @mozilla/readability + jsdom + turndown — install with:
 *   npm install @mozilla/readability jsdom turndown
 */

import { extname } from 'path'
import type { Ingester, IngestedContent, IngesterOptions } from './types.js'
import { detectMimeType } from './types.js'
import { markdownIngester } from './markdown.js'
import { htmlIngester, KBClipper } from './html.js'
import { plainTextIngester, jsonIngester, codeIngester } from './text.js'
import { pdfIngester } from './pdf.js'

// ── Registry ──────────────────────────────────────────────────────────────────

const INGESTERS: Ingester[] = [
  markdownIngester,
  htmlIngester,
  pdfIngester,
  plainTextIngester,
  jsonIngester,
  codeIngester,
]

/**
 * Resolve the appropriate ingester for a given file path.
 * Matching is first by extension, then by MIME type.
 *
 * @throws if no ingester supports the file format
 */
export function resolveIngester(filePath: string): Ingester {
  const ext = extname(filePath).slice(1).toLowerCase()
  const mimeType = detectMimeType(filePath)

  // Extension match first (most specific)
  const byExtension = INGESTERS.find(i => i.supportedExtensions.includes(ext))
  if (byExtension) return byExtension

  // MIME type match
  const byMime = INGESTERS.find(i => i.supportedMimeTypes.includes(mimeType))
  if (byMime) return byMime

  throw new Error(
    `No ingester found for file: ${filePath}\n` +
    `Extension: .${ext}, MIME type: ${mimeType}\n` +
    `Supported extensions: ${INGESTERS.flatMap(i => i.supportedExtensions).join(', ')}`,
  )
}

/**
 * Ingest a file, automatically selecting the right ingester.
 *
 * @param filePath - Absolute path to the source file
 * @param options - Optional ingestion settings
 */
export async function ingestFile(
  filePath: string,
  options?: IngesterOptions,
): Promise<IngestedContent> {
  const ingester = resolveIngester(filePath)
  return ingester.ingest(filePath, options)
}

/**
 * Check if a file at a given path can be ingested by any registered ingester.
 */
export function canIngest(filePath: string): boolean {
  try {
    resolveIngester(filePath)
    return true
  } catch {
    return false
  }
}

/**
 * Check if a file requires optional dependencies to ingest.
 * Use this to warn users before compilation starts.
 */
export function requiresOptionalDeps(filePath: string): boolean {
  try {
    const ingester = resolveIngester(filePath)
    return ingester.requiresOptionalDeps
  } catch {
    return false
  }
}

/**
 * List what optional deps are needed for files in a directory.
 * Used by `kb compile` to emit a pre-flight warning if deps are missing.
 */
export function requiredOptionalDeps(filePaths: string[]): string[] {
  const needed = new Set<string>()
  for (const fp of filePaths) {
    try {
      const ingester = resolveIngester(fp)
      if (ingester.requiresOptionalDeps && ingester.optionalDeps) {
        for (const dep of ingester.optionalDeps) needed.add(dep)
      }
    } catch { /* unrecognized format */ }
  }
  return Array.from(needed)
}

// ── Public re-exports ─────────────────────────────────────────────────────────

export type { Ingester, IngestedContent, ImageRef, IngesterOptions } from './types.js'
export { markdownIngester } from './markdown.js'
export { htmlIngester, KBClipper } from './html.js'
export { plainTextIngester, jsonIngester, codeIngester } from './text.js'
export { pdfIngester, makeGeminiPdfExtractor, makeClaudePdfExtractor, makeOpenAIPdfExtractor, autoDetectPdfExtractor } from './pdf.js'
export type {
  PdfExtractFn,
  PdfIngesterOptions,
  GeminiPdfExtractorOptions,
  ClaudePdfExtractorOptions,
  OpenAIPdfExtractorOptions,
} from './pdf.js'
export { detectMimeType, isImageMimeType } from './types.js'
export {
  extractMarkdownImageRefs,
  resolveAllMarkdownImages,
  downloadImage,
} from './images.js'
