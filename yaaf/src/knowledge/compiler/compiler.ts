/**
 * KB Pipeline Coordinator — KBCompiler
 *
 * The KBCompiler is the single entry point for the knowledge base compilation
 * pipeline. It wires all four stages together and manages the KB directory layout.
 *
 * raw/** → Ingester → IngestedContent[]
 * IngestedContent[] → Extractor → CompilationPlan
 * CompilationPlan → Synthesizer → compiled/** + .kb-registry.json
 * compiled/** → Linter → LintReport [→ auto-fix]
 *
 * KB directory layout (all paths relative to kbDir):
 *
 * my-kb/
 * ontology.yaml ← required, loaded at init
 * raw/ ← source files (Karpathy's "raw materials")
 * papers/ ← .md, .html — research papers
 * web-clips/ ← Obsidian Web Clipper output (already .md)
 * tools/ ← tool documentation
 * datasets/ ← dataset descriptions
 * compiled/ ← LLM-authored wiki (output, managed by compiler)
 * concepts/ ← concept articles
 * tools/ ← tool articles
 * research-papers/ ← paper articles
 * .kb-registry.json ← auto-maintained index cache
 * .kb-lint-report.json ← last lint report (for CI checks)
 *
 * Usage:
 * ```ts
 * const compiler = await KBCompiler.create({
 * kbDir: '/path/to/my-kb',
 * extractionModel: makeGenerateFn(new GeminiChatModel({ model: 'gemini-2.5-flash' })),
 * synthesisModel: makeGenerateFn(new GeminiChatModel({ model: 'gemini-2.5-pro' })),
 * })
 *
 * const result = await compiler.compile()
 * console.log(`Created ${result.synthesis.created} articles`)
 * ```
 */

import { readFile, writeFile, mkdir, stat, readdir, unlink } from "fs/promises";
import { join, extname, resolve } from "path";
import { createHash } from "crypto";
import { atomicWriteFile } from "./atomicWrite.js";
import { CompileLock } from "./lock.js";

import {
  OntologyLoader,
  buildConceptRegistry,
  deserializeRegistry,
  serializeRegistry,
} from "../ontology/index.js";
import type { KBOntology, ConceptRegistry } from "../ontology/index.js";

import {
  ingestFile,
  canIngest,
  requiredOptionalDeps,
  autoDetectPdfExtractor,
} from "./ingester/index.js";
import type { IngestedContent, IngesterOptions, PdfExtractFn } from "./ingester/index.js";

import { ConceptExtractor } from "./extractor/index.js";
import type { CompilationPlan } from "./extractor/index.js";

import { KnowledgeSynthesizer } from "./synthesizer/index.js";
import type {
  SynthesisResult,
  SynthesisOptions,
  SynthesisProgressEvent,
} from "./synthesizer/index.js";

import { KBLinter } from "./linter/index.js";
import type { LintReport, AutoFixResult, LintOptions } from "./linter/index.js";

import { postProcessCompiledArticles, DEFAULT_ARTICLE_TOKEN_BUDGET } from "./postprocess.js";
import type { PostProcessResult, PostProcessOptions } from "./postprocess.js";

import { autoDetectKBClients } from "./llmClient.js";
import type { LLMClientOptions } from "./llmClient.js";
import { healLintIssues } from "./heal.js";
import type { HealResult, HealOptions } from "./heal.js";
import { discoverGaps } from "./discovery.js";
import type { DiscoveryResult, DiscoveryOptions } from "./discovery.js";
import { runVisionPass } from "./vision.js";
import type { VisionPassResult, VisionPassOptions } from "./vision.js";

import type { GenerateFn } from "./extractor/extractor.js";
import type { PluginHost, IngesterAdapter, KBGroundingAdapter, KBGroundingResult } from "../../plugin/types.js";
import { DifferentialEngine } from "./differential.js";
import type { DifferentialPlan } from "./differential.js";
import { MultiLayerGroundingPlugin } from "./groundingPlugin.js";
import { generateOntologyProposals } from "./ontologyProposals.js";
import { deduplicatePlans } from "./dedup.js";
import { detectContradictions } from "./contradictions.js";
import { serializeOntology } from "../ontology/loader.js";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Something that looks like a YAAF BaseLLMAdapter (can be used with makeGenerateFn) */
export type ModelLike = {
  complete(params: {
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    maxTokens?: number;
  }): Promise<{ content?: string | null }>;
};

