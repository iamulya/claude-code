#!/usr/bin/env tsx
/**
 * knowledge/scripts/build-kb.ts
 *
 * Local KB compilation entrypoint.
 *
 * Usage:
 *   npm run kb:compile                # full compile
 *   npm run kb:compile -- --incremental  # only recompile changed files
 *   npm run kb:compile -- --lint-only    # run linter without synthesis
 *   npm run kb:compile -- --force        # ignore hashes, recompile everything
 *
 * Required environment variables (at least one model provider):
 *   GOOGLE_API_KEY / GEMINI_API_KEY  → gemini-3-flash-preview (both stages)
 *   ANTHROPIC_API_KEY                → claude-haiku-4 (extract) + claude-sonnet-4 (synth)
 *   OPENAI_API_KEY                   → gpt-4o-mini (extract) + gpt-4o (synth)
 *
 * Override defaults:
 *   EXTRACTION_MODEL=<name>  → override the extraction model
 *   SYNTHESIS_MODEL=<name>   → override the synthesis model
 *
 * The compiled/ output is committed to git and shipped in the npm package.
 */

import * as path from 'path'
import * as fs   from 'fs/promises'
import { detectKBProvider, createKBGenerateFns } from './llm-client.js'

// Script lives at: yaaf-agent/knowledge/scripts/build-kb.ts
// Dist lives at:   yaaf/dist/  (sibling of yaaf-agent/)
const AGENT_DIR = path.resolve(import.meta.dirname, '..', '..')       // yaaf-agent/
const YAAF_DIST = path.resolve(import.meta.dirname, '..', '..', '..', 'dist')  // yaaf/dist/
const KB_DIR    = path.join(AGENT_DIR, 'knowledge')

// ── CLI flags ─────────────────────────────────────────────────────────────────

const flags = {
  incremental: process.argv.includes('--incremental'),
  lintOnly: process.argv.includes('--lint-only'),
  force: process.argv.includes('--force'),
  verbose: process.argv.includes('--verbose'),
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('📚 YAAF Knowledge Base Compiler')
  console.log(`   KB root: ${KB_DIR}`)
  console.log(`   Mode:    ${flags.lintOnly ? 'lint-only' : flags.incremental ? 'incremental' : flags.force ? 'force' : 'standard'}`)
  console.log('')

  // Validate raw/ exists
  try {
    await fs.access(path.join(KB_DIR, 'raw'))
  } catch {
    console.error('❌ knowledge/raw/ not found.')
    console.error('   Run `npm run kb:extract` first to populate raw source material.')
    process.exit(1)
  }

  // Detect model provider (Gemini / Anthropic / OpenAI — whichever key is set)
  let providerConfig: Awaited<ReturnType<typeof detectKBProvider>>
  try {
    providerConfig = detectKBProvider()
    console.log(`   Provider:         ${providerConfig.provider}`)
    console.log(`   Extraction model: ${providerConfig.extractionModel}`)
    console.log(`   Synthesis model:  ${providerConfig.synthesisModel}`)
    console.log('')
  } catch (err: any) {
    console.error('❌', err.message)
    process.exit(1)
  }

  // Build LLM clients
  const { extractionFn, synthesisFn } = await createKBGenerateFns(providerConfig)

  // Load the KBCompiler
  const { KBCompiler } = await import(`${YAAF_DIST}/knowledge/compiler/index.js`)

  const compiler = await KBCompiler.create({
    kbDir: KB_DIR,
    extractionModel: extractionFn,
    synthesisModel: synthesisFn,
  })

  // ── Lint only ────────────────────────────────────────────────────────────

  if (flags.lintOnly) {
    console.log('Running linter...')
    const report = await compiler.lint()
    printLintReport(report)
    process.exit(report.errors.length > 0 ? 1 : 0)
  }

  // ── Full or incremental compile ───────────────────────────────────────────

  const startTime = Date.now()
  let lastProgressLine = ''

  const result = await compiler.compile({
    incremental: flags.incremental && !flags.force,
    onProgress: (event: any) => {
      const line = formatProgress(event)
      if (line !== lastProgressLine) {
        process.stdout.write(`\r  ${line.padEnd(70)}`)
        lastProgressLine = line
      }
    },
  })

  process.stdout.write('\n')
  console.log('')

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

  // ── Print results ─────────────────────────────────────────────────────────

  console.log('✅ Compilation complete')
  console.log('')
  console.log('  Ingestion:')
  console.log(`    Files processed: ${result.ingestion?.filesProcessed ?? '?'}`)
  console.log(`    Files skipped:   ${result.ingestion?.filesSkipped ?? '?'}`)
  console.log('')
  console.log('  Synthesis:')
  console.log(`    Articles created:  ${result.synthesis.created}`)
  console.log(`    Articles updated:  ${result.synthesis.updated}`)
  console.log(`    Articles skipped:  ${result.synthesis.skipped ?? 0}  ← clean (sources unchanged)`) 
  console.log(`    Articles failed:   ${result.synthesis.failed}`)
  console.log(`    Stubs written:     ${result.synthesis.stubs ?? 0}`)
  console.log('')
  console.log(`  Total time: ${elapsed}s`)
  console.log('')

  if (result.synthesis.failed > 0) {
    console.log('⚠️  Some articles failed to synthesize. Re-run to retry.')
  }

  // ── Auto-lint after compile ─────────────────────────────────────────────

  console.log('Running post-compile lint...')
  const report = await compiler.lint()
  printLintReport(report)

  console.log('')
  console.log(`📁 Output: ${path.join(KB_DIR, 'compiled')}`)
  console.log('')
  console.log('Commit with:')
  console.log('  git add yaaf-agent/knowledge/compiled/ yaaf-agent/knowledge/.kb-registry.json')
  console.log('  git commit -m "chore(yaaf-agent): rebuild knowledge base"')
}

// ── Formatters ────────────────────────────────────────────────────────────────

function formatProgress(event: any): string {
  if (!event) return ''
  switch (event.type) {
    case 'ingesting':
      return `Ingesting: ${event.file ?? ''}`
    case 'extracting':
      return `Extracting concepts from: ${event.file ?? ''}`
    case 'synthesizing':
      return `Synthesizing: ${event.articleTitle ?? event.docId ?? ''}`
    case 'linting':
      return `Linting: ${event.file ?? ''}`
    default:
      return event.type ?? ''
  }
}

function printLintReport(report: any) {
  if (!report) return
  const errors = report.errors ?? []
  const warnings = report.warnings ?? []

  if (errors.length === 0 && warnings.length === 0) {
    console.log('  ✅ Lint: no issues')
    return
  }

  if (errors.length > 0) {
    console.log(`  ❌ ${errors.length} lint error(s):`)
    for (const e of errors.slice(0, 10)) {
      console.log(`    • [${e.docId ?? '?'}] ${e.message}`)
    }
    if (errors.length > 10) console.log(`    ... and ${errors.length - 10} more`)
  }

  if (warnings.length > 0) {
    console.log(`  ⚠️  ${warnings.length} lint warning(s):`)
    for (const w of warnings.slice(0, 5)) {
      console.log(`    • [${w.docId ?? '?'}] ${w.message}`)
    }
    if (warnings.length > 5) console.log(`    ... and ${warnings.length - 5} more`)
  }
}

main().catch(err => {
  console.error('Fatal:', err.message)
  if (flags.verbose) console.error(err.stack)
  process.exit(1)
})
