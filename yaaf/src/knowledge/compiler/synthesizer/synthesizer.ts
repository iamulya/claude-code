/**
 * Knowledge Synthesizer
 *
 * The final authoring step of the KB compilation pipeline. Consumes a
 * CompilationPlan and IngestedContent map to produce compiled wiki articles.
 *
 * Pipeline position:
 *
 * ConceptExtractor → [CompilationPlan]
 * ↓
 * KnowledgeSynthesizer
 * ↓
 * compiled/{docId}.md
 * ↓
 * .kb-registry.json (updated)
 *
 * For each ArticlePlan in the CompilationPlan:
 *
 * 1. Gather source texts (from contentsByPath Map)
 * 2. If action='update': load existing compiled article
 * 3. Build synthesis prompt (system + user)
 * 4. Call generative model (expensive — synthesis model)
 * 5. Parse LLM output into frontmatter + body
 * 6. Validate + coerce frontmatter against ontology schema
 * 7. Inject compiler metadata (entity_type, compiled_at, stub, confidence)
 * 8. Write final article to compiled/{docId}.md
 * 9. Update the ConceptRegistry in-memory
 * 10. If candidateNewConcepts are high-confidence → generate stub articles
 *
 * After all articles:
 * 11. Write .kb-registry.json cache to disk
 *
 * Concurrency:
 * Articles are synthesized in parallel up to `options.concurrency` (default: 3).
 * Each article is an independent LLM call — no cross-article ordering required.
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import type { KBOntology, ConceptRegistry, ConceptRegistryEntry } from "../../ontology/index.js";
import { serializeRegistry, upsertRegistryEntry } from "../../ontology/index.js";
import type { IngestedContent } from "../ingester/index.js";
import type { CompilationPlan, ArticlePlan, CandidateConcept } from "../extractor/index.js";
import { writeWithVersioning } from "../versioning.js";
import { withRetry } from "../retry.js";
import { generateDocId } from "../utils.js";
import { validateGrounding } from "../validator.js";
import {
  serializeFrontmatter,
  validateFrontmatter,
  buildCompleteFrontmatter,
  parseArticleOutput,
} from "./frontmatter.js";
import {
  buildSynthesisSystemPrompt,
  buildSynthesisUserPrompt,
  generateStubArticle,
} from "./prompt.js";
import type {
  SynthesisOptions,
  SynthesisResult,
  ArticleSynthesisResult,
  SynthesisProgressEvent,
} from "./types.js";

// ── Re-export GenerateFn type from extractor (same interface) ─────────────────

export type { GenerateFn } from "../extractor/extractor.js";

// ── Concurrency primitive ─────────────────────────────────────────────────────

/**
 * Simple semaphore to limit concurrent LLM calls.
 * Prevents API rate limit errors when synthesizing many articles.
 */
class Semaphore {
  private queue: Array<() => void> = [];
  private count: number;

  constructor(permits: number) {
    this.count = permits;
  }

  async acquire(): Promise<void> {
    if (this.count > 0) {
      this.count--;
      return;
    }
    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      next();
    } else {
      this.count++;
    }
  }

  async withPermit<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

// ── KnowledgeSynthesizer ──────────────────────────────────────────────────────

import type { GenerateFn } from "../extractor/extractor.js";

export class KnowledgeSynthesizer {
  private readonly versionsDir: string;

