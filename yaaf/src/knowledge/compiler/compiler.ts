/**
 * KB Pipeline Coordinator — KBCompiler
 *
 * The KBCompiler is the single entry point for the knowledge base compilation
 * pipeline. It wires all four stages together and manages the KB directory layout.
 *
 *   raw/**        → Ingester     → IngestedContent[]
 *   IngestedContent[] → Extractor    → CompilationPlan
 *   CompilationPlan   → Synthesizer  → compiled/**  +  .kb-registry.json
 *   compiled/**   → Linter       → LintReport  [→ auto-fix]
 *
 * KB directory layout (all paths relative to kbDir):
 *
 *   my-kb/
 *     ontology.yaml          ← required, loaded at init
 *     raw/                   ← source files (Karpathy's "raw materials")
 *       papers/              ← .md, .html — research papers
 *       web-clips/           ← Obsidian Web Clipper output (already .md)
 *       tools/               ← tool documentation
 *       datasets/            ← dataset descriptions
 *     compiled/              ← LLM-authored wiki (output, managed by compiler)
 *       concepts/            ← concept articles
 *       tools/               ← tool articles
 *       research-papers/     ← paper articles
 *     .kb-registry.json      ← auto-maintained index cache
 *     .kb-lint-report.json   ← last lint report (for CI checks)
 *
 * Usage:
 * ```ts
 * const compiler = await KBCompiler.create({
 *   kbDir: '/path/to/my-kb',
 *   extractionModel: makeGenerateFn(new GeminiChatModel({ model: 'gemini-2.5-flash' })),
 *   synthesisModel:  makeGenerateFn(new GeminiChatModel({ model: 'gemini-2.5-pro' })),
 * })
 *
 * const result = await compiler.compile()
 * console.log(`Created ${result.synthesis.created} articles`)
 * ```
 */

import { readFile, writeFile, mkdir, stat, readdir } from 'fs/promises'
import { join, extname, resolve } from 'path'

import {
  OntologyLoader,
  buildConceptRegistry,
  deserializeRegistry,
  serializeRegistry,
} from '../ontology/index.js'
import type { KBOntology, ConceptRegistry } from '../ontology/index.js'

import { ingestFile, canIngest, requiredOptionalDeps } from './ingester/index.js'
import type { IngestedContent, IngesterOptions } from './ingester/index.js'

import { ConceptExtractor } from './extractor/index.js'
import type { CompilationPlan } from './extractor/index.js'

import { KnowledgeSynthesizer } from './synthesizer/index.js'
import type { SynthesisResult, SynthesisOptions, SynthesisProgressEvent } from './synthesizer/index.js'

import { KBLinter } from './linter/index.js'
import type { LintReport, AutoFixResult, LintOptions } from './linter/index.js'

import type { GenerateFn } from './extractor/extractor.js'

// ── Types ─────────────────────────────────────────────────────────────────────

/** Something that looks like a YAAF BaseLLMAdapter (can be used with makeGenerateFn) */
export type ModelLike = {
  complete(params: {
    messages: Array<{ role: string; content: string }>
    temperature?: number
    maxTokens?: number
  }): Promise<{ content?: string | null }>
}

export type KBCompilerOptions = {
  /**
   * Root of the Knowledge Base directory.
   * Must contain ontology.yaml.
   */
  kbDir: string

  /**
   * Fast/cheap LLM for the extraction pass (classification + planning).
   * Recommended: gemini-2.5-flash, claude-haiku, gpt-4o-mini
   */
  extractionModel: GenerateFn | ModelLike

  /**
   * Capable LLM for the synthesis pass (article authoring).
   * Recommended: gemini-2.5-pro, claude-opus, gpt-4o
   */
  synthesisModel: GenerateFn | ModelLike

  /**
   * Override subdirectory names. Defaults: raw/, compiled/
   */
  rawDirName?: string
  compiledDirName?: string

  /**
   * Override ontology file path.
   * Default: {kbDir}/ontology.yaml
   */
  ontologyPath?: string

  /**
   * Run the linter automatically after each compile().
   * Default: true
   */
  autoLint?: boolean

  /**
   * Apply auto-fixable lint issues after each lint pass.
   * Default: false (report only, no mutation)
   */
  autoFix?: boolean
}

export type CompileOptions = {
  /** Only process source files newer than their compiled counterpart */
  incrementalMode?: boolean

  /**
   * Glob-style patterns for source files to include.
   * Default: all supported file types.
   */
  include?: string[]

  /** Max parallel synthesis calls (default: 3) */
  concurrency?: number

  /** If true, run full pipeline but write nothing to disk */
  dryRun?: boolean

  /** Progress callback for real-time pipeline updates */
  onProgress?: (event: CompileProgressEvent) => void

  /** Lint options passed to the linter stage */
  lintOptions?: Omit<LintOptions, 'skipDocIds'>
}

