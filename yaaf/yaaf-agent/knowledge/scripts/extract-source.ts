#!/usr/bin/env tsx
/**
 * knowledge/scripts/extract-source.ts
 *
 * Pre-processor: TypeScript source → curated raw/ files for the KB compiler.
 *
 * What it does:
 *   For every .ts file under src/ (excluding __tests__ and *.test.ts):
 *   1. Extracts the module-level JSDoc block (if present)
 *   2. Extracts all export declarations with their full JSDoc comments
 *   3. Strips implementation bodies (replaces { ... } with {})
 *   4. Preserves @example blocks verbatim
 *   5. Writes the condensed result to knowledge/raw/source/<same-relative-path>
 *
 * Also copies docs/*.md verbatim to knowledge/raw/docs/.
 *
 * Usage:
 *   npm run kb:extract
 *   tsx knowledge/scripts/extract-source.ts [--src <dir>] [--out <dir>] [--verbose]
 */

import * as fs from 'fs/promises'
import * as path from 'path'

// ── Config ────────────────────────────────────────────────────────────────────

// Script lives at: yaaf-agent/knowledge/scripts/extract-source.ts
// Source lives at: yaaf/src/  (sibling of yaaf-agent/)
const AGENT_DIR  = path.resolve(import.meta.dirname, '..', '..')          // yaaf-agent/
const YAAF_ROOT  = path.resolve(import.meta.dirname, '..', '..', '..')    // yaaf/
const SRC_DIR    = path.join(YAAF_ROOT, 'src')
const DOCS_DIR   = path.join(YAAF_ROOT, 'docs')
const RAW_SOURCE_DIR = path.join(AGENT_DIR, 'knowledge', 'raw', 'source')
const RAW_DOCS_DIR   = path.join(AGENT_DIR, 'knowledge', 'raw', 'docs')

const VERBOSE = process.argv.includes('--verbose')

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(...args: unknown[]) {
  if (VERBOSE) console.log(...args)
}

/** Walk a directory recursively, yielding all matching file paths. */
async function* walk(
  dir: string,
  filter: (filePath: string) => boolean,
): AsyncGenerator<string> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      yield* walk(full, filter)
    } else if (entry.isFile() && filter(full)) {
      yield full
    }
  }
}

/**
 * Determine if a source file should be excluded from the KB.
 * Exclusion rule: __tests__ directories and *.test.ts files.
 */
function shouldInclude(filePath: string): boolean {
  const rel = path.relative(SRC_DIR, filePath)
  if (rel.startsWith('__tests__' + path.sep)) return false
  if (rel.includes(path.sep + '__tests__' + path.sep)) return false
  if (rel.endsWith('.test.ts')) return false
  if (!rel.endsWith('.ts')) return false
  return true
}

// ── TypeScript signature extractor ────────────────────────────────────────────

/**
 * Given TypeScript source, returns a condensed version containing:
 * - Module-level JSDoc block (leading /** ... * /)
 * - All export declarations with their JSDoc
 * - Implementation bodies stripped to {}
 * - Imports preserved (they convey type context)
 * - @example blocks preserved verbatim
 *
 * This is a line-by-line heuristic extractor — not a full parser.
 * It's good enough for producing clean KB compiler input.
 */
