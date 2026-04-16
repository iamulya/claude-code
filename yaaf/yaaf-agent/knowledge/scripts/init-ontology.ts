#!/usr/bin/env npx tsx
/**
 * kb:init — Interactive ontology.yaml generator
 *
 * Asks a few questions about your knowledge domain, scans your source
 * directories, and uses an LLM to draft a complete ontology.yaml that
 * you can review, tweak, and commit.
 *
 * Usage:
 *   npx tsx knowledge/scripts/init-ontology.ts
 *   npx tsx knowledge/scripts/init-ontology.ts --domain "My SDK" --src ./src
 *   npx tsx knowledge/scripts/init-ontology.ts --overwrite   # regenerate existing
 *
 * Required environment variable (one of):
 *   GOOGLE_API_KEY / GEMINI_API_KEY   → Google Gemini
 *   ANTHROPIC_API_KEY                 → Anthropic Claude
 *   OPENAI_API_KEY                    → OpenAI (or compatible)
 *
 * Options:
 *   --domain <text>          Domain description (skips the prompt)
 *   --src <dir>              Source directory to scan (can repeat)
 *   --entity-types <types>   Comma-separated hints (e.g. "class,function,guide")
 *   --output <path>          Output path (default: ./knowledge/ontology.yaml)
 *   --model <name>           Model name (used for BOTH extraction and synthesis)
 *   --overwrite              Overwrite existing ontology.yaml
 *
 * Override defaults via env vars:
 *   LLM_MODEL=...            Model for both stages (universal)
 *   KB_EXTRACTION_MODEL=...  Fast/cheap model for the extraction pass
 *   KB_SYNTHESIS_MODEL=...   Capable model for article synthesis
 *   LLM_BASE_URL=...         Use any OpenAI-compatible endpoint (Ollama, GLM, DeepSeek…)
 */

import * as readline from 'node:readline/promises'
import * as path     from 'node:path'
import { stdin, stdout } from 'node:process'

import { OntologyGenerator }                              from 'yaaf/knowledge'
import type { GenerateFn }                                from 'yaaf/knowledge'
import { detectKBProvider, createKBGenerateFns }          from './llm-client.js'
import type { KBProviderConfig }                          from './llm-client.js'

// ── Parse CLI args ─────────────────────────────────────────────────────────────

function parseArgs() {
  const args   = process.argv.slice(2)
  const result = {
    domain:      '',
    srcDirs:     [] as string[],
    entityTypes: [] as string[],
    output:      '',
    model:       '',
    overwrite:   false,
  }

  for (let i = 0; i < args.length; i++) {
    const flag = args[i]!
    const next = args[i + 1]

    if (flag === '--domain'       && next) { result.domain      = next; i++; continue }
    if (flag === '--src'          && next) { result.srcDirs.push(next); i++; continue }
    if (flag === '--entity-types' && next) {
      result.entityTypes = next.split(',').map(s => s.trim()); i++; continue
    }
    if (flag === '--output'  && next) { result.output    = next; i++; continue }
    if (flag === '--model'   && next) { result.model     = next; i++; continue }
    if (flag === '--overwrite')         { result.overwrite = true; continue }
  }

  return result
}

// ── Prompt helpers ─────────────────────────────────────────────────────────────