  constructor(
    private readonly ontology: KBOntology,
    private registry: ConceptRegistry,
    private readonly generateFn: GenerateFn,
    private readonly compiledDir: string,
  ) {
    this.versionsDir = join(compiledDir, "..", ".versions");
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  /**
   * Synthesize all articles in the plan.
   *
   * @param plan - The CompilationPlan from the ConceptExtractor
   * @param contentsByPath - Map from absolute source file path → IngestedContent
   * @param options - Synthesis options
   * @returns SynthesisResult with stats and per-article outcomes
   */
  async synthesize(
    plan: CompilationPlan,
    contentsByPath: Map<string, IngestedContent>,
    options: SynthesisOptions = {},
  ): Promise<SynthesisResult> {
    const startMs = Date.now();
    const concurrency = options.concurrency ?? 3;
    const stubThreshold = options.stubConfidenceThreshold ?? 0.7;
    const emit = options.onProgress ?? (() => {});

    const semaphore = new Semaphore(concurrency);
    const articleResults: ArticleSynthesisResult[] = [];

    // ── Synthesize main articles ──────────────────────────────────────

    const skipDocIds = options.skipDocIds ?? new Set<string>();

    const tasks = plan.articles
      .filter((articlePlan) => {
        if (skipDocIds.has(articlePlan.docId)) {
          // Emit a lightweight event so progress bars still update
          emit({
            type: "article:written",
            docId: articlePlan.docId,
            action: "skip",
            title: articlePlan.canonicalTitle,
            wordCount: 0,
          });
          return false; // excluded from LLM synthesis
        }
        return true;
      })
      .map((articlePlan) =>
        semaphore.withPermit(async () => {
          const result = await this.synthesizeArticle(articlePlan, contentsByPath, options, emit);
          return result;
        }),
      );

    const settled = await Promise.allSettled(tasks);

    // Phase 1C: Batch-apply registry updates after all tasks complete
    // This avoids concurrent mutation of the shared registry Map
    for (const result of settled) {
      if (result.status === "fulfilled") {
        articleResults.push(result.value);
        if (result.value.action !== "failed" && result.value.registryEntry) {
          upsertRegistryEntry(this.registry, result.value.registryEntry);
        }
      }
    }

    // ── Create stubs for high-confidence candidates ──────────────────

    const stubResults: ArticleSynthesisResult[] = [];
    const allCandidates = plan.articles.flatMap((a) =>
      a.candidateNewConcepts
        .filter((c) => (a.confidence ?? 0) >= stubThreshold)
        .map((c) => ({ candidate: c, plan: a })),
    );

    // Deduplicate candidates by name (case-insensitive)
    const seenCandidateNames = new Set<string>();
    const uniqueCandidates = allCandidates.filter(({ candidate }) => {
      const key = candidate.name.toLowerCase();
      if (seenCandidateNames.has(key)) return false;
      seenCandidateNames.add(key);
      return true;
    });

    // Phase 3C: Create stubs in parallel (template-generated, no LLM cost)
    const stubTasks = uniqueCandidates
      .filter(
        ({ candidate }) => !this.registry.has(generateDocId(candidate.name, candidate.entityType)),
      )
      .map(({ candidate, plan: parentPlan }) =>
        this.createStub(candidate, [parentPlan.docId], options, emit),
      );
    const stubSettled = await Promise.allSettled(stubTasks);
    for (const result of stubSettled) {
      if (result.status === "fulfilled" && result.value) {
        stubResults.push(result.value);
      }
    }

    // Phase 1E: Registry persistence is handled by the compiler only
    // (removed dual-write from synthesizer — compiler.ts:456 is the single source)

    // ── Compile results ────────────────────────────────────────────────────────

    const allResults = [...articleResults, ...stubResults];
    const result: SynthesisResult = {
      created: allResults.filter((r) => r.action === "created").length,
      updated: allResults.filter((r) => r.action === "updated").length,
      stubsCreated: stubResults.filter((r) => r.action === "created").length,
      failed: allResults.filter((r) => r.action === "failed").length,
      skipped: skipDocIds.size,
      articles: allResults,
      durationMs: Date.now() - startMs,
    };

    emit({ type: "run:complete", stats: result });
    return result;
  }

  // ── Private: synthesize one article ─────────────────────────────────────────

  private async synthesizeArticle(
    articlePlan: ArticlePlan,
    contentsByPath: Map<string, IngestedContent>,
    options: SynthesisOptions,
    emit: (e: SynthesisProgressEvent) => void,
  ): Promise<ArticleSynthesisResult> {
    emit({
      type: "article:started",
      docId: articlePlan.docId,
      action: articlePlan.action,
      title: articlePlan.canonicalTitle,
    });

    try {
      // Gather source contents
      const sources = articlePlan.sourcePaths
        .map((p) => contentsByPath.get(p))
        .filter((c): c is IngestedContent => c !== null && c !== undefined);

      if (sources.length === 0) {
        return {
          docId: articlePlan.docId,
          canonicalTitle: articlePlan.canonicalTitle,
          action: "failed",
          error: new Error("No source content found — content map may be incomplete"),
        };
      }

      // Load existing article for update mode
      let existingArticle: string | undefined;
      if (articlePlan.action === "update" && articlePlan.existingDocId) {
        existingArticle = await this.loadExistingArticle(articlePlan.existingDocId);
      }

      // Build prompts
      const schema = this.ontology.entityTypes[articlePlan.entityType];
      if (!schema) {
        return {
          docId: articlePlan.docId,
          canonicalTitle: articlePlan.canonicalTitle,
          action: "failed",
          error: new Error(`Entity type "${articlePlan.entityType}" not found in ontology`),
        };
      }

      const systemPrompt = buildSynthesisSystemPrompt(this.ontology, articlePlan.entityType);
      const userPrompt = buildSynthesisUserPrompt({
        plan: articlePlan,
        sources,
        existingArticle,
        registry: this.registry,
        ontology: this.ontology,
      });

      // Call synthesis model with retry (Phase 2A)
      const rawOutput = await withRetry(() => this.generateFn(systemPrompt, userPrompt), {
        maxRetries: 3,
      });

      // Parse LLM output
      const parsed = parseArticleOutput(rawOutput);

      // Validate frontmatter
      const validationResult = validateFrontmatter(
        parsed.frontmatter,
        schema.frontmatter,
        articlePlan.entityType,
        this.registry,
        this.ontology,
      );

      // Build complete frontmatter (with compiler metadata)
      const compiledAt = new Date().toISOString();
      const completeFrontmatter = buildCompleteFrontmatter(
        validationResult.values,
        articlePlan.suggestedFrontmatter,
        {
          entityType: articlePlan.entityType,
          canonicalTitle: articlePlan.canonicalTitle,
          docId: articlePlan.docId,
          sourcePaths: articlePlan.sourcePaths,
          confidence: articlePlan.confidence,
          isStub: false,
          compiledAt,
        },
      );

      // Serialize to final markdown
      const frontmatterBlock = serializeFrontmatter(completeFrontmatter);
      const finalMarkdown = [frontmatterBlock, "", parsed.body].join("\n");

      const outputPath = join(this.compiledDir, `${articlePlan.docId}.md`);
      const wordCount = parsed.body.split(/\s+/).filter(Boolean).length;

      // Phase 1A: Write with versioning (backs up previous version)
      if (!options.dryRun) {
        await mkdir(dirname(outputPath), { recursive: true });
        const writeResult = await writeWithVersioning(outputPath, finalMarkdown, this.versionsDir);
        if (writeResult.action === "unchanged") {
          emit({
            type: "article:written",
            docId: articlePlan.docId,
            action: articlePlan.action,
            title: articlePlan.canonicalTitle,
            wordCount,
          });
          return {
            docId: articlePlan.docId,
            canonicalTitle: articlePlan.canonicalTitle,
            action: "skipped",
            wordCount,
            outputPath,
          };
        }
      }

      // Phase 5C: Post-synthesis grounding validation
      const sourceTexts = sources.map((s) => s.text);
      const grounding = validateGrounding(parsed.body, sourceTexts);
      if (grounding.score < 0.5) {
        emit({
          type: "article:warning",
          docId: articlePlan.docId,
          title: articlePlan.canonicalTitle,
          message: `Low grounding score (${(grounding.score * 100).toFixed(0)}%). ${grounding.unsupportedClaims.length} potentially hallucinated claims.`,
        });
      }

      // Build registry entry for batch application (Phase 1C)
      const registryEntry: ConceptRegistryEntry = {
        docId: articlePlan.docId,
        canonicalTitle: articlePlan.canonicalTitle,
        entityType: articlePlan.entityType,
        aliases: [articlePlan.canonicalTitle.toLowerCase()],
        compiledAt: Date.now(),
        isStub: false,
      };

      const action: ArticleSynthesisResult["action"] =
        articlePlan.action === "update" ? "updated" : "created";

      emit({
        type: "article:written",
        docId: articlePlan.docId,
        action: articlePlan.action,
        title: articlePlan.canonicalTitle,
        wordCount,
      });

      return {
        docId: articlePlan.docId,
        canonicalTitle: articlePlan.canonicalTitle,
        action,
        wordCount,
        outputPath: options.dryRun ? undefined : outputPath,
        registryEntry, // Phase 1C: returned for batch application
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      emit({
        type: "article:failed",
        docId: articlePlan.docId,
        title: articlePlan.canonicalTitle,
        error,
      });
      return {
        docId: articlePlan.docId,
        canonicalTitle: articlePlan.canonicalTitle,
        action: "failed",
        error,
      };
    }
  }

  // ── Private: create stub article ─────────────────────────────────────────────

  private async createStub(
    candidate: CandidateConcept,
    parentDocIds: string[],
    options: SynthesisOptions,
    emit: (e: SynthesisProgressEvent) => void,
  ): Promise<ArticleSynthesisResult | null> {
    const docId = generateDocId(candidate.name, candidate.entityType);
    const compiledAt = new Date().toISOString();

    const stubMarkdown = generateStubArticle({
      docId,
      canonicalTitle: candidate.name,
      entityType: candidate.entityType,
      description: candidate.description,
      knownLinkDocIds: parentDocIds,
      registry: this.registry,
      compiledAt,
    });

    const outputPath = join(this.compiledDir, `${docId}.md`);

    if (!options.dryRun) {
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, stubMarkdown, "utf-8");
    }

    // Register the stub
    upsertRegistryEntry(this.registry, {
      docId,
      canonicalTitle: candidate.name,
      entityType: candidate.entityType,
      aliases: [candidate.name.toLowerCase()],
      compiledAt: Date.now(),
      isStub: true,
    });

    emit({ type: "stub:created", docId, title: candidate.name, entityType: candidate.entityType });

    return {
      docId,
      canonicalTitle: candidate.name,
      action: "created",
      wordCount: stubMarkdown.split(/\s+/).filter(Boolean).length,
      outputPath: options.dryRun ? undefined : outputPath,
    };
  }

  // ── Private helpers ───────────────────────────────────────────────────────────

  private async loadExistingArticle(docId: string): Promise<string | undefined> {
    const path = join(this.compiledDir, `${docId}.md`);
    try {
      return await readFile(path, "utf-8");
    } catch {
      return undefined; // File doesn't exist — treat as create
    }
  }
  // Phase 1E: Removed saveRegistry() — registry persistence is handled by compiler only
}

// Phase 4B: Use shared docId generation from utils.ts
// (removed duplicated candidateToDocId — use generateDocId from utils.ts instead)