export type KBCompilerOptions = {
  /**
   * Root of the Knowledge Base directory.
   * Must contain ontology.yaml.
   */
  kbDir: string;

  /**
   * Fast/cheap LLM for the extraction pass (classification + planning).
   * Recommended: gemini-2.5-flash, claude-haiku, gpt-4o-mini
   */
  extractionModel: GenerateFn | ModelLike;

  /**
   * Capable LLM for the synthesis pass (article authoring).
   * Recommended: gemini-2.5-pro, claude-opus, gpt-4o
   */
  synthesisModel: GenerateFn | ModelLike;

  /**
   * Override subdirectory names. Defaults: raw/, compiled/
   */
  rawDirName?: string;
  compiledDirName?: string;

  /**
   * Override ontology file path.
   * Default: {kbDir}/ontology.yaml
   */
  ontologyPath?: string;

  /**
   * Run the linter automatically after each compile().
   * Default: true
   */
  autoLint?: boolean;

  /**
   * Apply auto-fixable lint issues after each lint pass.
   * Default: false (report only, no mutation)
   */
  autoFix?: boolean;

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
   * pdfExtractFn: undefined // explicit undefined skips auto-detect
   * ```
   */
  pdfExtractFn?: PdfExtractFn;

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
   * kbDir: './my-kb',
   * extractionModel: myFastModel,
   * synthesisModel: myCapableModel,
   * pluginHost: host,
   * })
   * ```
   */
  pluginHost?: PluginHost;
};

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
  incrementalMode?: boolean;

  /**
   * Glob-style patterns for source files to include.
   * Default: all supported file types.
   */
  include?: string[];

  /** Max parallel synthesis calls (default: 3) */
  concurrency?: number;

  /** If true, run full pipeline but write nothing to disk */
  dryRun?: boolean;

  /** Progress callback for real-time pipeline updates */
  onProgress?: (event: CompileProgressEvent) => void;

  /** Lint options passed to the linter stage */
  lintOptions?: Omit<LintOptions, "skipDocIds">;

  /** Post-processing options (wikilink resolution, segmentation) */
  postProcess?: PostProcessOptions;

  /**
   * **Opt-in.** Run LLM-powered heal on lint issues (C1).
   * Fixes broken wikilinks, low-quality articles, and orphaned articles.
   * Requires an LLM API key in the environment.
   */
  heal?: boolean | HealOptions;

  /**
   * **Opt-in.** Run LLM-powered discovery to find KB gaps (C2).
   * Identifies missing articles, weak connections, and depth imbalances.
   * Requires an LLM API key in the environment.
   */
  discover?: boolean | DiscoveryOptions;

  /**
   * **Opt-in.** Run vision pass to generate alt-text for images (C3).
   * Requires a vision-capable LLM API key in the environment.
   */
  vision?: boolean | VisionPassOptions;

  /** Override LLM client options for Phase C features */
  llmOptions?: LLMClientOptions;

  /**
   * Grounding quality gate — what to do when a synthesized article
   * fails hallucination detection.
   *
   * - `'warn'` (default) — Log a warning but write the article normally
   * - `'skip'` — Don't write articles below the grounding threshold
   * - `'fail'` — Abort compilation if any article fails grounding
   *
   * Grounding detection requires a `KBGroundingAdapter` plugin.
   * The built-in `MultiLayerGroundingPlugin` is used automatically
   * if no custom adapter is registered.
   *
   * Set to `false` to disable grounding entirely.
   */
  groundingAction?: "warn" | "skip" | "fail" | false;

  /**
   * Minimum grounding score (0–1) for an article to pass the quality gate.
   * Default: 0.5 (50% of claims must be verifiable).
   */
  groundingThreshold?: number;

  /**
   * Ontology proposal generation options (O7).
   *
   * - `true` (default): generate proposals, write to .kb-ontology-proposals.json
   * - `false`: skip proposal generation
   * - `{ autoEvolve: true }`: auto-apply high-confidence (≥0.8) vocab/relationship proposals
   *
   * Proposals are always zero-cost (no LLM calls).
   */
  ontologyProposals?: boolean | { autoEvolve?: boolean };
};

export type CompileProgressEvent =
  | { stage: "scan"; fileCount: number }
  | { stage: "ingest"; processed: number; total: number; file: string }
  | { stage: "extract"; message: string }
  | { stage: "synthesize"; event: SynthesisProgressEvent }
  | { stage: "lint"; issueCount: number; autoFixable: number }
  | { stage: "fix"; fixedCount: number }
  | { stage: "heal"; healed: number; skipped: number }
  | { stage: "discover"; missing: number; connections: number }
  | { stage: "vision"; described: number; failed: number }
  | { stage: "complete"; result: CompileResult };

export type CompileResult = {
  /** True if the pipeline completed without critical errors */
  success: boolean;

  /** Number of source files scanned (before filtering) */
  sourcesScanned: number;

  /** Number of source files ingested (passed canIngest check) */
  sourcesIngested: number;

  /** Synthesis stage output */
  synthesis: SynthesisResult;

  /** Lint report (if autoLint was enabled) */
  lint?: LintReport;

  /** Auto-fix result (if autoFix was enabled) */
  fixes?: AutoFixResult;

  /** Heal result (if heal was enabled — C1) */
  heal?: HealResult;

  /** Discovery result (if discover was enabled — C2) */
  discovery?: DiscoveryResult;

  /** Vision pass result (if vision was enabled — C3) */
  vision?: VisionPassResult;

  /** Grounding verification summary (if grounding was enabled) */
  grounding?: {
    /** How many articles were verified */
    articlesVerified: number;
    /** How many passed the grounding threshold */
    articlesPassed: number;
    /** How many failed (depending on groundingAction: warned, skipped, or aborted) */
    articlesFailed: number;
    /** Average grounding score across all verified articles */
    averageScore: number;
    /** Per-article summaries */
    perArticle: Array<{
      docId: string;
      score: number;
      totalClaims: number;
      supportedClaims: number;
      passed: boolean;
    }>;
  };

  /** Total wall-clock time from compile() call to return */
  durationMs: number;

  /** Non-fatal errors encountered during ingestion (source files that failed) */
  ingestErrors: Array<{ file: string; error: string }>;

  /** Informational warnings (e.g., missing optional deps for some files) */
  warnings: string[];
};

