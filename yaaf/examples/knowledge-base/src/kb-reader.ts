/**
 * KB Reader
 *
 * Reads all compiled articles from kb/compiled/ and returns them as
 * a single structured context string for the agent's system prompt.
 *
 * The compiled wiki is the "memory" that powers the agent —
 * articles are injected directly into context so the LLM can reason
 * across the entire knowledge base without retrieval.
 */

import { readdir, readFile, stat } from 'fs/promises'
import { join, extname, relative } from 'path'

/** Rough average tokens per English word (GPT tokeniser baseline). */
const TOKENS_PER_WORD = 1.35

export type KBArticle = {
  docId: string
  title: string
  entityType: string
  body: string
  wordCount: number
  isStub: boolean
}

export type KBLoadResult = {
  articles: KBArticle[]
  totalWords: number
  totalTokensEstimate: number
}

/**
 * Load all compiled articles from the compiled/ directory.
 * Returns them sorted by entity type then title.
 */
export async function loadCompiledKB(compiledDir: string): Promise<KBLoadResult> {
  const paths = await scanDir(compiledDir)
  const articles: KBArticle[] = []

  await Promise.allSettled(
    paths.map(async filePath => {
      const raw = await readFile(filePath, 'utf-8')
      const article = parseArticle(relative(compiledDir, filePath), raw)
      if (article) articles.push(article)
    }),
  )

  // Sort: non-stubs first, then by entity type, then title
  articles.sort((a, b) => {
    if (a.isStub !== b.isStub) return a.isStub ? 1 : -1
    if (a.entityType !== b.entityType) return a.entityType.localeCompare(b.entityType)
    return a.title.localeCompare(b.title)
  })

  const totalWords          = articles.reduce((sum, a) => sum + a.wordCount, 0)
  const totalTokensEstimate = Math.round(totalWords * TOKENS_PER_WORD)

  return { articles, totalWords, totalTokensEstimate }
}

/**
 * Build a system prompt section from the compiled KB.
 * Formats articles as a readable wiki for the LLM.
 */
export function buildKBContext(result: KBLoadResult): string {
  if (result.articles.length === 0) {
    return '## Knowledge Base\n\n_No articles have been compiled yet. Run `npm run compile` first._\n'
  }

  const sections: string[] = [
    `## Knowledge Base (${result.articles.length} articles, ~${result.totalTokensEstimate.toLocaleString()} tokens)`,
    '',
    'The following wiki articles form your knowledge base. Use them as authoritative reference material when answering questions.',
    '',
  ]

  let currentType = ''

  for (const article of result.articles) {
    // Group by entity type
    if (article.entityType !== currentType) {
      currentType = article.entityType
      const typeLabel = currentType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      sections.push(`### ${typeLabel}s`)
      sections.push('')
    }

    sections.push(`---`)
    sections.push(`**${article.title}** \`(${article.entityType})\`${article.isStub ? ' _(stub)_' : ''}`)
    sections.push('')
    sections.push(article.body.trim())
    sections.push('')
  }

  return sections.join('\n')
}

/**
 * Build a compact index of all articles (titles + entity types only).
 * Used in the system prompt to tell the agent what it knows.
 */
export function buildKBIndex(result: KBLoadResult): string {
  if (result.articles.length === 0) return ''

  const byType = new Map<string, KBArticle[]>()
  for (const a of result.articles) {
    const group = byType.get(a.entityType) ?? []
    group.push(a)
    byType.set(a.entityType, group)
  }

  const lines = ['**KB Index:**']
  for (const [type, articles] of byType) {
    const typeLabel = type.replace(/_/g, ' ')
    const titles = articles.map(a => a.isStub ? `${a.title} (stub)` : a.title)
    lines.push(`- _${typeLabel}s_: ${titles.join(', ')}`)
  }

  return lines.join('\n')
}

// ── Private helpers ───────────────────────────────────────────────────────────

async function scanDir(dir: string): Promise<string[]> {
  const files: string[] = []
  try {
    const entries = await readdir(dir)
    await Promise.all(entries.map(async entry => {
      const full = join(dir, entry)
      const s = await stat(full)
      if (s.isDirectory()) {
        files.push(...await scanDir(full))
      } else if (s.isFile() && extname(entry) === '.md') {
        files.push(full)
      }
    }))
  } catch { /* compiled/ may not exist */ }
  return files.sort()
}

function parseArticle(relativePath: string, raw: string): KBArticle | null {
  const docId = relativePath.replace(/\\/g, '/').replace(/\.md$/, '')

  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!fmMatch) return null

  const fm = fmMatch[1]!
  const body = fmMatch[2]?.trim() ?? ''

  // YAML title values may be unquoted, single-quoted, or double-quoted.
  const titleMatch = fm.match(/^title:\s*['"]?(.+?)['"]?\s*$/m)
  const typeMatch  = fm.match(/^entity_type:\s*(.+?)\s*$/m)
  const stubMatch  = fm.match(/^stub:\s*true/m)

  const title = titleMatch?.[1] ?? docId.split('/').pop() ?? docId
  const entityType = typeMatch?.[1]?.trim() ?? 'unknown'
  const isStub = !!stubMatch
  const wordCount = body.split(/\s+/).filter(Boolean).length

  // Skip assets directory entries
  if (docId.startsWith('assets/')) return null

  return { docId, title, entityType, body, wordCount, isStub }
}
