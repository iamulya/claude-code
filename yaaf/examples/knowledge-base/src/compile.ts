/**
 * KB Compile Script
 *
 * Runs the full YAAF knowledge base compilation pipeline:
 *   raw/**  →  Ingestion  →  Extraction  →  Synthesis  →  Lint
 *
 * Produces structured wiki articles in kb/compiled/ that the
 * knowledge base agent uses as context.
 *
 * Usage:
 *   GEMINI_API_KEY=...    npx tsx src/compile.ts
 *   OPENAI_API_KEY=sk-... npx tsx src/compile.ts
 *
 * Options:
 *   --clip <url>   Clip a web page and add it to raw/web-clips/ before compiling
 *   --lint-only    Run linter only (no compile)
 *   --fix          Auto-fix lint issues
 *   --incremental  Skip sources older than their compiled article (faster reruns)
 */

import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { KBCompiler, makeGenerateFn } from 'yaaf/knowledge'
import { GeminiChatModel, OpenAIChatModel, AnthropicChatModel } from 'yaaf'
import type { LintIssue } from 'yaaf/knowledge'
import type { CompileProgressEvent } from 'yaaf/knowledge'

const __dirname = dirname(fileURLToPath(import.meta.url))
const KB_DIR = join(__dirname, '..', 'kb')

// ── ANSI color helpers ─────────────────────────────────────────────────────────

const c = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  cyan: '\x1b[36m', green: '\x1b[32m', yellow: '\x1b[33m',
  magenta: '\x1b[35m', blue: '\x1b[34m', red: '\x1b[31m',
}

const log = (msg: string) => console.log(msg)
const logHeader = (msg: string) => log(`\n${c.bold}${c.cyan}${msg}${c.reset}`)
const logStep = (msg: string) => log(`  ${c.yellow}→${c.reset} ${msg}`)
const logOk = (msg: string) => log(`  ${c.green}✓${c.reset} ${msg}`)
const logWarn = (msg: string) => log(`  ${c.yellow}⚠${c.reset} ${msg}`)
const logErr = (msg: string) => log(`  ${c.red}✗${c.reset} ${msg}`)

// ── Model factory — picks provider from env ────────────────────────────────────

function createModels(): {
  extractionModel: ReturnType<typeof makeGenerateFn>
  synthesisModel: ReturnType<typeof makeGenerateFn>
} {
  if (process.env['GEMINI_API_KEY']) {
    const extractionModel = makeGenerateFn(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new GeminiChatModel({ apiKey: process.env['GEMINI_API_KEY'], model: process.env['GEMINI_EXTRACTION_MODEL'] ?? 'gemini-2.5-flash' }) as any,
      { temperature: 0.0 },
    )
    const synthesisModel = makeGenerateFn(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new GeminiChatModel({ apiKey: process.env['GEMINI_API_KEY'], model: process.env['GEMINI_SYNTHESIS_MODEL'] ?? 'gemini-2.5-pro' }) as any,
      { temperature: 0.1, maxTokens: 8192 },
    )
    return { extractionModel, synthesisModel }
  }

  if (process.env['OPENAI_API_KEY']) {
    const extractionModel = makeGenerateFn(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new OpenAIChatModel({ apiKey: process.env['OPENAI_API_KEY'], model: process.env['OPENAI_EXTRACTION_MODEL'] ?? 'gpt-4o-mini' }) as any,
      { temperature: 0.0 },
    )
    const synthesisModel = makeGenerateFn(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new OpenAIChatModel({ apiKey: process.env['OPENAI_API_KEY'], model: process.env['OPENAI_SYNTHESIS_MODEL'] ?? 'gpt-4o' }) as any,
      { temperature: 0.1, maxTokens: 8192 },
    )
    return { extractionModel, synthesisModel }
  }

  if (process.env['ANTHROPIC_API_KEY']) {
    const extractionModel = makeGenerateFn(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new AnthropicChatModel({ apiKey: process.env['ANTHROPIC_API_KEY'], model: 'claude-haiku-3-5' }) as any,
      { temperature: 0.0 },
    )
    const synthesisModel = makeGenerateFn(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new AnthropicChatModel({ apiKey: process.env['ANTHROPIC_API_KEY'], model: 'claude-sonnet-4-5' }) as any,
      { temperature: 0.1, maxTokens: 8192 },
    )
    return { extractionModel, synthesisModel }
  }

  throw new Error(
    `No LLM API key found.\n\nSet one of:\n` +
    `  GEMINI_API_KEY=...\n` +
    `  OPENAI_API_KEY=sk-...\n` +
    `  ANTHROPIC_API_KEY=sk-ant-...\n`,
  )
}

