/**
 * Post-Synthesis Processing
 *
 * Two compile-time transforms applied to every synthesized article
 * AFTER the LLM authoring step and BEFORE the linter runs:
 *
 * B1 — Wikilink Resolution:
 *   Converts [[Term]] → [Term](../entity-types/doc-id.md) using the registry.
 *   Unresolved wikilinks are left as-is for the linter to flag.
 *
 * B2 — Article Segmentation:
 *   Splits oversized articles (> tokenBudget) by H2 sections into
 *   linked sub-articles with navigation headers.
 */

import { readFile, writeFile, mkdir, readdir, stat } from 'fs/promises'
import { join, dirname, relative } from 'path'
import type { ConceptRegistry, ConceptRegistryEntry } from '../ontology/index.js'
import { estimateTokens } from '../../utils/tokens.js'

// ── B1: Wikilink Resolution ───────────────────────────────────────────────────

const WIKILINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g

/**
 * Resolve [[wikilinks]] in a markdown string to proper relative links.
 *
 * - `[[Attention Mechanism]]` → `[Attention Mechanism](../concepts/attention-mechanism.md)`
 * - `[[Attention|custom text]]` → `[custom text](../concepts/attention-mechanism.md)`
 * - Unresolved wikilinks are left as `[[Target]]` for the linter to flag.
 *
 * @param markdown - Full article markdown (frontmatter + body)
 * @param registry - The concept registry for resolving targets
 * @param currentDocId - docId of the article being processed (for relative path computation)
 * @returns The markdown with resolved wikilinks
 */
export function resolveWikilinks(
  markdown: string,
  registry: ConceptRegistry,
  currentDocId: string,
): { resolved: string; resolvedCount: number; unresolvedCount: number } {
  let resolvedCount = 0
  let unresolvedCount = 0

  const resolved = markdown.replace(WIKILINK_RE, (_match, target: string, displayText?: string) => {
    const trimmedTarget = target.trim()
    const docId = resolveToDocId(trimmedTarget, registry)

    if (!docId) {
      unresolvedCount++
      return _match // Leave unresolved wikilinks as-is
    }

    resolvedCount++
    const display = displayText?.trim() || trimmedTarget
    const relativePath = computeRelativePath(currentDocId, docId)
    return `[${display}](${relativePath})`
  })

  return { resolved, resolvedCount, unresolvedCount }
}

/**
 * Resolve a wikilink target text to a registry docId.
 * Tries: exact title match → alias match → docId match.
 */
function resolveToDocId(target: string, registry: ConceptRegistry): string | null {
  const lower = target.toLowerCase()

  // Direct docId match
  if (registry.has(lower)) return lower

  // Title / alias scan
  for (const entry of registry.values()) {
    if (entry.canonicalTitle.toLowerCase() === lower) return entry.docId
    if (entry.aliases.some(a => a.toLowerCase() === lower)) return entry.docId
  }

  return null
}

/**
 * Compute relative path from one docId to another.
 * e.g., from "concepts/attention-mechanism" to "research-papers/bert" → "../research-papers/bert.md"
 */
function computeRelativePath(fromDocId: string, toDocId: string): string {
  const fromParts = fromDocId.split('/')
  const toParts = toDocId.split('/')

  // Same directory
  if (fromParts.length === 1 && toParts.length === 1) {
    return `./${toDocId}.md`
  }

  // Compute relative path
  const fromDir = fromParts.slice(0, -1).join('/')
  const toPath = toDocId + '.md'

  if (fromDir === toParts.slice(0, -1).join('/')) {
    // Same directory — just filename
    return `./${toParts[toParts.length - 1]}.md`
  }

  // Different directory — use relative path construction
  const upCount = fromDir ? fromDir.split('/').length : 0
  const up = '../'.repeat(upCount)
  return `${up}${toPath}`
}

// ── B2: Article Segmentation ──────────────────────────────────────────────────

/** Default article token budget (user requested 15000) */
export const DEFAULT_ARTICLE_TOKEN_BUDGET = 15_000

type SegmentResult = {
  /** Total articles processed */
  totalProcessed: number
  /** Articles that were within budget */
  withinBudget: number
  /** Articles successfully split */
  split: number
  /** Details of each split */
  splits: Array<{ docId: string; parts: number; originalTokens: number }>
}

/**
 * Scan all compiled articles and split any that exceed the token budget.
 *
 * Articles are split at H2 (##) section boundaries. Each part becomes its own
 * article with navigation links:
 *
 *   - Part 1: `docId.md`       → `[Next: Section Name →](docId-part-2.md)`
 *   - Part 2: `docId-part-2.md` → `[← Previous](docId.md)` + `[Next →](docId-part-3.md)`
 *   - Part N: `docId-part-N.md` → `[← Previous](docId-part-N-1.md)`
 *
 * @param compiledDir - Path to compiled/ directory
 * @param tokenBudget - Maximum tokens per article (default: 15000)
 */