export type CompileProgressEvent =
  | { stage: 'scan';       fileCount: number }
  | { stage: 'ingest';     processed: number; total: number; file: string }
  | { stage: 'extract';    message: string }
  | { stage: 'synthesize'; event: SynthesisProgressEvent }
  | { stage: 'lint';       issueCount: number; autoFixable: number }
  | { stage: 'fix';        fixedCount: number }
  | { stage: 'complete';   result: CompileResult }

export type CompileResult = {
  /** True if the pipeline completed without critical errors */
  success: boolean

  /** Number of source files scanned (before filtering) */
  sourcesScanned: number

  /** Number of source files ingested (passed canIngest check) */
  sourcesIngested: number

  /** Synthesis stage output */
  synthesis: SynthesisResult

  /** Lint report (if autoLint was enabled) */
  lint?: LintReport

  /** Auto-fix result (if autoFix was enabled) */
  fixes?: AutoFixResult

  /** Total wall-clock time from compile() call to return */
  durationMs: number

  /** Non-fatal errors encountered during ingestion (source files that failed) */
  ingestErrors: Array<{ file: string; error: string }>

  /** Informational warnings (e.g., missing optional deps for some files) */
  warnings: string[]
}

// ── KBCompiler ────────────────────────────────────────────────────────────────

export class KBCompiler {
  private readonly kbDir: string
  private readonly rawDir: string
  private readonly compiledDir: string
  private readonly registryPath: string
  private readonly lintReportPath: string
  private readonly autoLint: boolean
  private readonly autoFix: boolean
  private readonly extractFn: GenerateFn
  private readonly synthFn: GenerateFn
  private ontology!: KBOntology
  private registry!: ConceptRegistry

  private constructor(options: KBCompilerOptions, ontology: KBOntology, registry: ConceptRegistry) {
    this.kbDir = resolve(options.kbDir)
    this.rawDir = join(this.kbDir, options.rawDirName ?? 'raw')
    this.compiledDir = join(this.kbDir, options.compiledDirName ?? 'compiled')
    this.registryPath = join(this.kbDir, '.kb-registry.json')
    this.lintReportPath = join(this.kbDir, '.kb-lint-report.json')
    this.autoLint = options.autoLint ?? true
    this.autoFix = options.autoFix ?? false
    this.extractFn = normalizeGenerateFn(options.extractionModel)
    this.synthFn = normalizeGenerateFn(options.synthesisModel)
    this.ontology = ontology
    this.registry = registry
  }

  // ── Factory ──────────────────────────────────────────────────────────────────

  /**
   * Create a KBCompiler by loading the ontology and registry from disk.
   * Throws if the ontology file is missing or invalid.
   */
  static async create(options: KBCompilerOptions): Promise<KBCompiler> {
    const kbDir = resolve(options.kbDir)
    const ontologyPath = options.ontologyPath ?? join(kbDir, 'ontology.yaml')
    const registryPath = join(kbDir, '.kb-registry.json')
    const compiledDir = join(kbDir, options.compiledDirName ?? 'compiled')

    // Load ontology using the loader's built-in async load()
    const loader = new OntologyLoader(kbDir)
    let ontology: KBOntology
    try {
      const result = await loader.load()
      ontology = result.ontology
    } catch (err) {
      throw new Error(
        `KB ontology not found at "${ontologyPath}".\n` +
        `Create ontology.yaml in your KB directory before compiling.\n` +
        `Original error: ${err instanceof Error ? err.message : String(err)}`,
      )
    }

    // Load or build registry
    let registry: ConceptRegistry
    try {
      const registryJson = await readFile(registryPath, 'utf-8')
      registry = deserializeRegistry(registryJson)
    } catch {
      // No cache — build from compiled/ directory (may be empty on first run)
      await mkdir(compiledDir, { recursive: true })
      try {
        const { registry: built } = await buildConceptRegistry(compiledDir, ontology)
        registry = built
      } catch {
        registry = new Map()
      }
    }

    return new KBCompiler(options, ontology, registry)
  }

  // ── Public: compile() ────────────────────────────────────────────────────────