function extractSignatures(source: string, filePath: string): string {
  const lines = source.split('\n')
  const out: string[] = []

  // Header comment
  out.push(`// Source: ${path.relative(YAAF_ROOT, filePath)}`)
  out.push(`// This is a signature-only extract. Bodies are stripped.`)
  out.push('')

  let i = 0
  let braceDepth = 0
  let inJsDoc = false
  let jsDocBuffer: string[] = []
  let inExampleBlock = false
  let inStrippedBody = false
  let moduleDocWritten = false

  // Extract the module-level JSDoc (first /** block before any code)
  let moduleDocEnd = -1
  for (let j = 0; j < Math.min(lines.length, 60); j++) {
    const line = lines[j]!
    if (!moduleDocWritten && line.trim().startsWith('/**')) {
      const docLines: string[] = []
      let k = j
      while (k < lines.length) {
        docLines.push(lines[k]!)
        if (lines[k]!.trim().endsWith('*/')) {
          break
        }
        k++
      }
      // Only treat as module doc if it appears before any import/export/class
      const nextMeaningfulLine = lines.slice(j + docLines.length).find(l =>
        l.trim() && !l.trim().startsWith('//')
      ) ?? ''
      if (
        nextMeaningfulLine.startsWith('import') ||
        nextMeaningfulLine.startsWith('export') ||
        nextMeaningfulLine.startsWith('//') ||
        nextMeaningfulLine === ''
      ) {
        out.push(...docLines)
        out.push('')
        moduleDocEnd = j + docLines.length - 1
        moduleDocWritten = true
      }
      break
    }
    if (line.trim() && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
      break // Hit real code before finding a module doc
    }
  }

  i = 0
  jsDocBuffer = []
  inJsDoc = false

  while (i < lines.length) {
    const line = lines[i]!
    const trimmed = line.trim()

    // Track JSDoc blocks
    if (trimmed.startsWith('/**')) {
      inJsDoc = true
      jsDocBuffer = [line]
      i++
      continue
    }
    if (inJsDoc) {
      jsDocBuffer.push(line)
      if (trimmed.endsWith('*/')) {
        inJsDoc = false
        // Don't emit yet — wait to see if next thing is an export
      }
      i++
      continue
    }

    // Imports: always include (show type context)
    if (trimmed.startsWith('import ') || trimmed.startsWith('import{') || trimmed.startsWith('import type')) {
      out.push(line)
      jsDocBuffer = []
      i++
      continue
    }

    // Export declarations
    const isExport =
      trimmed.startsWith('export ') ||
      trimmed.startsWith('export{') ||
      trimmed.startsWith('export type') ||
      trimmed.startsWith('export interface') ||
      trimmed.startsWith('export abstract') ||
      trimmed.startsWith('export default')

    if (isExport) {
      // Emit the accumulated JSDoc
      if (jsDocBuffer.length > 0) {
        out.push('')
        out.push(...jsDocBuffer)
        jsDocBuffer = []
      } else {
        out.push('')
      }

      // For type aliases, interfaces, and const/let/var — emit as-is up to the end
      const isTypeOnly =
        trimmed.startsWith('export type ') ||
        trimmed.startsWith('export interface ')
      const isConst =
        trimmed.startsWith('export const ') ||
        trimmed.startsWith('export let ') ||
        trimmed.startsWith('export enum ')

      if (isTypeOnly || isConst) {
        // Collect until matching close brace or semicolon
        const declLines: string[] = []
        let depth = 0
        let j = i
        while (j < lines.length) {
          const l = lines[j]!
          declLines.push(l)
          for (const ch of l) {
            if (ch === '{') depth++
            else if (ch === '}') depth--
          }
          if (depth <= 0 && (l.includes('}') || l.includes(';') || l.trim() === '')) {
            break
          }
          j++
        }
        out.push(...declLines)
        i = j + 1
        continue
      }

      // For functions and class methods — strip body
      const declLines: string[] = []
      let depth = 0
      let foundOpen = false
      let j = i

      while (j < lines.length) {
        const l = lines[j]!
        declLines.push(l)

        for (const ch of l) {
          if (ch === '{') {
            depth++
            foundOpen = true
          } else if (ch === '}') {
            depth--
          }
        }

        // If we find the opening brace, we can collapse the body
        if (foundOpen && depth === 0) {
          // Collapse: emit everything up to opening brace, then {}
          const openIdx = declLines.findIndex(dl => dl.includes('{'))
          const header = declLines.slice(0, openIdx + 1)
          // Keep only up to and including the opening brace on the last line
          const lastHeader = header[header.length - 1] ?? ''
          const bracePos = lastHeader.indexOf('{')
          const headerLine = lastHeader.slice(0, bracePos + 1) + ' /* ... */ }'
          out.push(...header.slice(0, -1))
          out.push(headerLine)
          i = j + 1
          break
        }

        // No opening brace — it's a declaration without body (abstract method, overload)
        if (!foundOpen && (l.trim().endsWith(';') || l.trim() === '')) {
          out.push(...declLines)
          i = j + 1
          break
        }

        j++
      }
      if (j >= lines.length) i = j
      continue
    }

    // Skip anything else (internal implementation lines)
    jsDocBuffer = [] // Clear JSDoc buffer if it wasn't followed by an export
    i++
  }

  // Remove excessive blank lines
  const result: string[] = []
  let blanks = 0
  for (const l of out) {
    if (l.trim() === '') {
      blanks++
      if (blanks <= 2) result.push(l)
    } else {
      blanks = 0
      result.push(l)
    }
  }

  return result.join('\n')
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('📦 YAAF KB Source Extractor')
  console.log(`   Source:  ${SRC_DIR}`)
  console.log(`   Docs:    ${DOCS_DIR}`)
  console.log(`   Output:  ${RAW_SOURCE_DIR}`)
  console.log('')

  // Ensure output dirs exist
  await fs.mkdir(RAW_SOURCE_DIR, { recursive: true })
  await fs.mkdir(RAW_DOCS_DIR, { recursive: true })

  // ── Phase 1: Extract TypeScript signatures ────────────────────────────────

  console.log('Phase 1: Extracting TypeScript signatures...')
  let tsTotal = 0
  let tsWritten = 0
  let tsSkipped = 0
  let tsLinesBefore = 0
  let tsLinesAfter = 0

  for await (const filePath of walk(SRC_DIR, shouldInclude)) {
    const rel = path.relative(SRC_DIR, filePath)
    const outPath = path.join(RAW_SOURCE_DIR, rel)
    await fs.mkdir(path.dirname(outPath), { recursive: true })

    const source = await fs.readFile(filePath, 'utf8')
    const sourceLines = source.split('\n').length

    // Skip already-up-to-date files (by mtime)
    let needsUpdate = true
    try {
      const srcStat = await fs.stat(filePath)
      const outStat = await fs.stat(outPath)
      if (outStat.mtimeMs > srcStat.mtimeMs) {
        needsUpdate = false
      }
    } catch {
      // Output doesn't exist yet
    }

    if (!needsUpdate) {
      log(`  ⏭ skip  ${rel}`)
      tsSkipped++
      tsTotal++
      continue
    }

    const extracted = extractSignatures(source, filePath)
    const extractedLines = extracted.split('\n').length

    await fs.writeFile(outPath, extracted, 'utf8')

    tsLinesBefore += sourceLines
    tsLinesAfter += extractedLines
    tsWritten++
    tsTotal++

    log(`  ✓ ${rel} (${sourceLines} → ${extractedLines} lines)`)
  }

  const ratio = tsLinesBefore > 0
    ? Math.round((1 - tsLinesAfter / tsLinesBefore) * 100)
    : 0

  console.log(`  ${tsWritten} files extracted, ${tsSkipped} skipped (up-to-date)`)
  if (tsLinesBefore > 0) {
    console.log(`  ${tsLinesBefore.toLocaleString()} lines → ${tsLinesAfter.toLocaleString()} lines (${ratio}% reduction)`)
  }
  console.log('')

  // ── Phase 2: Copy docs verbatim ───────────────────────────────────────────

  console.log('Phase 2: Copying documentation...')
  let docsTotal = 0
  try {
    const docFiles = await fs.readdir(DOCS_DIR)
    for (const f of docFiles.filter(f => f.endsWith('.md'))) {
      const src = path.join(DOCS_DIR, f)
      const dst = path.join(RAW_DOCS_DIR, f)
      await fs.copyFile(src, dst)
      log(`  ✓ docs/${f}`)
      docsTotal++
    }
  } catch {
    console.log('  ⚠ No docs/ directory found — skipping')
  }
  console.log(`  ${docsTotal} documentation files copied`)
  console.log('')

  console.log('✅ Extraction complete.')
  console.log(`   ${tsTotal} source files → knowledge/raw/source/`)
  console.log(`   ${docsTotal} doc files   → knowledge/raw/docs/`)
  console.log('')
  console.log('Next: npm run kb:compile')
}

main().catch(err => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