export async function segmentOversizedArticles(
  compiledDir: string,
  tokenBudget: number = DEFAULT_ARTICLE_TOKEN_BUDGET,
): Promise<SegmentResult> {
  const result: SegmentResult = {
    totalProcessed: 0,
    withinBudget: 0,
    split: 0,
    splits: [],
  }

  const mdFiles = await scanMarkdownFiles(compiledDir)

  for (const filePath of mdFiles) {
    const raw = await readFile(filePath, 'utf-8')
    const relPath = relative(compiledDir, filePath)
    const docId = relPath.replace(/\\/g, '/').replace(/\.md$/, '')

    // Skip already-segmented parts
    if (/-part-\d+$/.test(docId)) continue

    result.totalProcessed++

    const tokens = estimateTokens(raw)
    if (tokens <= tokenBudget) {
      result.withinBudget++
      continue
    }

    // Split the article
    const parts = splitArticle(raw, tokenBudget)
    if (parts.length <= 1) {
      result.withinBudget++ // Can't split further (single section too large)
      continue
    }

    // Write parts
    const baseDocId = docId
    for (let i = 0; i < parts.length; i++) {
      const partDocId = i === 0 ? baseDocId : `${baseDocId}-part-${i + 1}`
      const partPath = join(compiledDir, `${partDocId}.md`)
      const navigation = buildNavigation(baseDocId, parts.length, i, parts)

      const partContent = parts[i]!.content + '\n\n---\n\n' + navigation

      await mkdir(dirname(partPath), { recursive: true })
      await writeFile(partPath, partContent, 'utf-8')
    }

    result.split++
    result.splits.push({
      docId: baseDocId,
      parts: parts.length,
      originalTokens: tokens,
    })
  }

  return result
}

// ── Segmenter helpers ─────────────────────────────────────────────────────────

type ArticlePart = {
  /** Title of this section (from H2 heading) */
  sectionTitle: string
  /** Full content including frontmatter for part 1, body for others */
  content: string
  /** Token count */
  tokens: number
}

/**
 * Split an article by H2 boundaries, merging small adjacent sections
 * to minimize the number of parts.
 */
function splitArticle(raw: string, tokenBudget: number): ArticlePart[] {
  // Separate frontmatter from body
  const fmMatch = raw.match(/^(---\n[\s\S]*?\n---\n?)([\s\S]*)$/)
  const frontmatter = fmMatch?.[1] ?? ''
  const body = fmMatch?.[2] ?? raw

  // Split body at H2 boundaries
  const sections = splitAtH2(body)

  if (sections.length <= 1) {
    // Can't split — single section
    return [{ sectionTitle: 'Full Article', content: raw, tokens: estimateTokens(raw) }]
  }

  // Greedily merge sections into parts that fit within budget
  const parts: ArticlePart[] = []
  let currentContent = ''
  let currentTitle = ''
  let currentTokens = 0
  const fmTokens = estimateTokens(frontmatter)

  for (const section of sections) {
    const sectionTokens = estimateTokens(section.content)

    // First part includes frontmatter
    const overhead = parts.length === 0 && !currentContent ? fmTokens : 0

    if (currentContent && currentTokens + sectionTokens + overhead > tokenBudget) {
      // Current accumulated content is over budget, flush it
      const content = parts.length === 0
        ? frontmatter + currentContent
        : addPartFrontmatter(frontmatter, parts.length + 1, currentTitle) + currentContent
      parts.push({ sectionTitle: currentTitle, content, tokens: currentTokens + overhead })
      currentContent = section.content
      currentTitle = section.title
      currentTokens = sectionTokens
    } else {
      // Accumulate
      if (!currentTitle) currentTitle = section.title
      currentContent += section.content
      currentTokens += sectionTokens
    }
  }

  // Flush remaining
  if (currentContent) {
    const overhead = parts.length === 0 ? fmTokens : 0
    const content = parts.length === 0
      ? frontmatter + currentContent
      : addPartFrontmatter(frontmatter, parts.length + 1, currentTitle) + currentContent
    parts.push({ sectionTitle: currentTitle, content, tokens: currentTokens + overhead })
  }

  // If we only got 1 part, no point splitting
  if (parts.length <= 1) {
    return [{ sectionTitle: 'Full Article', content: raw, tokens: estimateTokens(raw) }]
  }

  return parts
}

type Section = { title: string; content: string }