function bold(s: string) { return `\x1b[1m${s}\x1b[0m` }
function dim(s: string)  { return `\x1b[2m${s}\x1b[0m` }
function green(s: string){ return `\x1b[32m${s}\x1b[0m` }
function yellow(s: string){ return `\x1b[33m${s}\x1b[0m` }
function red(s: string)  { return `\x1b[31m${s}\x1b[0m` }

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const cli = parseArgs()
  const rl  = readline.createInterface({ input: stdin, output: stdout })

  const cleanup = () => rl.close()
  process.on('SIGINT',  cleanup)
  process.on('SIGTERM', cleanup)

  console.log()
  console.log(bold('🧠  YAAF KB — Ontology Generator'))
  console.log(dim('   Drafts an ontology.yaml for your knowledge base using an LLM.'))
  console.log()

  // ── Step 1: Domain description ─────────────────────────────────────────────

  let domain = cli.domain
  if (!domain) {
    console.log(bold('Step 1 of 3 — Describe your knowledge domain'))
    console.log(dim('  Write 1–3 sentences covering: what the project is, what it does,'))
    console.log(dim('  and what kinds of things developers will ask about.'))
    console.log()
    console.log(dim('  Example: "FastAPI — a Python web framework for building REST APIs.'))
    console.log(dim('  Covers routing, validation, dependency injection, and deployment."'))
    console.log()

    domain = await rl.question('  > ')
    if (!domain.trim()) {
      console.error(red('Domain description is required.'))
      process.exit(1)
    }
    console.log()
  }

  // ── Step 2: Source directories ─────────────────────────────────────────────

  let srcDirs = cli.srcDirs
  if (srcDirs.length === 0) {
    console.log(bold('Step 2 of 3 — Source directories to scan'))
    console.log(dim('  Paths relative to cwd. The generator scans the file tree to'))
    console.log(dim('  understand your project structure (not the full file contents).'))
    console.log(dim('  Press Enter to use the default (./src), separate multiple with commas.'))
    console.log()

    const raw = await rl.question('  > (default: ./src) ')
    srcDirs = raw.trim()
      ? raw.split(',').map(s => s.trim()).filter(Boolean)
      : ['./src']
    console.log()
  }

  // ── Step 3: Entity type hints (optional) ──────────────────────────────────

  let entityTypeHints = cli.entityTypes
  if (entityTypeHints.length === 0) {
    console.log(bold('Step 3 of 3 — Entity type hints (optional)'))
    console.log(dim('  What "kinds of things" exist in your knowledge domain?'))
    console.log(dim('  The LLM will infer these if you skip, but hints improve accuracy.'))
    console.log(dim('  Examples: class, function, hook, guide, concept, plugin, recipe'))
    console.log()

    const raw = await rl.question('  > (comma-separated, or press Enter to skip) ')
    entityTypeHints = raw.trim()
      ? raw.split(',').map(s => s.trim()).filter(Boolean)
      : []
    console.log()
  }

  rl.close()

  // ── Configure model ────────────────────────────────────────────────────────

  // Detect provider from environment (GOOGLE_API_KEY / ANTHROPIC_API_KEY / OPENAI_API_KEY)
  // The --model flag, if supplied, overrides BOTH extraction and synthesis models.
  function resolveProvider(): KBProviderConfig {
    try {
      return detectKBProvider()
    } catch (err) {
      console.error(red(`Error: ${(err as Error).message}`))
      process.exit(1)
    }
  }
  const providerConfig = resolveProvider()

  if (cli.model) {
    providerConfig.extractionModel = cli.model
    providerConfig.synthesisModel  = cli.model
  }

  const modelName  = providerConfig.synthesisModel
  const outputPath = cli.output
    ? path.resolve(cli.output)
    : path.resolve(process.cwd(), 'knowledge', 'ontology.yaml')

  const { synthesisFn } = await createKBGenerateFns(providerConfig)
  // For ontology generation we only need one model call — use synthesisFn
  // (the capable model gives better entity/relationship discovery)
  const generateFn: GenerateFn = synthesisFn

  const generator = new OntologyGenerator({ generateFn, outputPath })

  // ── Generate ───────────────────────────────────────────────────────────────

  console.log(bold('Generating ontology.yaml...'))
  console.log(dim(`  Provider: ${providerConfig.provider}`))
  console.log(dim(`  Model:    ${modelName}`))
  console.log(dim(`  Output:   ${outputPath}`))
  console.log(dim(`  Scanning: ${srcDirs.join(', ')}`))
  if (entityTypeHints.length > 0) {
    console.log(dim(`  Hints:  ${entityTypeHints.join(', ')}`))
  }
  console.log()

  let result
  try {
    result = await generator.generate({
      domain: domain.trim(),
      srcDirs,
      entityTypeHints: entityTypeHints.length > 0 ? entityTypeHints : undefined,
      overwrite: cli.overwrite,
    })
  } catch (err) {
    console.error(red(`\nError: ${(err as Error).message}`))
    process.exit(1)
  }

  // ── Report results ─────────────────────────────────────────────────────────

  if (result.warnings.length > 0) {
    console.log(yellow('⚠  Validation warnings (review and fix before running kb:build):'))
    for (const w of result.warnings) {
      console.log(yellow(`   ${w}`))
    }
    console.log()
  }

  console.log(green(`✓  ontology.yaml written to: ${result.outputPath}`))
  console.log()
  console.log(bold('Next steps:'))
  console.log('  1. Review and edit the generated ontology.yaml')
  console.log('     ' + dim('(check entity types, article structure, vocabulary)'))
  console.log('  2. Run the KB build:')
  console.log('     ' + dim('npm run kb:build'))
  console.log('  3. Commit both the ontology and the compiled KB:')
  console.log('     ' + dim('git add knowledge/ && git commit -m "chore: initial KB build"'))
  console.log()
}

main().catch(err => {
  console.error(red(`Fatal: ${(err as Error).message}`))
  process.exit(1)
})