// ── Arguments ─────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2)
  const clipIdx = args.indexOf('--clip')
  return {
    clipUrl: clipIdx >= 0 ? args[clipIdx + 1] : undefined,
    lintOnly: args.includes('--lint-only'),
    autoFix: args.includes('--fix'),
    incremental: args.includes('--incremental'),
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const { clipUrl, lintOnly, autoFix, incremental } = parseArgs()
  let models: ReturnType<typeof createModels>

  try {
    models = createModels()
  } catch (err) {
    logErr((err as Error).message)
    process.exit(1)
  }

  logHeader('📚 YAAF Knowledge Base Compiler')
  log(`${c.dim}KB directory: ${KB_DIR}${c.reset}`)

  // ── Create compiler ─────────────────────────────────────────────────────────

  logStep('Loading ontology and registry...')
  let compiler: KBCompiler
  try {
    compiler = await KBCompiler.create({
      kbDir: KB_DIR,
      extractionModel: models.extractionModel,
      synthesisModel: models.synthesisModel,
      autoLint: true,
      autoFix,
    })
    logOk(`Ontology loaded. Registry: ${compiler.conceptRegistry.size} entries`)
  } catch (err) {
    logErr(`Failed to initialize compiler: ${(err as Error).message}`)
    process.exit(1)
  }

  // ── Web clip (optional) ─────────────────────────────────────────────────────

  if (clipUrl) {
    logStep(`Clipping ${clipUrl} ...`)
    try {
      const clip = await compiler.clip(clipUrl)
      logOk(`Clipped: "${clip.title}" → ${clip.savedPath} (${clip.imageCount} images)`)
    } catch (err) {
      logWarn(`Web clipping failed: ${(err as Error).message}`)
      logWarn(`Tip: Install optional deps: npm install @mozilla/readability jsdom turndown`)
    }
  }

  // ── Lint only ──────────────────────────────────────────────────────────────

  if (lintOnly) {
    logStep('Running linter...')
    const report = await compiler.lint()
    printLintReport(report)

    if (autoFix && report.summary.autoFixable > 0) {
      logStep('Applying auto-fixes...')
      const fixes = await compiler.fix(report)
      logOk(`Fixed ${fixes.fixedCount} issues`)
      if (fixes.skipped.length > 0) {
        logWarn(`${fixes.skipped.length} issues require manual review`)
      }
    }

    process.exit(report.summary.errors > 0 ? 1 : 0)
    return
  }

  // ── Full compile ────────────────────────────────────────────────────────────

  log('')
  const result = await compiler.compile({
    incrementalMode: incremental,
    concurrency: 3,
    onProgress(event: CompileProgressEvent) {
      switch (event.stage) {
        case 'scan':
          logStep(`Found ${event.fileCount} source files in raw/`)
          break
        case 'ingest':
          process.stdout.write(
            `\r  ${c.dim}Ingesting ${event.processed}/${event.total}: ${event.file.split('/').slice(-2).join('/')}${c.reset}  `,
          )
          break
        case 'extract':
          logStep(event.message)
          break
        case 'synthesize': {
          const e = event.event
          if (e.type === 'article:started')
            logStep(`Writing "${e.title}"...`)
          else if (e.type === 'article:written')
            logOk(`"${e.title}" — ${e.wordCount} words`)
          else if (e.type === 'article:failed')
            logErr(`"${e.title}": ${e.error.message}`)
          else if (e.type === 'stub:created')
            logOk(`  (stub) "${e.title}"`)
          break
        }
        case 'lint':
          logStep(`Lint: ${event.issueCount} issue(s), ${event.autoFixable} auto-fixable`)
          break
        case 'fix':
          logOk(`Auto-fixed ${event.fixedCount} issues`)
          break
      }
    },
  })

  // ── Summary ────────────────────────────────────────────────────────────────

  log('')
  logHeader('📊 Compile Summary')

  log(`  Sources:  ${result.sourcesIngested}/${result.sourcesScanned} ingested`)
  log(`  Created:  ${c.green}${result.synthesis.created}${c.reset} articles`)
  log(`  Updated:  ${result.synthesis.updated} articles`)
  log(`  Stubs:    ${result.synthesis.stubsCreated} stubs`)
  if (result.synthesis.failed > 0) {
    log(`  ${c.red}Failed:${c.reset}   ${result.synthesis.failed} articles`)
  }
  log(`  Time:     ${(result.durationMs / 1000).toFixed(1)}s`)

  if (result.ingestErrors.length > 0) {
    log(`\n  ${c.yellow}Ingestion errors:${c.reset}`)
    for (const { file, error } of result.ingestErrors) {
      logWarn(`${file}: ${error}`)
    }
  }

  if (result.warnings.length > 0) {
    log('')
    for (const w of result.warnings) logWarn(w)
  }

  if (result.lint) {
    log('')
    printLintReport(result.lint)
  }

  if (result.fixes) {
    logOk(`Auto-fixed ${result.fixes.fixedCount} lint issues`)
  }

  log('')
  if (result.synthesis.created + result.synthesis.updated > 0) {
    logOk(`KB is ready. Run "npm run chat" to ask questions.`)
  } else if (result.sourcesIngested === 0) {
    logWarn(`No source files to compile. Add files to kb/raw/ first.`)
  }

  process.exit(result.synthesis.failed > 0 ? 1 : 0)
}