function splitAtH2(body: string): Section[] {
  const lines = body.split('\n')
  const sections: Section[] = []
  let currentTitle = 'Introduction'
  let currentLines: string[] = []

  for (const line of lines) {
    if (/^## /.test(line)) {
      // Flush previous section
      if (currentLines.length > 0 || sections.length === 0) {
        sections.push({ title: currentTitle, content: currentLines.join('\n') })
      }
      currentTitle = line.replace(/^## /, '').trim()
      currentLines = [line]
    } else {
      currentLines.push(line)
    }
  }

  // Flush last section
  if (currentLines.length > 0) {
    sections.push({ title: currentTitle, content: currentLines.join('\n') })
  }

  return sections
}

/**
 * Create a minimal frontmatter block for a split part (part 2+).
 * Inherits title and entity_type from the original.
 */
function addPartFrontmatter(originalFrontmatter: string, partNumber: number, sectionTitle: string): string {
  // Extract title from original frontmatter
  const titleMatch = originalFrontmatter.match(/^title:\s*['"]?(.+?)['"]?\s*$/m)
  const title = titleMatch?.[1] ?? 'Untitled'

  const etMatch = originalFrontmatter.match(/^entity_type:\s*(.+?)\s*$/m)
  const entityType = etMatch?.[1] ?? 'concept'

  return `---
title: "${title} (Part ${partNumber}: ${sectionTitle})"
entity_type: ${entityType}
part_of: "${title}"
part_number: ${partNumber}
---
`
}

function buildNavigation(baseDocId: string, totalParts: number, currentIndex: number, parts: ArticlePart[]): string {
  const nav: string[] = []
  const baseName = baseDocId.split('/').pop() ?? baseDocId

  if (currentIndex > 0) {
    const prevDocId = currentIndex === 1 ? baseName : `${baseName}-part-${currentIndex}`
    nav.push(`[← Previous: ${parts[currentIndex - 1]!.sectionTitle}](${prevDocId}.md)`)
  }

  if (currentIndex < totalParts - 1) {
    const nextDocId = `${baseName}-part-${currentIndex + 2}`
    nav.push(`[Next: ${parts[currentIndex + 1]!.sectionTitle} →](${nextDocId}.md)`)
  }

  if (totalParts > 1) {
    nav.push(`\n*Part ${currentIndex + 1} of ${totalParts}*`)
  }

  return nav.join(' | ')
}

// ── Batch processing ──────────────────────────────────────────────────────────

export type PostProcessOptions = {
  /** Token budget per article. Default: 15000 */
  tokenBudget?: number
  /** Whether to resolve wikilinks. Default: true */
  resolveLinks?: boolean
  /** Whether to segment oversized articles. Default: true */
  segmentArticles?: boolean
}

export type PostProcessResult = {
  wikilinks: { resolved: number; unresolved: number }
  segmentation: SegmentResult | null
}

/**
 * Run all post-process steps on the compiled KB.
 * Called by the compiler after synthesis and before linting.
 */
export async function postProcessCompiledArticles(
  compiledDir: string,
  registry: ConceptRegistry,
  options: PostProcessOptions = {},
): Promise<PostProcessResult> {
  const {
    tokenBudget = DEFAULT_ARTICLE_TOKEN_BUDGET,
    resolveLinks = true,
    segmentArticles = true,
  } = options

  let totalResolved = 0
  let totalUnresolved = 0

  // B1: Resolve wikilinks in all compiled articles
  if (resolveLinks) {
    const mdFiles = await scanMarkdownFiles(compiledDir)

    for (const filePath of mdFiles) {
      const raw = await readFile(filePath, 'utf-8')
      const relPath = relative(compiledDir, filePath)
      const docId = relPath.replace(/\\/g, '/').replace(/\.md$/, '')

      const { resolved, resolvedCount, unresolvedCount } = resolveWikilinks(raw, registry, docId)

      if (resolvedCount > 0) {
        await writeFile(filePath, resolved, 'utf-8')
      }

      totalResolved += resolvedCount
      totalUnresolved += unresolvedCount
    }
  }

  // B2: Segment oversized articles
  let segmentation: SegmentResult | null = null
  if (segmentArticles) {
    segmentation = await segmentOversizedArticles(compiledDir, tokenBudget)
  }

  return {
    wikilinks: { resolved: totalResolved, unresolved: totalUnresolved },
    segmentation,
  }
}

// ── File system helpers ───────────────────────────────────────────────────────

async function scanMarkdownFiles(dir: string): Promise<string[]> {
  const files: string[] = []
  try {
    const entries = await readdir(dir)
    for (const entry of entries) {
      const full = join(dir, entry)
      const s = await stat(full)
      if (s.isDirectory()) {
        files.push(...await scanMarkdownFiles(full))
      } else if (s.isFile() && entry.endsWith('.md')) {
        files.push(full)
      }
    }
  } catch { /* dir may not exist */ }
  return files.sort()
}
