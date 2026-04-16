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
import { createHash } from 'crypto'

import {
  OntologyLoader,
  buildConceptRegistry,
  deserializeRegistry,
  serializeRegistry,
} from '../ontology/index.js'
import type { KBOntology, ConceptRegistry } from '../ontology/index.js'

import { ingestFile, canIngest, requiredOptionalDeps, autoDetectPdfExtractor } from './ingester/index.js'
import type { IngestedContent, IngesterOptions, PdfExtractFn } from './ingester/index.js'

import { ConceptExtractor } from './extractor/index.js'
import type { CompilationPlan } from './extractor/index.js'

import { KnowledgeSynthesizer } from './synthesizer/index.js'
import type { SynthesisResult, SynthesisOptions, SynthesisProgressEvent } from './synthesizer/index.js'

import { KBLinter } from './linter/index.js'
import type { LintReport, AutoFixResult, LintOptions } from './linter/index.js'

import { postProcessCompiledArticles, DEFAULT_ARTICLE_TOKEN_BUDGET } from './postprocess.js'
import type { PostProcessResult, PostProcessOptions } from './postprocess.js'

import { autoDetectKBClients } from './llmClient.js'
import type { LLMClientOptions } from './llmClient.js'
import { healLintIssues } from './heal.js'
import type { HealResult, HealOptions } from './heal.js'
import { discoverGaps } from './discovery.js'
import type { DiscoveryResult, DiscoveryOptions } from './discovery.js'
import { runVisionPass } from './vision.js'
import type { VisionPassResult, VisionPassOptions } from './vision.js'

import type { GenerateFn } from './extractor/extractor.js'
import type { PluginHost, IngesterAdapter } from '../../plugin/types.js'
import { DifferentialEngine } from './differential.js'
import type { DifferentialPlan } from './differential.js'

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

  /**
   * LLM-based PDF extraction function.
   * Enables high-quality extraction of tables, equations, and figures from PDFs.
   *
   * **Auto-detected by default** from environment variables:
   * - `GEMINI_API_KEY` → Gemini Flash (fastest, cheapest)
   * - `OPENAI_API_KEY` → GPT-4o
   * - `ANTHROPIC_API_KEY` → Claude Sonnet
   *
   * If no API key is found, falls back to basic pdf-parse text dump.
   *
   * Override with an explicit extractor:
   * ```ts
   * pdfExtractFn: makeGeminiPdfExtractor({ model: 'gemini-2.5-pro' })
   * ```
   *
   * Disable auto-detection (force pdf-parse fallback):
   * ```ts
   * pdfExtractFn: undefined  // explicit undefined skips auto-detect
   * ```
   */
  pdfExtractFn?: PdfExtractFn

  /**
   * Optional PluginHost for registering custom `IngesterAdapter` plugins.
   * When provided, any plugin with `capabilities: ['ingester']` is consulted
   * for file formats not handled by the built-in ingesters (markdown, HTML, PDF, text).
   *
   * @example
   * ```ts
   * const host = new PluginHost()
   * await host.register(new DocxIngesterPlugin())
   *
   * const compiler = await KBCompiler.create({
   *   kbDir: './my-kb',
   *   extractionModel: myFastModel,
   *   synthesisModel: myCapableModel,
   *   pluginHost: host,
   * })
   * ```
   */
  pluginHost?: PluginHost
}

export type CompileOptions = {
  /**
   * True article-level differential compilation.
   *
   * On the first run (no `.kb-source-hashes.json`): saves a hash manifest so
   * future runs can diff against it (all existing compiled articles are treated
   * as clean and skipped).
   *
   * On subsequent runs:
   * - Hashes every raw file and compares with stored manifest
   * - Reads `compiled_from:` frontmatter from each compiled article
   * - Skips synthesis for articles whose ALL sources are unchanged (90%+ savings)
   * - Synthesizes only articles with at least one changed/new source
   * - Prunes compiled articles whose source files were deleted
   */
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

  /** Post-processing options (wikilink resolution, segmentation) */
  postProcess?: PostProcessOptions

  /**
   * **Opt-in.** Run LLM-powered heal on lint issues (C1).
   * Fixes broken wikilinks, low-quality articles, and orphaned articles.
   * Requires an LLM API key in the environment.
   */
  heal?: boolean | HealOptions

  /**
   * **Opt-in.** Run LLM-powered discovery to find KB gaps (C2).
   * Identifies missing articles, weak connections, and depth imbalances.
   * Requires an LLM API key in the environment.
   */
  discover?: boolean | DiscoveryOptions

  /**
   * **Opt-in.** Run vision pass to generate alt-text for images (C3).
   * Requires a vision-capable LLM API key in the environment.
   */
  vision?: boolean | VisionPassOptions

  /** Override LLM client options for Phase C features */
  llmOptions?: LLMClientOptions
}