// ── Lint report printer ───────────────────────────────────────────────────────

function printLintReport(report: Awaited<ReturnType<KBCompiler['lint']>>) {
  const { errors, warnings, info, autoFixable } = report.summary
  const total = errors + warnings + info

  if (total === 0) {
    logOk(`Lint clean — ${report.articlesChecked} articles checked`)
    return
  }

  log(`  Lint: ${c.bold}${total} issue(s)${c.reset} across ${report.articlesChecked} articles`)
  if (errors > 0) log(`    ${c.red}Errors:${c.reset}   ${errors}`)
  if (warnings > 0) log(`    ${c.yellow}Warnings:${c.reset} ${warnings}`)
  if (info > 0) log(`    ${c.dim}Info:${c.reset}     ${info}`)
  if (autoFixable > 0) log(`    ${c.green}Auto-fixable: ${autoFixable}${c.reset}  (rerun with --fix)`)

  // Show errors
  const errorIssues = report.issues.filter((i: LintIssue) => i.severity === 'error')
  if (errorIssues.length > 0) {
    log('')
    for (const issue of errorIssues.slice(0, 5)) {
      logErr(`[${issue.code}] ${issue.docId}: ${issue.message}`)
      if (issue.suggestion) log(`       ${c.dim}→ ${issue.suggestion}${c.reset}`)
    }
    if (errorIssues.length > 5) {
      log(`  ${c.dim}... and ${errorIssues.length - 5} more errors (see .kb-lint-report.json)${c.reset}`)
    }
  }
}

main().catch(err => {
  console.error(`\n${c.red}Fatal error:${c.reset}`, err.message ?? err)
  process.exit(1)
})
