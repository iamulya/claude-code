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

import { IngestCache } from "./ingester/ingestCache.js";

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
import { MultiLayerGroundingPlugin, buildVocabularyAliasMap } from "./groundingPlugin.js";

import { generateOntologyProposals } from "./ontologyProposals.js";
import { deduplicatePlans } from "./dedup.js";
import { detectContradictions } from "./contradictions.js";
import { serializeOntology } from "../ontology/loader.js";
import { VocabSidecarSchema } from "./schemas.js";
import { buildQualityRecord, appendQualityRecord, loadQualityHistory, compareCompiles } from "./qualityHistory.js";
import { writeCitationIndex } from "./citationIndex.js";

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
      verificationLevel?: string;
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
  /** 7.1: machine-readable grounding audit trail written after each compile */
  private readonly groundingReportPath: string;
  private readonly autoLint: boolean;
  private readonly autoFix: boolean;
  private readonly extractFn: GenerateFn;
  private readonly synthFn: GenerateFn;
  private readonly pdfExtractFn?: PdfExtractFn;
  private readonly pluginHost?: PluginHost;
  private ontology!: KBOntology;
  private registry!: ConceptRegistry;
  /**
   * A6-a: Cached wikilink data from the most recent postprocess pass.
   * Populated by finalize(), consumed by compile() to persist in the manifest.
   */
  private lastWikilinkData?: {
    deps: Record<string, string[]>;
    unresolvedDocIds: string[];
  };

  private constructor(options: KBCompilerOptions, ontology: KBOntology, registry: ConceptRegistry) {
    this.kbDir = resolve(options.kbDir);
    this.rawDir = join(this.kbDir, options.rawDirName ?? "raw");
    this.compiledDir = join(this.kbDir, options.compiledDirName ?? "compiled");
    this.registryPath = join(this.kbDir, ".kb-registry.json");
    this.lintReportPath = join(this.kbDir, ".kb-lint-report.json");
    this.groundingReportPath = join(this.kbDir, ".kb-grounding-report.json");
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

  // ── H9: Registry reload ──────────────────────────────────────────────────────

  /**
   * Re-read `.kb-registry.json` from disk into the in-memory registry.
   *
   * H9: The registry is loaded at `KBCompiler.create()` time. If the same
   * instance is used for multiple `compile()` calls, the in-memory registry
   * drifts from disk (e.g., another process writes new articles between calls).
   *
   * M5: If the registry file is corrupt, attempt to read `.kb-registry.json.bak`
   * before falling back to rebuilding from the compiled/ directory.
   */
  private async reloadRegistry(): Promise<void> {
    try {
      const registryJson = await readFile(this.registryPath, "utf-8");
      try {
        this.registry = deserializeRegistry(registryJson);
        return;
      } catch (parseErr) {
        // M5: Primary corrupt — try backup
        console.warn(
          `[compiler] .kb-registry.json is corrupt: ${
            parseErr instanceof Error ? parseErr.message : String(parseErr)
          }. Attempting backup recovery...`,
        );
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
      // File not found — try backup or rebuild
    }

    // M5: Try backup file
    try {
      const backupJson = await readFile(this.registryPath + ".bak", "utf-8");
      this.registry = deserializeRegistry(backupJson);
      console.warn("[compiler] Recovered registry from .kb-registry.json.bak");
      // Restore the primary file from backup
      await atomicWriteFile(this.registryPath, backupJson);
      return;
    } catch {
      // Backup also missing or corrupt — rebuild
    }

    // Last resort: rebuild from compiled/
    try {
      const { registry: built } = await buildConceptRegistry(this.compiledDir, this.ontology);
      this.registry = built;
      console.warn("[compiler] Rebuilt registry from compiled/ directory");
    } catch {
      this.registry = new Map();
      console.warn("[compiler] Starting with empty registry");
    }
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

    // H9: Re-read registry from disk at the start of every compile().
    // Prevents stale in-memory state when the same KBCompiler instance is
    // reused across multiple compile cycles.
    await this.reloadRegistry();

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
    //
    // Finding 18: use IngestCache to avoid re-parsing unchanged files.
    // Cache lives at {kbDir}/.kb-ingest-cache/ and is keyed by sha256 of
    // the source file's bytes. Cache hits skip all ingestion work (HTML→MD
    // conversion, PDF extraction) and return the stored IngestedContent.

    const ingestCache = new IngestCache(this.kbDir);
    if (!options.dryRun) {
      await ingestCache.init();
    }

    const contentsByPath = new Map<string, IngestedContent>();
    let ingestCount = 0;
    let cacheHits = 0;

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

        // Finding 18: check cache before parsing.
        const cached = options.dryRun ? null : await ingestCache.get(filePath);
        if (cached) {
          ingested = cached;
          cacheHits++;
        } else if (pluginIngester) {
          // Delegate to the registered plugin ingester
          const result = await pluginIngester.ingest(filePath, {
            imageOutputDir: join(this.compiledDir, "assets"),
          });
          // IngesterAdapterResult is structurally identical to IngestedContent
          ingested = result as unknown as IngestedContent;
          if (!options.dryRun) await ingestCache.set(filePath, ingested);
        } else {
          // Built-in ingester pipeline
          ingested = await ingestFile(filePath, {
            imageOutputDir: join(this.compiledDir, "assets"),
            ...(this.pdfExtractFn ? { pdfExtractFn: this.pdfExtractFn } : {}),
          } as IngesterOptions);
          if (!options.dryRun) await ingestCache.set(filePath, ingested);
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

    if (cacheHits > 0) {
      warnings.push(
        `Ingestion cache: ${cacheHits}/${ingestableFiles.length} file(s) served from cache ` +
        `(${ingestableFiles.length - cacheHits} re-parsed).`,
      );
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

    // ── 1.2: Surface proposed entity types as structured warnings ───────
    // These are types the LLM suggested that don't exist in ontology.yaml.
    // We surface them here so CompileResult.warnings[] contains actionable
    // guidance — previously they were only visible as console.warn on stderr.
    if (plan.proposedEntityTypes.length > 0) {
      for (const { entityType, count, examples } of plan.proposedEntityTypes) {
        const exampleList = examples.slice(0, 3).map((e) => `"${e}"`).join(", ");
        warnings.push(
          `[ontology] LLM suggested entity type "${entityType}" ${count} time(s) ` +
          `(e.g. ${exampleList}) but it is not in ontology.yaml. ` +
          `Articles were coerced to "${Object.keys(this.ontology.entityTypes)[0]}". ` +
          `Add "${entityType}" to ontology.yaml to use it.`,
        );
      }
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


    // ── Finding 17: Read synthesis checkpoint from previous crashed run ────
    //
    // If a previous compile crashed mid-synthesis, the progress sidecar records
    // which articles were fully written. We merge those docIds into skipDocIds
    // so this run resumes from where the crash occurred rather than restarting
    // from scratch. This is particularly valuable for large KBs (200+ articles)
    // where a rate-limit or network failure late in the run would otherwise
    // discard hours of LLM work.
    const progressFile = join(this.kbDir, ".kb-synthesis-progress.json");
    if (!options.dryRun) {
      try {
        const raw = await readFile(progressFile, "utf-8");
        const progress = JSON.parse(raw) as { completedDocIds?: string[] };
        const completed = new Set<string>(progress.completedDocIds ?? []);
        if (completed.size > 0) {
          skipDocIds ??= new Set<string>();
          // CP-1: Only skip checkpoint articles whose sources have NOT changed
          // since the crash. If a raw file was edited after the crash, the
          // differential engine marks that article as stale — the checkpoint
          // must not win over the differential plan.
          const staleIds = differentialPlan?.staleDocIds;
          let skippedFromCheckpoint = 0;
          for (const docId of completed) {
            if (staleIds && staleIds.has(docId)) continue; // source changed — must re-synthesize
            skipDocIds.add(docId);
            skippedFromCheckpoint++;
          }
          if (skippedFromCheckpoint > 0) {
            const staleFiltered = completed.size - skippedFromCheckpoint;
            const filterNote = staleFiltered > 0
              ? ` (${staleFiltered} skipped — source changed since crash).`
              : ".";
            warnings.push(
              `Checkpoint resume: skipping ${skippedFromCheckpoint} article(s) already synthesized in a previous run${filterNote}` +
              ` Delete ${progressFile} to force a full re-run.`,
            );
          }
        }
      } catch {
        // No progress file — fresh run or file was cleaned up normally.
      }
    }

    // Accumulate completed docIds for atomic checkpoint writes during synthesis.
    // Using a Set (not appending to a file) avoids concurrent-write races since
    // each onArticleComplete call replaces the whole file atomically.
    const checkpointDocIds = new Set<string>(skipDocIds ?? []);

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
      // Finding 17: update the checkpoint sidecar after each completed article.
      // Fire-and-forget — a slow or failing write cannot stall the synthesis loop.
      onArticleComplete: options.dryRun ? undefined : (docId) => {
        checkpointDocIds.add(docId);
        // Write the whole set atomically so a concurrent read sees a valid JSON file.
        atomicWriteFile(
          progressFile,
          JSON.stringify({ completedDocIds: Array.from(checkpointDocIds) }, null, 2),
        ).catch(() => { /* checkpoint write failure is non-fatal */ });
      },
    });

    // ── Stale stub regeneration (no LLM needed) ──────────────────────
    //
    // The synthesizer only creates NEW stubs from extractor candidates.
    // Existing stubs with `compiled_from: []` have no path through the
    // synthesis loop. When the differential engine marks them stale
    // (e.g., ontology schema change added required fields), we regenerate
    // their frontmatter in-place using the current template + schema.
    //
    // This is template-only: read the article body, rebuild frontmatter
    // with schema-aware defaults, write back. ~2ms per stub.
    if (differentialPlan && !options.dryRun) {
      const { generateStubArticle } = await import("./synthesizer/prompt.js");
      let stubsRegenerated = 0;

      for (const docId of differentialPlan.staleDocIds) {
        const filePath = join(this.compiledDir, `${docId}.md`);
        try {
          const raw = await readFile(filePath, "utf-8");
          // Only regenerate stubs — synthesized articles are handled above
          if (!/^stub:\s*true/m.test(raw)) continue;

          // Parse existing frontmatter for values we want to preserve
          const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
          if (!fmMatch) continue;

          const fmBlock = fmMatch[1]!;
          const body = fmMatch[2]!;

          // Extract values from existing frontmatter
          const titleMatch = fmBlock.match(/^title:\s*"?([^"\n]+)"?/m);
          const etMatch = fmBlock.match(/^entity_type:\s*(\S+)/m);
          const compiledAtMatch = fmBlock.match(/^compiled_at:\s*"?([^"\n]+)"?/m);
          if (!titleMatch || !etMatch) continue;

          const title = titleMatch[1]!.trim();
          const entityType = etMatch[1]!.trim();
          const compiledAt = compiledAtMatch?.[1]?.trim() ?? new Date().toISOString();

          // Extract description from Overview section
          const overviewMatch = body.match(/## Overview\s*\n\s*\n([^\n]+)/);
          const description = overviewMatch?.[1]?.trim() ?? title;

          // Regenerate using the current template (now includes schema fields)
          const newContent = generateStubArticle({
            docId,
            canonicalTitle: title,
            entityType,
            description,
            knownLinkDocIds: [],
            registry: this.registry,
            compiledAt,
            ontology: this.ontology,
          });

          await writeFile(filePath, newContent, "utf-8");
          stubsRegenerated++;
        } catch {
          // File missing or unreadable — skip silently
        }
      }

      if (stubsRegenerated > 0) {
        warnings.push(
          `Regenerated ${stubsRegenerated} stale stub(s) with updated template/schema fields.`,
        );
        // Update synthesis stats
        (synthesis as { updated: number }).updated += stubsRegenerated;
      }
    }

    // A6-a: Manifest save is deferred until AFTER finalize() so postprocess
    // wikilink dependency data is available. See below, after the finalize call.

    // Finding 18: prune stale ingest cache entries for files that were deleted.
    // Runs after every successful (non-dryRun) compile — not just incremental —
    // so full-compile workflows don't accumulate unbounded cache entries.
    if (!options.dryRun) {
      const activeSourcePaths = new Set<string>(ingestableFiles);
      const pruned = await ingestCache.prune(activeSourcePaths);
      if (pruned > 0) {
        warnings.push(`Ingest cache: removed ${pruned} stale entr${pruned === 1 ? "y" : "ies"} for deleted source files.`);
      }
    }


    // ── M2: Grounding pass (optional, L1 always, L2/L3 need embedFn/generateFn) ──────────
    let groundingResult: CompileResult["grounding"] | undefined;
    const groundingAction = options.groundingAction ?? "warn"; // ADR-009: warn by default (L1 is free)
    // G-04: Track articles deleted by grounding-skip for wikilink dep cleanup.
    // Declared outside the if-block so it's accessible during manifest save.
    const deletedByGrounding = new Set<string>();

    if (groundingAction !== false && !options.dryRun && synthesis.articles.length > 0) {
      const groundingAdapter: KBGroundingAdapter =
        this.pluginHost?.getKBGroundingAdapter() ??
        // 3.1 fix: pass ontology vocabulary aliases so L1 keyword overlap
        // expands synonyms — "attention blocks" matches "transformer layers"
        // when both are aliases in ontology.yaml vocabulary.
        new MultiLayerGroundingPlugin({
          vocabularyAliases: buildVocabularyAliasMap(this.ontology.vocabulary),
        });

      // P1-1: Adapt threshold for L1-only mode. Vocabulary overlap alone cannot
      // distinguish semantic support from vocabulary co-occurrence, so require
      // at least some claims to be keyword-verified (0.6 vs 0.5).
      const isL1Only = groundingAdapter instanceof MultiLayerGroundingPlugin &&
        !groundingAdapter.hasEmbedding && !groundingAdapter.hasLLM;
      const groundingThreshold = options.groundingThreshold ?? (isL1Only ? 0.6 : 0.5);

      const perArticle: NonNullable<CompileResult["grounding"]>["perArticle"] = [];
      let totalScore = 0;
      let failed = 0;

      // C4/A1: Build docId → sourceTrust map so grounding can apply trust weights per article.
      const articleTrustMap = new Map<string, import("./ingester/types.js").SourceTrustLevel>();
      for (const ap of plan.articles) {
        articleTrustMap.set(ap.docId, ap.sourceTrust ?? "unknown");
      }

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
            // C4/A1: pass the aggregate trust level so the grounding score
            // is weighted by source credibility (web sources get 0.75 × raw score)
            articleTrustMap.get(article.docId) ?? "unknown",
          );

          const passed = result.score >= groundingThreshold;
          totalScore += result.score;

          perArticle.push({
            docId: article.docId,
            score: result.score,
            totalClaims: result.totalClaims,
            supportedClaims: result.supportedClaims,
            passed,
            // ADR-012/Fix-11: Surface verification level per article
            verificationLevel: result.verificationLevel,
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
                // G-04: Track deleted docIds so wikilink deps can be pruned
                deletedByGrounding.add(article.docId);
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
        // 7.1: persist grounding report for CI inspection and operator review
        if (!options.dryRun) {
          await atomicWriteFile(
            this.groundingReportPath,
            JSON.stringify(
              {
                compiledAt: new Date().toISOString(),
                threshold: groundingThreshold,
                ...groundingResult,
              },
              null,
              2,
            ),
          ).catch(() => {}); // non-fatal — compile succeeds even if report write fails
        }
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


    const result = await this.finalize({
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

    // Persist the source-hash manifest after a successful differential compile.
    // D1: Orphan pruning is deferred until AFTER the manifest is saved, so a
    // crash between synthesis and manifest-save cannot cause silent article loss.
    // A6-a: Save is AFTER finalize() so postprocess wikilink data is available.
    if (options.incrementalMode && differentialEngine && !options.dryRun) {
      // G-04: Prune wikilink deps for articles deleted by grounding-skip.
      // Without this, the manifest would still reference the deleted article as
      // a dependency, preventing articles linking to it from being refreshed.
      if (this.lastWikilinkData && deletedByGrounding.size > 0) {
        for (const deletedId of deletedByGrounding) {
          delete this.lastWikilinkData.deps[deletedId];
        }
        // Also remove the deleted docId from other articles' dep lists
        for (const [docId, deps] of Object.entries(this.lastWikilinkData.deps)) {
          this.lastWikilinkData.deps[docId] = deps.filter(
            (d) => !deletedByGrounding.has(d),
          );
        }
      }
      await differentialEngine.save(this.lastWikilinkData);
      // Finding 17: synthesis completed successfully — delete the progress sidecar
      // so the next run starts clean. Failure to delete is non-fatal.
      unlink(progressFile).catch(() => {});
      // Now safe to prune: manifest has advanced, so next run won't treat
      // orphan sources as "present" if the process crashes during unlink.
      if (differentialPlan && differentialPlan.orphanDocIds.size > 0) {
        await differentialEngine.pruneOrphans(differentialPlan.orphanDocIds);
      }
    }

    return result;
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

    // ── Bug 1 fix: Cross-category deduplication ───────────────────────────────
    // The pre-synthesis dedup catches new plan duplicates, but articles from
    // prior compilations may exist under different categories with the same slug
    // (e.g., apis/abac AND concepts/abac). Detect and merge these by keeping
    // the article with more content and deleting the sparser one.
    if (!dryRun) {
      const crossCatMerged = await this.mergeCrossCategoryDuplicates();
      if (crossCatMerged > 0) {
        warnings.push(
          `Merged ${crossCatMerged} cross-category duplicate article(s) (kept richer version)`,
        );
      }
    }

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

    // A6-a: Store wikilink dependency data for the differential manifest.
    // This is read by compile() after finalize() returns.
    if (postProcess) {
      this.lastWikilinkData = {
        deps: postProcess.wikilinkDeps,
        unresolvedDocIds: postProcess.unresolvedDocIds,
      };
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
      // M5: Save backup of current registry before overwriting.
      // If the primary write is interrupted (crash, power loss), reloadRegistry()
      // can recover from .kb-registry.json.bak.
      try {
        const existing = await readFile(this.registryPath, "utf-8");
        await writeFile(this.registryPath + ".bak", existing, "utf-8");
      } catch {
        /* No existing registry to back up — first compile */
      }
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
        // Sprint 1b: Validate sidecar with Zod instead of unsafe JSON.parse-as-T
        const result = VocabSidecarSchema.safeParse(JSON.parse(raw));
        if (result.success && result.data.vocabulary) {
          // Copy into null-prototype object to prevent __proto__ pollution
          for (const [k, v] of Object.entries(result.data.vocabulary)) {
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

    // ── Reverse Citation Index ────────────────────────────────────────────────
    // Build bidirectional source↔article mappings for root-cause analysis.
    // Answers: "which articles cite source X?" and "which sources feed article Y?"
    if (!dryRun && synthesis.created + synthesis.updated > 0) {
      try {
        await writeCitationIndex(this.kbDir, this.compiledDir);
      } catch {
        // Non-fatal — citation index failure should never block compilation
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

    // ── W-22: Compile Quality History ─────────────────────────────────────────
    // Append a quality record to .kb-quality-history.jsonl for regression tracking.
    // Compare with previous compile to detect grounding/lint regressions.
    if (!dryRun) {
      try {
        const qualityRecord = buildQualityRecord(result);
        const history = await loadQualityHistory(this.kbDir);
        if (history.length > 0) {
          const prev = history[history.length - 1]!;
          const delta = compareCompiles(prev, qualityRecord);
          for (const regression of delta.regressions) {
            warnings.push(`[quality regression] ${regression}`);
          }
          for (const improvement of delta.improvements) {
            warnings.push(`[quality improvement] ${improvement}`);
          }
        }
        await appendQualityRecord(this.kbDir, qualityRecord);
      } catch {
        // Non-fatal — quality tracking failure should never block compilation
      }
    }

    emit({ stage: "complete", result });
    return result;
  }

  // ── Bug 1 fix: Cross-category deduplication ─────────────────────────────────

  /**
   * Detect and merge articles that have the same slug but different entity-type
   * category directories (e.g., apis/abac + concepts/abac).
   *
   * For each collision pair, keep the article with more body content (richer).
   * Delete the sparser one from disk and registry. Update incoming wikilinks.
   *
   * Returns the number of duplicates merged.
   */
  private async mergeCrossCategoryDuplicates(): Promise<number> {
    const files = await scanDirectory(this.compiledDir);
    const mdFiles = files.filter((f) => f.endsWith(".md"));

    // Group by slug (last segment of docId)
    const bySlug = new Map<string, Array<{ docId: string; filePath: string; bodyLen: number; isStub: boolean }>>();

    for (const filePath of mdFiles) {
      const rel = filePath
        .slice(this.compiledDir.length + 1)
        .replace(/\.md$/, "")
        .replace(/\\/g, "/");
      const slug = rel.split("/").pop() ?? rel;
      let content: string;
      try {
        content = await readFile(filePath, "utf-8");
      } catch { continue; }

      const bodyMatch = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
      const bodyLen = bodyMatch ? bodyMatch[1]!.length : 0;
      const isStub = /^stub:\s*true/m.test(content);

      const group = bySlug.get(slug) ?? [];
      group.push({ docId: rel, filePath, bodyLen, isStub });
      bySlug.set(slug, group);
    }

    let merged = 0;

    for (const [_slug, group] of bySlug) {
      if (group.length < 2) continue;

      // Sort: non-stubs before stubs, then by body length descending
      group.sort((a, b) => {
        if (a.isStub !== b.isStub) return a.isStub ? 1 : -1;
        return b.bodyLen - a.bodyLen;
      });

      const survivor = group[0]!;
      // Delete all but the survivor
      for (let i = 1; i < group.length; i++) {
        const victim = group[i]!;
        try {
          await unlink(victim.filePath);
          // Remove from registry
          this.registry.delete(victim.docId);
          merged++;
        } catch { /* already gone */ }
      }
    }

    return merged;
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