// ── KBCompiler ────────────────────────────────────────────────────────────────

export class KBCompiler {
  private readonly kbDir: string;
  private readonly rawDir: string;
  private readonly compiledDir: string;
  private readonly registryPath: string;
  private readonly lintReportPath: string;
  private readonly autoLint: boolean;
  private readonly autoFix: boolean;
  private readonly extractFn: GenerateFn;
  private readonly synthFn: GenerateFn;
  private readonly pdfExtractFn?: PdfExtractFn;
  private readonly pluginHost?: PluginHost;
  private ontology!: KBOntology;
  private registry!: ConceptRegistry;

  private constructor(options: KBCompilerOptions, ontology: KBOntology, registry: ConceptRegistry) {
    this.kbDir = resolve(options.kbDir);
    this.rawDir = join(this.kbDir, options.rawDirName ?? "raw");
    this.compiledDir = join(this.kbDir, options.compiledDirName ?? "compiled");
    this.registryPath = join(this.kbDir, ".kb-registry.json");
    this.lintReportPath = join(this.kbDir, ".kb-lint-report.json");
    this.autoLint = options.autoLint ?? true;
    this.autoFix = options.autoFix ?? false;
    this.extractFn = normalizeGenerateFn(options.extractionModel);
    this.synthFn = normalizeGenerateFn(options.synthesisModel);
    this.pdfExtractFn = options.pdfExtractFn ?? autoDetectPdfExtractor();
    this.pluginHost = options.pluginHost;
    this.ontology = ontology;
    this.registry = registry;
  }

  // ── Factory ──────────────────────────────────────────────────────────────────