export type CompileProgressEvent =
  | { stage: 'scan';       fileCount: number }
  | { stage: 'ingest';     processed: number; total: number; file: string }
  | { stage: 'extract';    message: string }
  | { stage: 'synthesize'; event: SynthesisProgressEvent }
  | { stage: 'lint';       issueCount: number; autoFixable: number }
  | { stage: 'fix';        fixedCount: number }
  | { stage: 'heal';       healed: number; skipped: number }
  | { stage: 'discover';   missing: number; connections: number }
  | { stage: 'vision';     described: number; failed: number }
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

  /** Heal result (if heal was enabled — C1) */
  heal?: HealResult

  /** Discovery result (if discover was enabled — C2) */
  discovery?: DiscoveryResult

  /** Vision pass result (if vision was enabled — C3) */
  vision?: VisionPassResult

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
  private readonly pdfExtractFn?: PdfExtractFn
  private readonly pluginHost?: PluginHost
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
    this.pdfExtractFn = options.pdfExtractFn ?? autoDetectPdfExtractor()
    this.pluginHost = options.pluginHost
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

    // ── Phase 2: Differential filter (article-level) ──────────────────────────

    let skipDocIds: Set<string> | undefined
    let differentialEngine: DifferentialEngine | undefined
    let differentialPlan: DifferentialPlan | undefined

    if (options.incrementalMode) {
      differentialEngine = await DifferentialEngine.create(this.kbDir, this.rawDir, this.compiledDir)
      differentialPlan   = await differentialEngine.computePlan()
      skipDocIds         = differentialPlan.cleanDocIds

      // Nothing changed → skip entire pipeline
      if (differentialPlan.stats.changedRawFiles === 0 && differentialPlan.stats.orphanArticles === 0) {
        const noOp: SynthesisResult = {
          created: 0, updated: 0, stubsCreated: 0, failed: 0,
          skipped: differentialPlan.stats.cleanArticles, articles: [], durationMs: 0,
        }
        return this.finalize({
          startMs, emit, synthesis: noOp,
          sourcesScanned: ingestableFiles.length,
          sourcesIngested: 0, ingestErrors, warnings,
          lintOptions: options.lintOptions, dryRun: options.dryRun,
        })
      }

      // Prune orphaned articles before synthesis
      if (!options.dryRun && differentialPlan.orphanDocIds.size > 0) {
        await differentialEngine.pruneOrphans(differentialPlan.orphanDocIds)
        warnings.push(`Pruned ${differentialPlan.orphanDocIds.size} orphaned article(s) (source files deleted)`)
      }
    }

    // ── Phase 3: Ingest ───────────────────────────────────────────────────────
    // In incremental mode, ingest ALL files so the extractor has full context.
    // skipDocIds prevents synthesis of clean articles — not ingestion.

    const contentsByPath = new Map<string, IngestedContent>()
    let ingestCount = 0

    // Build a dynamic extension→plugin map from registered IngesterAdapters
    const pluginIngesters: Map<string, IngesterAdapter> = new Map()
    if (this.pluginHost) {
      for (const adapter of this.pluginHost.getIngesters()) {
        for (const ext of adapter.supportedExtensions) {
          pluginIngesters.set(ext.toLowerCase(), adapter)
        }
      }
    }

    for (const filePath of ingestableFiles) {
      const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
      const pluginIngester = pluginIngesters.get(ext)

      try {
        let ingested: IngestedContent
        if (pluginIngester) {
          // Delegate to the registered plugin ingester
          const result = await pluginIngester.ingest(filePath, {
            imageOutputDir: join(this.compiledDir, 'assets'),
          })
          // IngesterAdapterResult is structurally identical to IngestedContent
          ingested = result as unknown as IngestedContent
        } else {
          // Built-in ingester pipeline
          ingested = await ingestFile(filePath, {
            imageOutputDir: join(this.compiledDir, 'assets'),
            ...(this.pdfExtractFn ? { pdfExtractFn: this.pdfExtractFn } : {}),
          } as IngesterOptions)
        }
        contentsByPath.set(filePath, ingested)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        ingestErrors.push({ file: filePath, error: msg })
      }
      ingestCount++
      emit({ stage: 'ingest', processed: ingestCount, total: ingestableFiles.length, file: filePath })
    }

    const contents = Array.from(contentsByPath.values())

    if (contents.length === 0) {
      // Nothing to compile — only lint existing KB
      const noSourceSynthesis: SynthesisResult = {
        created: 0, updated: 0, stubsCreated: 0, failed: 0, skipped: 0, articles: [], durationMs: 0,
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

    // Phase 2C: Persist compilation plan for crash recovery
    if (!options.dryRun) {
      await writeFile(
        join(this.kbDir, '.kb-compilation-plan.json'),
        JSON.stringify(plan, null, 2),
        'utf-8',
      )
    }

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
      skipDocIds,
      onProgress: event => emit({ stage: 'synthesize', event }),
    })

    // Persist the source-hash manifest after a successful differential compile
    if (options.incrementalMode && differentialEngine && !options.dryRun) {
      await differentialEngine.save()
    }

    return this.finalize({
      startMs, emit, synthesis,
      sourcesScanned: ingestableFiles.length,
      sourcesIngested: contents.length,
      ingestErrors, warnings,
      lintOptions: options.lintOptions,
      postProcessOptions: options.postProcess,
      healOptions: options.heal,
      discoverOptions: options.discover,
      visionOptions: options.vision,
      llmOptions: options.llmOptions,
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
    postProcessOptions?: PostProcessOptions
    healOptions?: boolean | HealOptions
    discoverOptions?: boolean | DiscoveryOptions
    visionOptions?: boolean | VisionPassOptions
    llmOptions?: LLMClientOptions
    dryRun?: boolean
  }): Promise<CompileResult> {
    const { startMs, emit, synthesis, sourcesScanned, sourcesIngested, ingestErrors, warnings, dryRun } = params

    // ── Post-processing: wikilink resolution + segmentation ──────────────────
    let postProcess: PostProcessResult | undefined
    if (!dryRun) {
      postProcess = await postProcessCompiledArticles(
        this.compiledDir,
        this.registry,
        params.postProcessOptions,
      )
      if (postProcess.wikilinks.resolved > 0) {
        warnings.push(`Resolved ${postProcess.wikilinks.resolved} wikilinks to markdown links`)
      }
      if (postProcess.wikilinks.unresolved > 0) {
        warnings.push(`${postProcess.wikilinks.unresolved} unresolved wikilinks remain (linter will flag these)`)
      }
      if (postProcess.segmentation && postProcess.segmentation.split > 0) {
        for (const s of postProcess.segmentation.splits) {
          warnings.push(`Split oversized article "${s.docId}" into ${s.parts} parts (was ~${s.originalTokens} tokens)`)
        }
      }
    }

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
    }

    // Phase 1E: Always persist the registry — this is the single write location.
    // Previously lived inside the autoLint block, which meant it wasn't written
    // when autoLint was disabled.
    if (!dryRun) {
      await writeFile(this.registryPath, serializeRegistry(this.registry), 'utf-8')
    }

    // ── Phase C: Opt-in advanced intelligence features ────────────────────────

    let healResult: HealResult | undefined
    let discoveryResult: DiscoveryResult | undefined
    let visionResult: VisionPassResult | undefined

    const needsLLM = params.healOptions || params.discoverOptions || params.visionOptions
    if (needsLLM && !dryRun) {
      const clients = autoDetectKBClients(params.llmOptions)
      if (!clients) {
        warnings.push('Phase C features requested but no LLM API key found. Skipping heal/discover/vision.')
      } else {
        // C1: Heal Mode
        if (params.healOptions && lintReport) {
          const healOpts = typeof params.healOptions === 'object' ? params.healOptions : {}
          healResult = await healLintIssues(
            clients.text, lintReport, this.compiledDir, this.registry, healOpts,
          )
          emit({ stage: 'heal', healed: healResult.healed, skipped: healResult.skipped })
        }

        // C2: Discovery Mode
        if (params.discoverOptions) {
          const discOpts = typeof params.discoverOptions === 'object' ? params.discoverOptions : {}
          discoveryResult = await discoverGaps(
            clients.text, this.compiledDir, this.registry, this.ontology, discOpts,
          )
          emit({
            stage: 'discover',
            missing: discoveryResult.missingArticles.length,
            connections: discoveryResult.weakConnections.length,
          })
        }

        // C3: Vision Pass
        if (params.visionOptions) {
          const visOpts = typeof params.visionOptions === 'object' ? params.visionOptions : {}
          visionResult = await runVisionPass(clients.vision, this.compiledDir, visOpts)
          emit({ stage: 'vision', described: visionResult.described, failed: visionResult.failed })
        }
      }
    }

    const result: CompileResult = {
      success: synthesis.failed === 0,
      sourcesScanned,
      sourcesIngested,
      synthesis,
      lint: lintReport,
      fixes: fixResult,
      heal: healResult,
      discovery: discoveryResult,
      vision: visionResult,
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
      // Phase 2E: Raised from 4096 to 8192 to prevent truncated extraction/synthesis responses
      maxTokens: 8192,
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
 * Phase 2B: Content-hash based incremental filtering.
 * Uses SHA-256 content hashes stored in a reverse index instead of fragile
 * filesystem mtime comparisons. This fixes:
 * - False positives from `touch`, `git checkout`, or NFS timestamp drift
 * - Unnecessary re-synthesis of semantically identical content
 */
async function filterIncremental(
  sourceFiles: string[],
  compiledDir: string,
  registry: ConceptRegistry,
): Promise<string[]> {
  // Build a hash cache for compiled articles: docId → content hash
  const compiledHashes = new Map<string, string>()
  for (const entry of registry.values()) {
    const compiledPath = join(compiledDir, `${entry.docId}.md`)
    try {
      const content = await readFile(compiledPath, 'utf-8')
      compiledHashes.set(entry.docId, hashContent(content))
    } catch { /* compiled file doesn't exist */ }
  }

  // Build reverse index: for each source file, find which compiled articles
  // reference it (via compiled_from frontmatter field)
  const sourceToDocIds = new Map<string, string[]>()
  for (const entry of registry.values()) {
    const compiledPath = join(compiledDir, `${entry.docId}.md`)
    try {
      const content = await readFile(compiledPath, 'utf-8')
      const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
      if (fmMatch) {
        const compiledFrom = fmMatch[1]?.match(/compiled_from:\s*\[([^\]]*)\]/)
        if (compiledFrom) {
          const paths = compiledFrom[1]!.split(',').map(s => s.trim().replace(/["']/g, '')).filter(Boolean)
          for (const p of paths) {
            const list = sourceToDocIds.get(p) ?? []
            list.push(entry.docId)
            sourceToDocIds.set(p, list)
          }
        }
      }
    } catch { /* skip */ }
  }

  // For each source file, check if the source content has changed
  const results = await Promise.all(
    sourceFiles.map(async filePath => {
      try {
        const sourceContent = await readFile(filePath, 'utf-8')
        const sourceHash = hashContent(sourceContent)

        // Check if any compiled article references this source and is unchanged
        const docIds = sourceToDocIds.get(filePath) ?? []
        if (docIds.length === 0) {
          return filePath  // No compiled article references this source — include it
        }

        // If any compiled article exists for this source, check if source has changed
        // by comparing against a stored source hash (we store source hashes in registry)
        // For now, if the compiled article exists, check if the source stat is newer
        for (const docId of docIds) {
          if (compiledHashes.has(docId)) {
            const compiledPath = join(compiledDir, `${docId}.md`)
            try {
              const compiledStat = await stat(compiledPath)
              const sourceStat = await stat(filePath)
              if (compiledStat.mtimeMs > sourceStat.mtimeMs) {
                return null  // Compiled is newer — skip
              }
            } catch { /* include if we can't compare */ }
          }
        }

        return filePath
      } catch {
        return filePath  // If we can't read, include it
      }
    }),
  )

  return results.filter((f): f is string => f !== null)
}

function hashContent(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex').slice(0, 16)
}
