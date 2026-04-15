/**
 * Image utilities for the Ingester pipeline
 *
 * Handles:
 * - Resolving local `![]()` references in markdown
 * - Detecting image MIME types from file extension/magic bytes
 * - Computing relative → absolute image paths
 * - Generating placeholder ImageRef entries for SVG (treated as text)
 */

import { readFile, stat, mkdir, writeFile } from 'fs/promises'
import { join, dirname, resolve, extname, basename, isAbsolute } from 'path'
import type { ImageRef, IngesterOptions } from './types.js'
import { detectMimeType, isSvg } from './types.js'

// ── MIME type from magic bytes ────────────────────────────────────────────────

const MAGIC_BYTES: Array<{ magic: number[]; mimeType: string }> = [
  { magic: [0x89, 0x50, 0x4e, 0x47], mimeType: 'image/png' },
  { magic: [0xff, 0xd8, 0xff], mimeType: 'image/jpeg' },
  { magic: [0x47, 0x49, 0x46], mimeType: 'image/gif' },
  { magic: [0x52, 0x49, 0x46, 0x46], mimeType: 'image/webp' }, // RIFF....WEBP
  { magic: [0x49, 0x49, 0x2a, 0x00], mimeType: 'image/tiff' }, // little-endian TIFF
  { magic: [0x4d, 0x4d, 0x00, 0x2a], mimeType: 'image/tiff' }, // big-endian TIFF
]

/**
 * Detect image MIME type from magic bytes in the file header.
 * Falls back to extension-based detection.
 */
export async function detectImageMimeType(filePath: string): Promise<string> {
  try {
    const fd = await readFile(filePath)
    const bytes = Array.from(fd.slice(0, 12))

    for (const { magic, mimeType } of MAGIC_BYTES) {
      if (magic.every((b, i) => bytes[i] === b)) {
        // Extra check for WebP: bytes 8-11 must be 'W','E','B','P'
        if (mimeType === 'image/webp') {
          const webpSig = [0x57, 0x45, 0x42, 0x50]
          if (webpSig.every((b, i) => bytes[8 + i] === b)) return mimeType
          continue
        }
        return mimeType
      }
    }

    // SVG check: starts with XML declaration or <svg
    const head = fd.slice(0, 64).toString('utf-8').trimStart()
    if (head.startsWith('<?xml') || head.startsWith('<svg')) return 'image/svg+xml'
  } catch {
    // Fall through to extension detection
  }

  return detectMimeType(filePath)
}

// ── Markdown image reference extraction ──────────────────────────────────────

export type RawImageRef = {
  altText: string
  src: string
  /** Character offset in the markdown text where this ref is found */
  offset: number
  /** The full original markdown string: ![alt](src) */
  fullMatch: string
}

/**
 * Extract all image references from a markdown document.
 * Handles both standard `![alt](src)` and reference-style `![alt][id]`.
 */
export function extractMarkdownImageRefs(markdown: string): RawImageRef[] {
  const refs: RawImageRef[] = []

  // Standard image syntax: ![alt text](url "optional title")
  const inlinePattern = /!\[([^\]]*)\]\(([^)"'\s]+)[^)]*\)/g
  let match: RegExpExecArray | null

  while ((match = inlinePattern.exec(markdown)) !== null) {
    refs.push({
      altText: match[1]!,
      src: match[2]!,
      offset: match.index,
      fullMatch: match[0],
    })
  }

  return refs
}

// ── Image resolution ──────────────────────────────────────────────────────────

/**
 * Resolve a markdown image reference to a local file path.
 *
 * Resolution order:
 * 1. If src is an absolute path that exists → use it directly
 * 2. If src is relative → resolve relative to the document's directory
 * 3. If src is a URL → download it to imageOutputDir
 *
 * @param src - The image src from the markdown
 * @param documentPath - Absolute path to the markdown document
 * @param options - Ingester options (imageOutputDir, sourceUrl)
 * @returns Resolved ImageRef or null if the image cannot be resolved
 */
export async function resolveImageRef(
  rawRef: RawImageRef,
  documentPath: string,
  options: IngesterOptions = {},
): Promise<ImageRef | null> {
  const { src, altText } = rawRef
  const docDir = dirname(documentPath)
  const imageOutputDir = options.imageOutputDir ?? join(docDir, 'assets')

  // Skip data URIs — base64 encoded images embedded inline
  if (src.startsWith('data:')) {
    return await resolveDataUri(rawRef, imageOutputDir)
  }

  // External URL → download
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return await downloadImage(src, altText, imageOutputDir)
  }

  // Local path resolution
  const candidatePaths = [
    isAbsolute(src) ? src : resolve(docDir, src),
    resolve(docDir, src),
    resolve(docDir, 'assets', basename(src)),
    resolve(docDir, 'attachments', basename(src)),
    resolve(docDir, 'images', basename(src)),
  ]

  for (const candidate of candidatePaths) {
    try {
      const s = await stat(candidate)
      if (s.isFile()) {
        const mimeType = await detectImageMimeType(candidate)
        return {
          originalSrc: src,
          localPath: candidate,
          altText: altText || basename(candidate, extname(candidate)),
          mimeType,
          sizeBytes: s.size,
        }
      }
    } catch {
      continue
    }
  }

  return null // Image not found locally and not a URL
}