  /**
   * Create a KBCompiler by loading the ontology and registry from disk.
   * Throws if the ontology file is missing or invalid.
   */
  static async create(options: KBCompilerOptions): Promise<KBCompiler> {
    const kbDir = resolve(options.kbDir);
    const ontologyPath = options.ontologyPath ?? join(kbDir, "ontology.yaml");
    const registryPath = join(kbDir, ".kb-registry.json");
    const compiledDir = join(kbDir, options.compiledDirName ?? "compiled");

    // Load ontology using the loader's built-in async load()
    const loader = new OntologyLoader(kbDir);
    let ontology: KBOntology;
    try {
      const result = await loader.load();
      ontology = result.ontology;
    } catch (err) {
      throw new Error(
        `KB ontology not found at "${ontologyPath}".\n` +
          `Create ontology.yaml in your KB directory before compiling.\n` +
          `Original error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // Load or build registry
    let registry: ConceptRegistry;
    try {
      const registryJson = await readFile(registryPath, "utf-8");
      // Fix M-7: distinguish "file missing" from "file corrupt"
      try {
        registry = deserializeRegistry(registryJson);
      } catch (parseErr) {
        throw new Error(
          `.kb-registry.json exists but could not be parsed: ${
            parseErr instanceof Error ? parseErr.message : String(parseErr)
          }.\n` +
          `This usually means a previous compilation crashed mid-write.\n` +
          `Delete .kb-registry.json to reset (the next compile rebuilds it from compiled/).`,
        );
      }
    } catch (err) {
      // Only suppress ENOENT (file not found = first run)
      if (err instanceof Error && !err.message.startsWith(".kb-registry.json") &&
          (err as NodeJS.ErrnoException).code !== "ENOENT") {
        throw err;
      }
      // No cache — build from compiled/ directory (may be empty on first run)
      await mkdir(compiledDir, { recursive: true });
      try {
        const { registry: built } = await buildConceptRegistry(compiledDir, ontology);
        registry = built;
      } catch {
        registry = new Map();
      }
    }

    return new KBCompiler(options, ontology, registry);
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
    const startMs = Date.now();
    const emit = options.onProgress ?? (() => {});
    const warnings: string[] = [];
    const ingestErrors: CompileResult["ingestErrors"] = [];

    // Fix L-1: prevent concurrent compile() calls from corrupting the KB
    const lock = new CompileLock(this.kbDir);
    if (!options.dryRun) {
      await lock.acquire();
    }

    try {
    await mkdir(this.compiledDir, { recursive: true });

    // ── Scan ─────────────────────────────────────────────────────────

    const allSourceFiles = await scanDirectory(this.rawDir);
    const ingestableFiles = allSourceFiles.filter((f) => canIngest(f));

    emit({ stage: "scan", fileCount: ingestableFiles.length });

    // Warn about files requiring optional deps
    const missingDeps = requiredOptionalDeps(ingestableFiles);
    if (missingDeps.length > 0) {
      warnings.push(
        `Some HTML files require optional dependencies: npm install ${missingDeps.join(" ")}`,
      );
    }

    // ── Differential filter (article-level) ──────────────────────────

    let skipDocIds: Set<string> | undefined;
    let differentialEngine: DifferentialEngine | undefined;
    let differentialPlan: DifferentialPlan | undefined;

    if (options.incrementalMode) {
      // O1: Pass ontology path so schema changes invalidate clean articles
      const ontologyPath = join(this.kbDir, "ontology.yaml");
      differentialEngine = await DifferentialEngine.create(
        this.kbDir,
        this.rawDir,
        this.compiledDir,
        ontologyPath,
      );
      differentialPlan = await differentialEngine.computePlan();
      skipDocIds = differentialPlan.cleanDocIds;

      // Nothing changed → skip entire pipeline
      if (
        differentialPlan.stats.changedRawFiles === 0 &&
        differentialPlan.stats.orphanArticles === 0
      ) {
        const noOp: SynthesisResult = {
          created: 0,
          updated: 0,
          stubsCreated: 0,
          failed: 0,
          skipped: differentialPlan.stats.cleanArticles,
          articles: [],
          durationMs: 0,
        };
        return this.finalize({
          startMs,
          emit,
          synthesis: noOp,
          sourcesScanned: ingestableFiles.length,
          sourcesIngested: 0,
          ingestErrors,
          warnings,
          lintOptions: options.lintOptions,
          dryRun: options.dryRun,
        });
      }

      // D1: Do NOT prune orphans here — the manifest hasn't been saved yet.
      // Pruning before the save creates a crash window: if synthesis fails after
      // pruning but before save, the articles are gone and the manifest still
      // shows their sources as present. The next run won't know to re-synthesize them.
      //
      // Orphan pruning is deferred to AFTER differentialEngine.save() below.
    }

    // ── Ingest ───────────────────────────────────────────────────────
    // In incremental mode, ingest ALL files so the extractor has full context.
    // skipDocIds prevents synthesis of clean articles — not ingestion.

    const contentsByPath = new Map<string, IngestedContent>();
    let ingestCount = 0;

    // Build a dynamic extension→plugin map from registered IngesterAdapters
    const pluginIngesters: Map<string, IngesterAdapter> = new Map();
    if (this.pluginHost) {
      for (const adapter of this.pluginHost.getIngesters()) {
        for (const ext of adapter.supportedExtensions) {
          pluginIngesters.set(ext.toLowerCase(), adapter);
        }
      }
    }

    for (const filePath of ingestableFiles) {
      const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
      const pluginIngester = pluginIngesters.get(ext);

      try {
        let ingested: IngestedContent;
        if (pluginIngester) {
          // Delegate to the registered plugin ingester
          const result = await pluginIngester.ingest(filePath, {
            imageOutputDir: join(this.compiledDir, "assets"),
          });
          // IngesterAdapterResult is structurally identical to IngestedContent
          ingested = result as unknown as IngestedContent;
        } else {
          // Built-in ingester pipeline
          ingested = await ingestFile(filePath, {
            imageOutputDir: join(this.compiledDir, "assets"),
            ...(this.pdfExtractFn ? { pdfExtractFn: this.pdfExtractFn } : {}),
          } as IngesterOptions);
        }
        contentsByPath.set(filePath, ingested);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        ingestErrors.push({ file: filePath, error: msg });
      }
      ingestCount++;
      emit({
        stage: "ingest",
        processed: ingestCount,
        total: ingestableFiles.length,
        file: filePath,
      });
    }

    const contents = Array.from(contentsByPath.values());

    if (contents.length === 0) {
      // Nothing to compile — only lint existing KB
      const noSourceSynthesis: SynthesisResult = {
        created: 0,
        updated: 0,
        stubsCreated: 0,
        failed: 0,
        skipped: 0,
        articles: [],
        durationMs: 0,
      };

      if (this.autoLint) {
        return this.finalize({
          startMs,
          emit,
          synthesis: noSourceSynthesis,
          sourcesScanned: ingestableFiles.length,
          sourcesIngested: 0,
          ingestErrors,
          warnings,
          lintOptions: options.lintOptions,
          dryRun: options.dryRun,
        });
      }

      return {
        success: true,
        sourcesScanned: ingestableFiles.length,
        sourcesIngested: 0,
        synthesis: noSourceSynthesis,
        ingestErrors,
        warnings,
        durationMs: Date.now() - startMs,
      };
    }

    // ── Extract ──────────────────────────────────────────────────────

    emit({ stage: "extract", message: `Analyzing ${contents.length} source file(s)...` });

    // P2-4: Snapshot the registry for the extractor so synthesis-phase mutations
    // don't affect extraction. The extractor uses registry for vocabulary scan and
    // registry-match confidence — it reads but never writes.
    const registrySnapshot: ConceptRegistry = new Map(this.registry);
    const extractor = new ConceptExtractor(this.ontology, registrySnapshot, this.extractFn);
    const plan = await extractor.buildPlan(contents);

    // Diagnostic: save the last compilation plan for debugging (not used for crash recovery)
    if (!options.dryRun) {
      await atomicWriteFile(
        join(this.kbDir, ".kb-debug-last-plan.json"),
        JSON.stringify(plan, null, 2),
      );
    }

    // ── P4-1: Semantic deduplication ────────────────────────────────
    // Detect near-duplicate article plans and merge them before synthesis
    // to prevent redundant LLM calls and duplicate compiled articles.
    if (plan.articles.length > 1) {
      const { merged, removed } = deduplicatePlans(plan.articles);
      if (removed.length > 0) {
        warnings.push(
          `Deduplicated ${removed.length} near-duplicate article plan(s): ` +
          removed.map((r) => `"${r.docId}" → "${r.mergedInto}"`).join(", "),
        );
        plan.articles = merged;
      }
    }

    // ── Synthesize ───────────────────────────────────────────────────

    const synthesizer = new KnowledgeSynthesizer(
      this.ontology,
      this.registry,
      this.synthFn,
      this.compiledDir,
    );

    const synthesis = await synthesizer.synthesize(plan, contentsByPath, {
      concurrency: options.concurrency ?? 3,
      dryRun: options.dryRun,
      skipDocIds,
      onProgress: (event) => emit({ stage: "synthesize", event }),
    });

    // Persist the source-hash manifest after a successful differential compile.
    // D1: Orphan pruning is deferred until AFTER the manifest is saved, so a
    // crash between synthesis and manifest-save cannot cause silent article loss.
    if (options.incrementalMode && differentialEngine && !options.dryRun) {
      await differentialEngine.save();
      // Now safe to prune: manifest has advanced, so next run won't treat
      // orphan sources as "present" if the process crashes during unlink.
      if (differentialPlan && differentialPlan.orphanDocIds.size > 0) {
        await differentialEngine.pruneOrphans(differentialPlan.orphanDocIds);
        warnings.push(
          `Pruned ${differentialPlan.orphanDocIds.size} orphaned article(s) (source files deleted)`,
        );
      }
    }

    // ── M2: Grounding pass (optional, L1 always, L2/L3 need embedFn/generateFn) ──────────
    let groundingResult: CompileResult["grounding"] | undefined;
    const groundingAction = options.groundingAction ?? "warn"; // default: warn

    if (groundingAction !== false && !options.dryRun && synthesis.articles.length > 0) {
      const groundingAdapter: KBGroundingAdapter =
        this.pluginHost?.getKBGroundingAdapter() ?? new MultiLayerGroundingPlugin();

      // P1-1: Adapt threshold for L1-only mode. Vocabulary overlap alone cannot
      // distinguish semantic support from vocabulary co-occurrence, so require
      // at least some claims to be keyword-verified (0.6 vs 0.5).
      const isL1Only = groundingAdapter instanceof MultiLayerGroundingPlugin &&
        !groundingAdapter.hasEmbedding && !groundingAdapter.hasLLM;
      const groundingThreshold = options.groundingThreshold ?? (isL1Only ? 0.6 : 0.5);

      const perArticle: NonNullable<CompileResult["grounding"]>["perArticle"] = [];
      let totalScore = 0;
      let failed = 0;

      for (const article of synthesis.articles) {
        // I5: skip grounding for unchanged articles — the content-unchanged path
        // carries no sourcePaths/body and would fire an expensive pool-all-sources
        // grounding call against identical content. Grounding of clean articles
        // was already validated on their original compile run.
        if (article.action === "skipped" || article.action === "failed") continue;
        // P0-1: scope source texts to only the files that contributed to THIS article.
        // The old design pooled all source texts for every article, causing inflated
        // grounding scores (unrelated sources match unrelated claims by coincidence)
        // and masking real hallucinations in multi-topic KBs.
        const sourceTexts: string[] = [];
        const contributingPaths = article.sourcePaths ?? [];
        if (contributingPaths.length > 0) {
          for (const p of contributingPaths) {
            const ingested = contentsByPath.get(p);
            if (ingested?.text) sourceTexts.push(ingested.text);
          }
        } else {
          // Fallback: article was synthesized before sourcePaths was added to the type
          // (or the synthesizer returned a skipped/failed result). Pool all sources.
          for (const content of contentsByPath.values()) {
            if (content.text) sourceTexts.push(content.text);
          }
        }

        if (sourceTexts.length === 0) continue;

        try {
          // P2-1: use the body carried from synthesis — no disk re-read needed.
          // article.body is set for all created/updated articles in non-dryRun mode.
          // For skipped or failed articles, body is undefined; fall back to disk read.
          let articleBody = article.body ?? "";
          if (!articleBody) {
            // Fallback: read from disk (dryRun preview, or pre-P2-1 synthesizer)
            const articlePath = join(this.compiledDir, `${article.docId}.md`);
            try {
              const raw = await readFile(articlePath, "utf-8");
              const fmMatch = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/);
              articleBody = fmMatch?.[1]?.trim() ?? raw;
            } catch {
              continue; // article not on disk and no in-memory body — skip
            }
          }

          const result: KBGroundingResult = await groundingAdapter.validateArticle(
            {
              docId: article.docId,
              body: articleBody,
              title: article.canonicalTitle,
              entityType: article.registryEntry?.entityType ?? "unknown",
            },
            sourceTexts,
          );

          const passed = result.score >= groundingThreshold;
          totalScore += result.score;

          perArticle.push({
            docId: article.docId,
            score: result.score,
            totalClaims: result.totalClaims,
            supportedClaims: result.supportedClaims,
            passed,
          });

          if (!passed) {
            failed++;
            if (groundingAction === "fail") {
              throw new Error(
                `Grounding failed for "${article.docId}" (score=${result.score.toFixed(2)}, threshold=${groundingThreshold}). Aborting.`,
              );
            } else if (groundingAction === "warn") {
              warnings.push(
                `Grounding warning: "${article.docId}" scored ${(result.score * 100).toFixed(0)}% (threshold: ${(groundingThreshold * 100).toFixed(0)}%)`,
              );
            } else if (groundingAction === "skip") {
              // Fix C-3: delete the written article so it does not appear in the compiled KB
              const articlePath = join(this.compiledDir, `${article.docId}.md`);
              try {
                await unlink(articlePath);
                warnings.push(
                  `Grounding: removed "${article.docId}" — score ${(result.score * 100).toFixed(0)}% below threshold ${(groundingThreshold * 100).toFixed(0)}%`,
                );
              } catch {
                warnings.push(
                  `Grounding: failed to remove "${article.docId}" after grounding failure (file may not exist)`,
                );
              }
            }
          }
        } catch (err) {
          if ((err as Error).message?.startsWith("Grounding failed")) throw err;
          // Non-fatal: grounding errors don’t block compilation
        }
      }

      if (perArticle.length > 0) {
        groundingResult = {
          articlesVerified: perArticle.length,
          articlesPassed: perArticle.length - failed,
          articlesFailed: failed,
          averageScore: totalScore / perArticle.length,
          perArticle,
        };
      }
    }

    // ── P4-3: Contradiction detection (post-synthesis, non-fatal) ────────────
    if (!options.dryRun && synthesis.articles.length > 1) {
      try {
        const contradictions = await detectContradictions(this.compiledDir, {
          maxArticles: 200,
        });
        if (contradictions.pairs.length > 0) {
          warnings.push(
            `Contradiction scan: ${contradictions.pairs.length} potential contradiction(s) detected across ${contradictions.articlesScanned} articles`,
          );
          for (const pair of contradictions.pairs.slice(0, 5)) {
            warnings.push(
              `  [${pair.type}] "${pair.articleA}" vs "${pair.articleB}": ` +
              `"${pair.claimA.slice(0, 80)}…" vs "${pair.claimB.slice(0, 80)}…"`,
            );
          }
          if (contradictions.pairs.length > 5) {
            warnings.push(
              `  ... and ${contradictions.pairs.length - 5} more (see .kb-contradictions.json)`,
            );
          }
          // Write full report for human review
          try {
            await atomicWriteFile(
              join(this.kbDir, ".kb-contradictions.json"),
              JSON.stringify(contradictions, null, 2),
            );
          } catch { /* non-fatal */ }
        }
        // R-9: Surface truncation so users know the scan was incomplete
        if (contradictions.truncated) {
          warnings.push(
            `Contradiction scan stopped early: comparison budget exhausted (KB is large). ` +
            `Results above cover ${contradictions.articlesScanned} articles but may miss contradictions ` +
            `between later articles. Increase maxComparisons in ContradictionOptions to scan further.`,
          );
        }
      } catch {
        // Non-fatal: contradiction detection errors don't block compilation
      }
    }


    return this.finalize({
      startMs,
      emit,
      synthesis,
      sourcesScanned: ingestableFiles.length,
      sourcesIngested: contents.length,
      ingestErrors,
      warnings,
      lintOptions: options.lintOptions,
      postProcessOptions: options.postProcess,
      healOptions: options.heal,
      discoverOptions: options.discover,
      visionOptions: options.vision,
      llmOptions: options.llmOptions,
      groundingResult,
      ontologyOptions: {
        generateProposals: options.ontologyProposals !== false,
        autoEvolve:
          typeof options.ontologyProposals === "object"
            ? (options.ontologyProposals.autoEvolve ?? false)
            : false,
      },
      dryRun: options.dryRun,
    });
    } finally {
      // Fix L-1: always release the lock, even on error
      await lock.release();
    }
  }

  // ── Public: individual stages ─────────────────────────────────────────────

  /** Run lint on the compiled KB without running a full compile */
  async lint(options?: LintOptions): Promise<LintReport> {
    const linter = new KBLinter(this.ontology, this.registry, this.compiledDir, this.rawDir);
    return linter.lint(options);
  }

  /** Apply auto-fixes from a lint report */
  async fix(report: LintReport, dryRun: boolean = false): Promise<AutoFixResult> {
    const linter = new KBLinter(this.ontology, this.registry, this.compiledDir, this.rawDir);
    return linter.fix(report, dryRun);
  }

  /**
   * Clip a web page and save it to raw/web-clips/ as markdown with local images.
   * Requires optional deps: @mozilla/readability jsdom turndown
   */
  async clip(url: string): Promise<{ savedPath: string; title: string; imageCount: number }> {
    const { KBClipper } = await import("./ingester/index.js");
    const clipper = new KBClipper(join(this.rawDir, "web-clips"));
    return clipper.clip(url);
  }

  /** Reload the ontology from disk (useful after editing ontology.yaml) */
  async reloadOntology(): Promise<void> {
    const loader = new OntologyLoader(this.kbDir);
    const { ontology } = await loader.load();
    this.ontology = ontology;
  }

  /** Access the current in-memory ConceptRegistry */
  get conceptRegistry(): ConceptRegistry {
    return this.registry;
  }

  /** Access the loaded KBOntology */
  get knowledgeOntology(): KBOntology {
    return this.ontology;
  }

  // ── Private: finalize ─────────────────────────────────────────────────────

  private async finalize(params: {
    startMs: number;
    emit: (e: CompileProgressEvent) => void;
    synthesis: SynthesisResult;
    sourcesScanned: number;
    sourcesIngested: number;
    ingestErrors: CompileResult["ingestErrors"];
    warnings: string[];
    lintOptions?: LintOptions;
    postProcessOptions?: PostProcessOptions;
    healOptions?: boolean | HealOptions;
    discoverOptions?: boolean | DiscoveryOptions;
    visionOptions?: boolean | VisionPassOptions;
    llmOptions?: LLMClientOptions;
    groundingAction?: "warn" | "skip" | "fail" | false;
    groundingThreshold?: number;
    groundingResult?: CompileResult["grounding"];
    ontologyOptions?: { generateProposals: boolean; autoEvolve: boolean };
    dryRun?: boolean;
  }): Promise<CompileResult> {
    const {
      startMs,
      emit,
      synthesis,
      sourcesScanned,
      sourcesIngested,
      ingestErrors,
      warnings,
      dryRun,
    } = params;

    // ── Post-processing: wikilink resolution + segmentation ──────────────────
    let postProcess: PostProcessResult | undefined;
    if (!dryRun) {
      postProcess = await postProcessCompiledArticles(
        this.compiledDir,
        this.registry,
        params.postProcessOptions,
      );
      if (postProcess.wikilinks.resolved > 0) {
        warnings.push(`Resolved ${postProcess.wikilinks.resolved} wikilinks to markdown links`);
      }
      if (postProcess.wikilinks.unresolved > 0) {
        warnings.push(
          `${postProcess.wikilinks.unresolved} unresolved wikilinks remain (linter will flag these)`,
        );
      }
      if (postProcess.segmentation && postProcess.segmentation.split > 0) {
        for (const s of postProcess.segmentation.splits) {
          warnings.push(
            `Split oversized article "${s.docId}" into ${s.parts} parts (was ~${s.originalTokens} tokens)`,
          );
        }
      }
    }

    let lintReport: LintReport | undefined;
    let fixResult: AutoFixResult | undefined;

    if (this.autoLint) {
      const linter = new KBLinter(this.ontology, this.registry, this.compiledDir, this.rawDir);
      lintReport = await linter.lint(params.lintOptions);

      emit({
        stage: "lint",
        issueCount: lintReport.issues.length,
        autoFixable: lintReport.summary.autoFixable,
      });

      if (!dryRun) {
        // Fix C-2: atomic write to prevent partial-write corruption
        await atomicWriteFile(this.lintReportPath, JSON.stringify(lintReport, null, 2));
      }

      if (this.autoFix && lintReport.summary.autoFixable > 0) {
        fixResult = await linter.fix(lintReport, dryRun);
        emit({ stage: "fix", fixedCount: fixResult.fixedCount });
      }
    }

    // Phase 1E: Always persist the registry — this is the single write location.
    // Previously lived inside the autoLint block, which meant it wasn't written
    // when autoLint was disabled.
    if (!dryRun) {
      // Fix C-2: atomic write to prevent partial-write corruption
      await atomicWriteFile(this.registryPath, serializeRegistry(this.registry));
    }

    // ── Phase C: Opt-in advanced intelligence features ────────────────────────

    let healResult: HealResult | undefined;
    let discoveryResult: DiscoveryResult | undefined;
    let visionResult: VisionPassResult | undefined;

    const needsLLM = params.healOptions || params.discoverOptions || params.visionOptions;
    if (needsLLM && !dryRun) {
      const clients = autoDetectKBClients(params.llmOptions);
      if (!clients) {
        warnings.push(
          "Phase C features requested but no LLM API key found. Skipping heal/discover/vision.",
        );
      } else {
        // C1: Heal Mode
        if (params.healOptions && lintReport) {
          const healOpts = typeof params.healOptions === "object" ? params.healOptions : {};
          healResult = await healLintIssues(
            clients.text,
            lintReport,
            this.compiledDir,
            this.registry,
            healOpts,
          );
          emit({ stage: "heal", healed: healResult.healed, skipped: healResult.skipped });
        }

        // C2: Discovery Mode
        if (params.discoverOptions) {
          const discOpts = typeof params.discoverOptions === "object" ? params.discoverOptions : {};
          discoveryResult = await discoverGaps(
            clients.text,
            this.compiledDir,
            this.registry,
            this.ontology,
            discOpts,
          );
          emit({
            stage: "discover",
            missing: discoveryResult.missingArticles.length,
            connections: discoveryResult.weakConnections.length,
          });
        }

        // C3: Vision Pass
        if (params.visionOptions) {
          const visOpts = typeof params.visionOptions === "object" ? params.visionOptions : {};
          visionResult = await runVisionPass(clients.vision, this.compiledDir, visOpts);
          emit({ stage: "vision", described: visionResult.described, failed: visionResult.failed });
        }
      }
    }

    // ── O7: Ontology Proposals ────────────────────────────────────────────────
    if (!dryRun && params.ontologyOptions?.generateProposals) {
      try {
        await generateOntologyProposals(
          this.kbDir,
          this.ontology,
          this.registry,
          { autoEvolve: params.ontologyOptions.autoEvolve },
        );
      } catch {
        warnings.push("Ontology proposal generation failed (non-fatal)");
      }
    }

    // ── O8: Vocabulary-Registry Sync ─────────────────────────────────────────
    // Fix A-1: write vocab additions to a sidecar file (.kb-vocab-sync.json)
    // instead of mutating ontology.yaml. This preserves the user's hand-crafted
    // ontology.yaml and keeps compilation idempotent (pure function of inputs).
    if (!dryRun && synthesis.created + synthesis.updated > 0) {
      const vocabSidecarPath = join(this.kbDir, ".kb-vocab-sync.json");

      // P1-3: Read existing sidecar to merge (not overwrite) entries.
      // This makes the write idempotent — only truly new entries are added.
      // R3-7: Use null-prototype object to prevent prototype pollution from tampered sidecar.
      let existingVocab: Record<string, { aliases: string[]; entityType?: string; docId?: string }> =
        Object.create(null) as Record<string, { aliases: string[]; entityType?: string; docId?: string }>;
      try {
        const raw = await readFile(vocabSidecarPath, "utf-8");
        const parsed = JSON.parse(raw) as { vocabulary?: typeof existingVocab };
        if (parsed.vocabulary) {
          // Copy into null-prototype object to prevent __proto__ pollution
          for (const [k, v] of Object.entries(parsed.vocabulary)) {
            if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
            existingVocab[k] = v;
          }
        }
      } catch { /* first run or malformed */ }

      const newVocabEntries: Record<string, { aliases: string[]; entityType?: string; docId?: string }> = {};
      for (const [docId, entry] of this.registry) {
        const titleLower = (entry.canonicalTitle ?? "").toLowerCase();
        if (!titleLower) continue;
        if (!this.ontology.vocabulary[titleLower] && !existingVocab[titleLower]) {
          // Update in-memory ontology for this session
          this.ontology.vocabulary[titleLower] = {
            aliases: entry.aliases.map((a) => a.toLowerCase()),
            entityType: entry.entityType,
            docId,
          };
          newVocabEntries[titleLower] = {
            aliases: entry.aliases.map((a) => a.toLowerCase()),
            entityType: entry.entityType,
            docId,
          };
        }
      }
      const vocabAdded = Object.keys(newVocabEntries).length;
      if (vocabAdded > 0) {
        warnings.push(`Synced ${vocabAdded} new registry entries into vocabulary (O8)`);
        // Write merged sidecar (existing + new) — preserves user's ontology.yaml
        try {
          const mergedVocab = { ...existingVocab, ...newVocabEntries };
          await atomicWriteFile(vocabSidecarPath, JSON.stringify({
            generatedAt: new Date().toISOString(),
            note: "Auto-generated by O8 vocab sync. Do not edit — will be overwritten.",
            vocabulary: mergedVocab,
          }, null, 2));
        } catch {
          warnings.push("Vocab sync sidecar write failed (non-fatal, in-memory vocab still active)");
        }
      }
    }

    // ── O9: Ontology Version Tracking ────────────────────────────────────────
    // Save .kb-ontology-previous.yaml after each successful compile.
    // Used by O1 (DifferentialEngine) for ontology-change detection.
    if (!dryRun && synthesis.failed === 0) {
      try {
        const previousOntologyPath = join(this.kbDir, ".kb-ontology-previous.yaml");
        // Fix C-2: atomic write
        await atomicWriteFile(previousOntologyPath, serializeOntology(this.ontology));
      } catch {
        // Non-fatal — just means next run won't have a previous ontology to compare
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
      grounding: params.groundingResult,
      durationMs: Date.now() - startMs,
      ingestErrors,
      warnings,
    };

    emit({ stage: "complete", result });
    return result;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Normalize a GenerateFn | ModelLike into a GenerateFn */
function normalizeGenerateFn(model: GenerateFn | ModelLike): GenerateFn {
  if (typeof model === "function") return model;

  // ModelLike → GenerateFn via makeGenerateFn inline (avoids circular import)
  return async (systemPrompt: string, userPrompt: string): Promise<string> => {
    const result = await model.complete({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
      // Phase 2E: Raised from 4096 to 8192 to prevent truncated extraction/synthesis responses
      maxTokens: 8192,
    });
    return result.content ?? "";
  };
}

/** Recursively scan a directory and return all file paths */
async function scanDirectory(dir: string): Promise<string[]> {
  const files: string[] = [];
  try {
    const entries = await readdir(dir);
    // E1: sequential iteration prevents EMFILE from opening all stat handles simultaneously.
    // For raw/ directories the overhead is negligible vs LLM synthesis cost.
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      try {
        const s = await stat(fullPath);
        if (s.isDirectory()) {
          const nested = await scanDirectory(fullPath);
          files.push(...nested);
        } else if (s.isFile()) {
          files.push(fullPath);
        }
      } catch {
        /* skip unreadable entries */
      }
    }
  } catch {
    /* raw/ may not exist yet */
  }
  return files.sort();
}