  /**
   * Run the full compilation pipeline.
   *
   * 1. Scan raw/ for source files
   * 2. Ingest each source file
   * 3. Extract compilation plan (LLM)
   * 4. Synthesize articles (LLM)
   * 5. Lint the compiled KB
   * 6. Auto-fix lint issues (if autoFix enabled)
   */
  async compile(options: CompileOptions = {}): Promise<CompileResult> {
    const startMs = Date.now()
    const emit = options.onProgress ?? (() => {})
    const warnings: string[] = []
    const ingestErrors: CompileResult['ingestErrors'] = []

    await mkdir(this.compiledDir, { recursive: true })

    // ── Phase 1: Scan ─────────────────────────────────────────────────────────

    const allSourceFiles = await scanDirectory(this.rawDir)
    const ingestableFiles = allSourceFiles.filter(f => canIngest(f))

    emit({ stage: 'scan', fileCount: ingestableFiles.length })

    // Warn about files requiring optional deps
    const missingDeps = requiredOptionalDeps(ingestableFiles)
    if (missingDeps.length > 0) {
      warnings.push(
        `Some HTML files require optional dependencies: npm install ${missingDeps.join(' ')}`,
      )
    }

    // ── Phase 2: Incremental filter ───────────────────────────────────────────

    let filesToProcess = ingestableFiles
    if (options.incrementalMode) {
      filesToProcess = await filterIncremental(ingestableFiles, this.compiledDir, this.registry)
    }

    // ── Phase 3: Ingest ───────────────────────────────────────────────────────

    const contentsByPath = new Map<string, IngestedContent>()
    let ingestCount = 0

    for (const filePath of filesToProcess) {
      try {
        const ingested = await ingestFile(filePath, {
          imageOutputDir: join(this.compiledDir, 'assets'),
        })
        contentsByPath.set(filePath, ingested)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        ingestErrors.push({ file: filePath, error: msg })
      }
      ingestCount++
      emit({ stage: 'ingest', processed: ingestCount, total: filesToProcess.length, file: filePath })
    }

    const contents = Array.from(contentsByPath.values())

    if (contents.length === 0) {
      // Nothing to compile — only lint existing KB
      const noSourceSynthesis: SynthesisResult = {
        created: 0, updated: 0, stubsCreated: 0, failed: 0, articles: [], durationMs: 0,
      }

      if (this.autoLint) {
        return this.finalize({
          startMs, emit, synthesis: noSourceSynthesis,
          sourcesScanned: ingestableFiles.length,
          sourcesIngested: 0, ingestErrors, warnings,
          lintOptions: options.lintOptions, dryRun: options.dryRun,
        })
      }

      return {
        success: true, sourcesScanned: ingestableFiles.length, sourcesIngested: 0,
        synthesis: noSourceSynthesis, ingestErrors, warnings,
        durationMs: Date.now() - startMs,
      }
    }

    // ── Phase 4: Extract ──────────────────────────────────────────────────────

    emit({ stage: 'extract', message: `Analyzing ${contents.length} source file(s)...` })

    const extractor = new ConceptExtractor(this.ontology, this.registry, this.extractFn)
    const plan = await extractor.buildPlan(contents)

    // ── Phase 5: Synthesize ───────────────────────────────────────────────────

    const synthesizer = new KnowledgeSynthesizer(
      this.ontology,
      this.registry,
      this.synthFn,
      this.compiledDir,
    )

    const synthesis = await synthesizer.synthesize(plan, contentsByPath, {
      concurrency: options.concurrency ?? 3,
      dryRun: options.dryRun,
      onProgress: event => emit({ stage: 'synthesize', event }),
    })

    // Update in-memory registry with any new entries from synthesis
    // (KnowledgeSynthesizer already calls upsertRegistryEntry internally)

    return this.finalize({
      startMs, emit, synthesis,
      sourcesScanned: ingestableFiles.length,
      sourcesIngested: contents.length,
      ingestErrors, warnings,
      lintOptions: options.lintOptions,
      dryRun: options.dryRun,
    })
  }

  // ── Public: individual stages ─────────────────────────────────────────────

  /** Run lint on the compiled KB without running a full compile */
  async lint(options?: LintOptions): Promise<LintReport> {
    const linter = new KBLinter(this.ontology, this.registry, this.compiledDir, this.rawDir)
    return linter.lint(options)
  }

  /** Apply auto-fixes from a lint report */
  async fix(report: LintReport, dryRun: boolean = false): Promise<AutoFixResult> {
    const linter = new KBLinter(this.ontology, this.registry, this.compiledDir, this.rawDir)
    return linter.fix(report, dryRun)
  }

  /**
   * Clip a web page and save it to raw/web-clips/ as markdown with local images.
   * Requires optional deps: @mozilla/readability jsdom turndown
   */
  async clip(url: string): Promise<{ savedPath: string; title: string; imageCount: number }> {
    const { KBClipper } = await import('./ingester/index.js')
    const clipper = new KBClipper(join(this.rawDir, 'web-clips'))
    return clipper.clip(url)
  }

