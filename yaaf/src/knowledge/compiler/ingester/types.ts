/**
 * Ingested Content Types
 *
 * The output of the Ingester pipeline — a normalized, format-agnostic
 * representation of extracted content ready for the Knowledge Synthesizer.
 */

// ── Image reference ───────────────────────────────────────────────────────────

/**
 * A reference to an image found in the source document.
 * At ingestion time all images are resolved to local absolute paths.
 * The Knowledge Synthesizer embeds these into the compiled article's
 * frontmatter `images:` block.
 */
export type ImageRef = {
  /** The original src/href as it appeared in the source (may be relative or absolute URL) */
  originalSrc: string
  /** Absolute path to the local image file (already downloaded/resolved) */
  localPath: string
  /** Alt text from the source, or filename if none */
  altText: string
  /** Image MIME type (image/png, image/jpeg, image/svg+xml, etc.) */
  mimeType: string
  /** File size in bytes */
  sizeBytes: number
}

// ── Ingester result ───────────────────────────────────────────────────────────

/**
 * The normalized output of any format-specific ingester.
 * This is the input to the Concept Extractor and Knowledge Synthesizer.
 */
export type IngestedContent = {
  /** Extracted text content (may be markdown or plain text — synthesizer handles both) */
  text: string
  /** All images found in the source, with local paths resolved */
  images: ImageRef[]
  /** Detected MIME type of the source file */
  mimeType: string
  /** Absolute path to the source file */
  sourceFile: string
  /** Extracted document title (from HTML <title>, PDF metadata, or first H1) */
  title?: string
  /** Format-specific metadata (e.g., PDF author, HTML og:description) */
  metadata?: Record<string, unknown>
  /**
   * Whether the ingester performed lossy extraction.
   * true = some content may have been lost (HTML noise removal, PDF layout)
   * false = lossless (markdown, plain text, JSON)
   */
  lossy: boolean
  /**
   * Source of the original content (for citation in the compiled article).
   * For local files this is the file path; for clipped URLs it's the original URL.
   */
  sourceUrl?: string
}

// ── Ingester interface ────────────────────────────────────────────────────────

/**
 * Format-specific ingester contract.
 * Each ingester handles one or more file extensions.
 */
export interface Ingester {
  /** MIME types this ingester handles */
  readonly supportedMimeTypes: string[]
  /** File extensions this ingester handles (without leading dot) */
  readonly supportedExtensions: string[]
  /** Whether this ingester requires optional peer dependencies */
  readonly requiresOptionalDeps: boolean
  /** Names of required optional packages (for error messages) */
  readonly optionalDeps?: string[]

  /**
   * Extract content from a source file.
   *
   * @param filePath - Absolute path to the source file
   * @param options - Ingestion options
   * @returns Normalized content ready for the synthesis pipeline
   */
  ingest(filePath: string, options?: IngesterOptions): Promise<IngestedContent>
}

export type IngesterOptions = {
  /**
   * Directory where downloaded images should be saved.
   * Defaults to a sibling `assets/` directory of the source file.
   */
  imageOutputDir?: string
  /**
   * Maximum image dimension (width or height) in pixels.
   * Images exceeding this will be resized at download time.
   * Default: 1024
   */
  maxImageDimension?: number
  /**
   * The original URL this content was fetched from (for citation).
   */
  sourceUrl?: string
}

// ── Format detection ──────────────────────────────────────────────────────────

const EXTENSION_TO_MIME: Record<string, string> = {
  'md': 'text/markdown',
  'mdx': 'text/markdown',
  'txt': 'text/plain',
  'html': 'text/html',
  'htm': 'text/html',
  'json': 'application/json',
  'yaml': 'application/yaml',
  'yml': 'application/yaml',
  'ts': 'text/typescript',
  'tsx': 'text/typescript',
  'js': 'text/javascript',
  'jsx': 'text/javascript',
  'py': 'text/x-python',
  'pdf': 'application/pdf',
  'csv': 'text/csv',
  'svg': 'image/svg+xml',
  'png': 'image/png',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'webp': 'image/webp',
  'gif': 'image/gif',
  'tiff': 'image/tiff',
  'tif': 'image/tiff',
}

export function detectMimeType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  return EXTENSION_TO_MIME[ext] ?? 'application/octet-stream'
}

export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

export function isSvg(mimeType: string): boolean {
  return mimeType === 'image/svg+xml'
}