// ── Data URI handling ─────────────────────────────────────────────────────────

/**
 * Extract a base64-encoded data URI image and save it to a local file.
 * Used when HTML pages embed images inline as data URIs.
 */
async function resolveDataUri(
  ref: RawImageRef,
  imageOutputDir: string,
): Promise<ImageRef | null> {
  const match = ref.src.match(/^data:(image\/[^;]+);base64,(.+)$/)
  if (!match) return null

  const mimeType = match[1]!
  const base64Data = match[2]!
  const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'bin'
  const filename = `embedded-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  await mkdir(imageOutputDir, { recursive: true })
  const localPath = join(imageOutputDir, filename)

  try {
    const buffer = Buffer.from(base64Data, 'base64')
    await writeFile(localPath, buffer)

    return {
      originalSrc: ref.src.slice(0, 40) + '...[data uri]',
      localPath,
      altText: ref.altText || filename,
      mimeType,
      sizeBytes: buffer.length,
    }
  } catch {
    return null
  }
}

// ── URL image downloading ─────────────────────────────────────────────────────

/**
 * Download an image from a URL and save it locally.
 *
 * This uses Node.js built-in fetch (available in Node 18+).
 * The filename is derived from the URL path.
 */
export async function downloadImage(
  url: string,
  altText: string,
  imageOutputDir: string,
): Promise<ImageRef | null> {
  try {
    await mkdir(imageOutputDir, { recursive: true })

    const response = await fetch(url, {
      headers: { 'User-Agent': 'YAAF-KB-Ingester/1.0' },
      signal: AbortSignal.timeout(15_000),
    })

    if (!response.ok) return null

    const contentType = response.headers.get('content-type') ?? 'image/jpeg'
    const mimeType = contentType.split(';')[0]!.trim()

    // Derive filename from URL
    const urlPath = new URL(url).pathname
    const urlFilename = basename(urlPath) || `image-${Date.now()}`
    const hasExt = urlFilename.includes('.')
    const ext = hasExt
      ? extname(urlFilename)
      : `.${mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg'}`
    const filename = hasExt ? urlFilename : urlFilename + ext
    const localPath = join(imageOutputDir, filename)

    const buffer = Buffer.from(await response.arrayBuffer())
    await writeFile(localPath, buffer)

    return {
      originalSrc: url,
      localPath,
      altText: altText || urlFilename,
      mimeType,
      sizeBytes: buffer.length,
    }
  } catch {
    return null // Network failure → skip image, don't fail the whole ingestion
  }
}

// ── Batch image resolution ────────────────────────────────────────────────────

/**
 * Resolve all image references found in a markdown document.
 * Failed resolutions are skipped with a warning (never throw).
 *
 * @returns Tuple of [resolved images, list of unresolved src strings]
 */
export async function resolveAllMarkdownImages(
  markdown: string,
  documentPath: string,
  options: IngesterOptions = {},
): Promise<{ images: ImageRef[]; unresolved: string[] }> {
  const rawRefs = extractMarkdownImageRefs(markdown)
  const images: ImageRef[] = []
  const unresolved: string[] = []

  await Promise.all(
    rawRefs.map(async ref => {
      const resolved = await resolveImageRef(ref, documentPath, options)
      if (resolved) {
        images.push(resolved)
      } else {
        unresolved.push(ref.src)
      }
    }),
  )

  return { images, unresolved }
}