  /** Reload the ontology from disk (useful after editing ontology.yaml) */
  async reloadOntology(): Promise<void> {
    const loader = new OntologyLoader(this.kbDir)
    const { ontology } = await loader.load()
    this.ontology = ontology
  }

  /** Access the current in-memory ConceptRegistry */
  get conceptRegistry(): ConceptRegistry {
    return this.registry
  }

  /** Access the loaded KBOntology */
  get knowledgeOntology(): KBOntology {
    return this.ontology
  }

  // ── Private: finalize ─────────────────────────────────────────────────────

  private async finalize(params: {
    startMs: number
    emit: (e: CompileProgressEvent) => void
    synthesis: SynthesisResult
    sourcesScanned: number
    sourcesIngested: number
    ingestErrors: CompileResult['ingestErrors']
    warnings: string[]
    lintOptions?: LintOptions
    dryRun?: boolean
  }): Promise<CompileResult> {
    const { startMs, emit, synthesis, sourcesScanned, sourcesIngested, ingestErrors, warnings, dryRun } = params

    let lintReport: LintReport | undefined
    let fixResult: AutoFixResult | undefined

    if (this.autoLint) {
      const linter = new KBLinter(this.ontology, this.registry, this.compiledDir, this.rawDir)
      lintReport = await linter.lint(params.lintOptions)

      emit({
        stage: 'lint',
        issueCount: lintReport.issues.length,
        autoFixable: lintReport.summary.autoFixable,
      })

      if (!dryRun) {
        await writeFile(this.lintReportPath, JSON.stringify(lintReport, null, 2), 'utf-8')
      }

      if (this.autoFix && lintReport.summary.autoFixable > 0) {
        fixResult = await linter.fix(lintReport, dryRun)
        emit({ stage: 'fix', fixedCount: fixResult.fixedCount })
      }

      // Persist registry
      if (!dryRun) {
        await writeFile(this.registryPath, serializeRegistry(this.registry), 'utf-8')
      }
    }

    const result: CompileResult = {
      success: synthesis.failed === 0,
      sourcesScanned,
      sourcesIngested,
      synthesis,
      lint: lintReport,
      fixes: fixResult,
      durationMs: Date.now() - startMs,
      ingestErrors,
      warnings,
    }

    emit({ stage: 'complete', result })
    return result
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Normalize a GenerateFn | ModelLike into a GenerateFn */
function normalizeGenerateFn(model: GenerateFn | ModelLike): GenerateFn {
  if (typeof model === 'function') return model

  // ModelLike → GenerateFn via makeGenerateFn inline (avoids circular import)
  return async (systemPrompt: string, userPrompt: string): Promise<string> => {
    const result = await model.complete({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      maxTokens: 4096,
    })
    return result.content ?? ''
  }
}

/** Recursively scan a directory and return all file paths */
async function scanDirectory(dir: string): Promise<string[]> {
  const files: string[] = []
  try {
    const entries = await readdir(dir)
    await Promise.all(
      entries.map(async entry => {
        const fullPath = join(dir, entry)
        try {
          const s = await stat(fullPath)
          if (s.isDirectory()) {
            const nested = await scanDirectory(fullPath)
            files.push(...nested)
          } else if (s.isFile()) {
            files.push(fullPath)
          }
        } catch { /* skip unreadable entries */ }
      }),
    )
  } catch { /* raw/ may not exist yet */ }
  return files.sort()
}

/**
 * Filter source files to only those that are newer than their compiled article.
 * In incremental mode, unchanged source files are skipped.
 */
async function filterIncremental(
  sourceFiles: string[],
  compiledDir: string,
  registry: ConceptRegistry,
): Promise<string[]> {
  const results = await Promise.all(
    sourceFiles.map(async filePath => {
      try {
        const sourceStat = await stat(filePath)
        const sourceMtime = sourceStat.mtimeMs

        // Find if this source contributes to a compiled article
        // (search registry entries where compiled_from includes this path)
        for (const entry of registry.values()) {
          const compiledPath = join(compiledDir, `${entry.docId}.md`)
          try {
            const compiledStat = await stat(compiledPath)
            if (compiledStat.mtimeMs > sourceMtime) {
              return null // Compiled is newer — skip
            }
          } catch { /* compiled doesn't exist — include */ }
        }

        return filePath
      } catch {
        return filePath // If we can't stat, include it
      }
    }),
  )

  return results.filter((f): f is string => f !== null)
}
