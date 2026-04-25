/**
 * Concept Extractor
 *
 * The Concept Extractor sits between the Ingester and the Knowledge Synthesizer.
 * It is the "planning" step of the compilation pipeline:
 *
 * Ingester → [IngestedContent] → ConceptExtractor → [CompilationPlan] → KnowledgeSynthesizer
 *
 * Each source file goes through two passes:
 *
 * Pass 1 — Static analysis (no LLM, instant):
 * - Vocabulary scan: find all known entity mentions via alias index
 * - Registry lookup: check which mentioned entities already have articles
 * - Directory hint: infer entity type from file path convention
 * - Token estimation: decide how much to include in the LLM prompt
 *
 * Pass 2 — LLM classification (uses extractionModel, fast/cheap):
 * - Classify the source into entity type + canonical title
 * - Identify existing articles to update vs new articles to create
 * - Extract candidate new concepts not yet in the KB
 * - Suggest frontmatter values from the source
 * - Determine the article's relationships to known KB entities
 *
 * Pass 3 — Post-processing (no LLM):
 * - Compute deterministic docIds from LLM output
 * - Merge sources targeting the same entity (multi-source grouping)
 * - Validate entity types against ontology
 * - Flag low-confidence plans for human review
 */

import { join, dirname, relative, basename } from "path";
import { generateDocId } from "../utils.js";
import { withRetry } from "../retry.js";
import type { KBOntology, ConceptRegistry } from "../../ontology/index.js";
import { buildAliasIndex, scanForEntityMentions } from "../../ontology/index.js";
import type { IngestedContent } from "../ingester/index.js";
import type { SourceTrustLevel } from "../ingester/types.js";
import { estimateTokens } from "../../../utils/tokens.js";
import type {
  CompilationPlan,
  ArticlePlan,
  StaticAnalysisResult,
  CandidateConcept,
  ArticleAction,
} from "./types.js";
import { buildExtractionSystemPrompt, buildExtractionUserPrompt } from "./prompt.js";

// ── Source trust inference ───────────────────────────────────────────────────

/**
 * C4/A1: Ordered trust levels from highest to lowest.
 * Used so that when merging multiple sources, the lowest trust wins.
 */
const TRUST_ORDER: SourceTrustLevel[] = ["academic", "documentation", "unknown", "web"];

/**
 * Infer the trust level of a source from its MIME type, file path, and URL.
 *
 * ADR-012/Fix-3: source_trust frontmatter is IGNORED. An attacker who writes
 * their own source file controls the frontmatter — trusting their self-reported
 * trust level is a classic confused-deputy. Trust is now inferred from
 * system-controlled properties only:
 *
 * Priority (highest → lowest):
 * 1. sourceUrl present (internet-fetched content) → web
 * 2. File is in a known web-clip directory → web
 *    (catches PDFs in web-clips/, articles/, blogs/, news/)
 * 3. File is in a known academic directory → academic
 *    (papers/, arxiv/, research/, preprints/, publications/)
 * 4. MIME type = application/pdf but NOT in a web dir → academic
 *    (general heuristic: most standalone PDFs are academic/formal)
 * 5. File is in a documentation directory → documentation
 * 6. MIME type = text/html with no URL → web
 * 7. Everything else → unknown
 *
 * N3 fix: directory check fires BEFORE mimeType check so that a PDF
 * in web-clips/ is classified 'web', not 'academic'.
 */
function inferSourceTrust(content: IngestedContent): SourceTrustLevel {

  // 2. URL-clipped web content is always 'web'
  if (content.sourceUrl?.startsWith("http")) {
    return "web";
  }

  const pathLower = content.sourceFile.replace(/\\/g, "/").toLowerCase();
  const parts = pathLower.split("/");

  // 3. N3 fix: web-clip directories override mimeType.
  // A PDF saved in web-clips/ came from the internet — not a formal publication.
  const isWebDir = parts.some((p) =>
    ["web-clips", "web_clips", "clips", "articles", "blogs", "blog", "news", "feeds"].includes(p),
  );
  if (isWebDir) {
    return "web";
  }

  // 4. Academic directory → 'academic' (even for non-PDF files)
  const isAcademicDir = parts.some((p) =>
    ["papers", "paper", "research", "arxiv", "preprints", "publications"].includes(p),
  );
  if (isAcademicDir) {
    return "academic";
  }

  // 5. PDF not in a web directory → assume academic/formal publication
  if (content.mimeType === "application/pdf") {
    return "academic";
  }

  // 6. Documentation directories → 'documentation'
  const isDocsDir = parts.some((p) =>
    ["docs", "doc", "documentation", "spec", "specs", "rfc", "standards"].includes(p),
  );
  if (isDocsDir) {
    return "documentation";
  }

  // 7. HTML with no URL (saved offline) → treat as web-origin
  if (content.mimeType === "text/html") {
    return "web";
  }

  return "unknown";
}


/**
 * When multiple sources contribute to one article, pick the lowest-trust
 * level (conservative / worst-case) so provenance isn't falsely elevated.
 *
 * Trust order (highest → lowest): academic → documentation → unknown → web
 */
function mergeTrust(a: SourceTrustLevel, b: SourceTrustLevel): SourceTrustLevel {
  const ai = TRUST_ORDER.indexOf(a);
  const bi = TRUST_ORDER.indexOf(b);
  // Higher index = lower trust. Return the one with the higher index.
  return ai > bi ? a : b;
}


// ── Directory → entity type conventions ──────────────────────────────────────

/**
 * Maps directory name patterns to default entity types.
 * Users can put source files in well-known directories and the extractor
 * will use this as a strong prior for LLM classification.
 */
const DIRECTORY_HINTS: Record<string, string> = {
  papers: "research_paper",
  paper: "research_paper",
  research: "research_paper",
  arxiv: "research_paper",
  preprints: "research_paper",
  tools: "tool",
  libs: "tool",
  libraries: "tool",
  repos: "tool",
  concepts: "concept",
  ideas: "concept",
  glossary: "concept",
  tutorials: "tutorial",
  guides: "tutorial",
  howtos: "tutorial",
  datasets: "dataset",
  data: "dataset",
  apis: "api",
  "web-clips": "article",
  articles: "article",
  blogs: "article",
  news: "article",
};

// ── GenerateFn type ───────────────────────────────────────────────────────────

/**
 * A simple async function that calls an LLM and returns the text response.
 * Decoupled from any specific YAAF model implementation for testability.
 *
 * To create one from a YAAF BaseLLMAdapter:
 * ```ts
 * const model = new GeminiChatModel({ model: 'gemini-2.5-flash', apiKey: '...' })
 * const generateFn: GenerateFn = async (system, user) => {
 * const result = await model.complete({
 * messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
 * temperature: 0.1,
 * maxTokens: 2048,
 * })
 * return result.content ?? ''
 * }
 * ```
 */
export type GenerateFn = (systemPrompt: string, userPrompt: string) => Promise<string>;

// ── DocId generation ──────────────────────────────────────────────────────────
// Delegated to ../utils.ts for proper pluralization (Phase 4B)

// ── JSON extraction helper ────────────────────────────────────────────────────

/**
 * Robustly extract a JSON object from an LLM response.
 *
 * Handles:
 * - Markdown code fences: ```json ... ``` or ``` ... ```
 * - Preamble prose before the JSON (LLM says "Here is the JSON:")
 * - Trailing prose after the closing brace
 * - Nested objects and arrays (uses brace counting, not regex)
 */
function extractJsonFromLlmResponse(raw: string): string {
  // 1. Strip markdown code fences (any variant)
  let text = raw
    .replace(/^```(?:json|JSON)?\s*/m, "")
    .replace(/```\s*$/m, "")
    .trim();

  // 2. Find the first '{' — skip any preamble
  const start = text.indexOf("{");
  if (start === -1) {
    // No object found — return as-is and let JSON.parse produce a useful error
    return text;
  }

  // 3. Walk forward counting braces, tracking string context (Phase 1B fix)
  // Previous version didn't account for braces inside JSON string values
  // e.g., {"code": "function foo() { return {} }"} would break
  let depth = 0;
  let inString = false;
  let inSingleString = false; // 5.4: track single-quoted strings (non-spec but common in LLM output)
  let escape = false;
  let end = -1;

  for (let i = start; i < text.length; i++) {
    const ch = text[i]!;

    // Handle escape sequences inside strings
    if (escape) {
      escape = false;
      continue;
    }

    if (ch === "\\" && (inString || inSingleString)) {
      escape = true;
      continue;
    }

    // Toggle double-quote string context
    if (ch === '"' && !inSingleString) {
      inString = !inString;
      continue;
    }

    // 5.4: Toggle single-quote string context (only when not inside a double-quoted string)
    if (ch === "'" && !inString) {
      inSingleString = !inSingleString;
      continue;
    }

    // Only count braces outside of strings
    if (inString || inSingleString) continue;

    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  if (end === -1) {
    // Unbalanced — return from start onwards and let JSON.parse fail with context
    return text.slice(start);
  }

  return text.slice(start, end + 1);
}

// ── LLM response parser ───────────────────────────────────────────────────────

interface RawArticlePlan {
  canonicalTitle?: string;
  entityType?: string;
  action?: string;
  existingDocId?: string | null;
  docIdSuggestion?: string;
  knownLinkDocIds?: string[];
  candidateNewConcepts?: Array<{
    name?: string;
    entityType?: string;
    description?: string;
    mentionCount?: number;
  }>;
  suggestedFrontmatter?: Record<string, unknown>;
  skipReason?: string | null;
  confidence?: number;
}

interface RawExtractionResponse {
  articles?: RawArticlePlan[];
  /** ADR-009: LLM-classified source trust level (overrides directory heuristic) */
  sourceTrustClassification?: string;
}

/**
 * Parse and validate the raw LLM JSON response into typed ArticlePlans.
 * Extremely defensive — the LLM can produce invalid JSON, missing fields,
 * wrong entity types. We validate and fill defaults rather than throw.
 *
 * 1.2 fix: returns proposed entity types alongside plans so the compiler
 * can surface them as structured warnings rather than losing them to stderr.
 */
function parseExtractionResponse(
  raw: string,
  ontology: KBOntology,
  sourcePath: string,
  registry: ConceptRegistry,
): {
  plans: ArticlePlan[];
  proposed: Array<{ entityType: string; title: string }>;
  /** ADR-009: LLM-classified trust level, if the model provided one */
  llmTrustClassification?: SourceTrustLevel;
} {
  // Robustly extract JSON from the LLM response.
  // LLMs may wrap JSON in markdown fences, add preamble prose, or include trailing text.
  const cleaned = extractJsonFromLlmResponse(raw);

  let parsed: RawExtractionResponse;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      `Concept Extractor: Failed to parse JSON from LLM response.\n` +
        `Source: ${sourcePath}\n` +
        `Parse error: ${err instanceof Error ? err.message : String(err)}\n` +
        `Cleaned excerpt: ${cleaned.slice(0, 300)}`,
    );
  }

  if (!parsed.articles || !Array.isArray(parsed.articles)) {
    throw new Error(
      `Concept Extractor: Response missing 'articles' array.\n` + `Source: ${sourcePath}`,
    );
  }

  const validEntityTypes = new Set(Object.keys(ontology.entityTypes));
  const validRegistryDocIds = new Set(Array.from(registry.keys()));

  // 1.2: collect unknown entity types for structured surfacing
  const proposed: Array<{ entityType: string; title: string }> = [];

  const plans = parsed.articles
    .filter((a): a is RawArticlePlan => !!a && typeof a === "object")
    .map((raw): ArticlePlan | null => {
      const title = typeof raw.canonicalTitle === "string" ? raw.canonicalTitle.trim() : "";
      if (!title) return null; // Skip plans without a title

      // Validate and fall back entity type
      let entityType = typeof raw.entityType === "string" ? raw.entityType.trim() : "";
      if (!validEntityTypes.has(entityType)) {
        const fallback = Object.keys(ontology.entityTypes)[0]!;
        // 1.2 fix: collect for structured surfacing instead of only console.warn
        proposed.push({ entityType: entityType || "(empty)", title });
        console.warn(
          `[extractor] Unknown entity type "${entityType}" for "${title}" — ` +
          `falling back to "${fallback}". Add it to ontology.yaml to fix.`,
        );
        entityType = fallback;
      }

      const action: ArticleAction =
        raw.action === "create" || raw.action === "update" || raw.action === "skip"
          ? raw.action
          : "create";

      // DocId: ALWAYS generate deterministically from the canonical title.
      // NEVER trust the LLM's docIdSuggestion — it produces inconsistent slugs
      // (e.g., "apis/agentrunner" without hyphen insertion) while generateDocId()
      // correctly produces "apis/agent-runner". Using both paths created 373+
      // duplicate article pairs in the KB. generateDocId() is the single source
      // of truth for slug generation.
      const suggestedDocId = generateDocId(title, entityType);

      // Validate existing docId for updates
      const existingDocId =
        action === "update" &&
        typeof raw.existingDocId === "string" &&
        validRegistryDocIds.has(raw.existingDocId)
          ? raw.existingDocId
          : undefined;

      // Validate known link docIds (must exist in registry)
      const knownLinkDocIds = (raw.knownLinkDocIds ?? []).filter(
        (id): id is string => typeof id === "string" && validRegistryDocIds.has(id),
      );

      // Parse candidate new concepts
      const candidateNewConcepts: CandidateConcept[] = (raw.candidateNewConcepts ?? [])
        .filter((c) => typeof c?.name === "string" && c.name.trim())
        .map((c) => ({
          name: (c.name ?? "").trim(),
          entityType: validEntityTypes.has(c.entityType ?? "")
            ? c.entityType!
            : (() => {
                const fb = Object.keys(ontology.entityTypes)[0]!;
                const cname = (c.name ?? "").trim();
                // 1.2: also collect candidate-concept unknown types
                proposed.push({ entityType: c.entityType || "(empty)", title: `(candidate) ${cname}` });
                console.warn(
                  `[extractor] Candidate "${cname}" has unknown entity type "${c.entityType}" — falling back to "${fb}".`,
                );
                return fb;
              })(),
          description: typeof c.description === "string" ? c.description.trim() : "",
          mentionCount: typeof c.mentionCount === "number" ? c.mentionCount : 1,
        }));

      const confidence =
        typeof raw.confidence === "number" && raw.confidence >= 0 && raw.confidence <= 1
          ? raw.confidence
          : 0.7; // Default moderate confidence

      return {
        docId: suggestedDocId,
        canonicalTitle: title,
        entityType,
        action,
        existingDocId,
        sourcePaths: [sourcePath],
        knownLinkDocIds,
        candidateNewConcepts,
        suggestedFrontmatter:
          typeof raw.suggestedFrontmatter === "object" && raw.suggestedFrontmatter !== null
            ? raw.suggestedFrontmatter
            : {},
        skipReason:
          action === "skip" && typeof raw.skipReason === "string" ? raw.skipReason : undefined,
        confidence,
        // sourceTrust is set by buildPlan() after we know the IngestedContent
        sourceTrust: "unknown",
      };
    })
    .filter((p): p is ArticlePlan => p !== null);

  // ADR-009: Extract and validate LLM trust classification
  const VALID_TRUST: SourceTrustLevel[] = ["academic", "documentation", "web", "unknown"];
  const llmTrustRaw = (parsed as RawExtractionResponse).sourceTrustClassification;
  const llmTrustClassification = VALID_TRUST.includes(llmTrustRaw as SourceTrustLevel)
    ? (llmTrustRaw as SourceTrustLevel)
    : undefined;

  return { plans, proposed, llmTrustClassification };
}

// ── ConceptExtractor class ────────────────────────────────────────────────────

/**
 * The Concept Extractor — planning layer of the KB compilation pipeline.
 *
 * @example
 * ```ts
 * const model = new GeminiChatModel({ model: 'gemini-2.5-flash', apiKey: key })
 * const generateFn: GenerateFn = (sys, user) =>
 * model.complete({ messages: [{ role: 'system', content: sys }, { role: 'user', content: user }] })
 * .then(r => r.content ?? '')
 *
 * const extractor = new ConceptExtractor(ontology, registry, generateFn)
 * const plan = await extractor.buildPlan(ingestedContents)
 * ```
 */
export class ConceptExtractor {
  private readonly systemPrompt: string;
  private readonly aliasIndex: ReturnType<typeof buildAliasIndex>;

  constructor(
    private readonly ontology: KBOntology,
    private readonly registry: ConceptRegistry,
    private readonly generateFn: GenerateFn,
  ) {
    this.systemPrompt = buildExtractionSystemPrompt(ontology);
    this.aliasIndex = buildAliasIndex(ontology);
  }

  // ── Public API ───────────────────────────────────────────

  /**
   * Build a complete CompilationPlan for a batch of ingested source files.
   *
   * Processes each source independently then merges plans that target
   * the same entity (multi-source grouping).
   *
   * @param contents - Array of IngestedContent from the Ingester
   * @returns CompilationPlan ready for the Knowledge Synthesizer
   */
  async buildPlan(contents: IngestedContent[]): Promise<CompilationPlan> {
    const allArticlePlans: ArticlePlan[] = [];
    const skipped: CompilationPlan["skipped"] = [];
    // 1.2: accumulate proposed types across all source batches
    const proposedAccumulator = new Map<string, { count: number; examples: string[] }>();

    // R4: Correct bounded concurrency via coroutine-worker pattern.
    // The previous Promise.race pool always removed inFlight[0] regardless of
    // which promise won the race, silently losing ArticlePlan[] results for
    // source files at other indices (up to CONCURRENCY-1 files per run).
    const EXTRACT_CONCURRENCY = 3;
    let nextIdx = 0;
    const allResults: Array<{ idx: number; result: PromiseSettledResult<{ plans: ArticlePlan[]; proposed: Array<{ entityType: string; title: string }> }> }> =
      new Array(contents.length);

    const runWorker = async (): Promise<void> => {
      while (nextIdx < contents.length) {
        const idx = nextIdx++;
        const content = contents[idx]!;
        try {
          const result = await this.extractFromContent(content);
          allResults[idx] = { idx, result: { status: "fulfilled", value: result } };
        } catch (e) {
          allResults[idx] = { idx, result: { status: "rejected", reason: e } };
        }
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(EXTRACT_CONCURRENCY, contents.length) }, runWorker),
    );

    for (const entry of allResults) {
      if (!entry) continue;
      const content = contents[entry.idx]!;

      if (entry.result.status === "rejected") {
        const err =
          entry.result.reason instanceof Error
            ? entry.result.reason
            : new Error(String(entry.result.reason));
        skipped.push({
          sourcePath: content.sourceFile,
          reason: `Extraction failed: ${err.message}`,
        });
        continue;
      }

      const { plans, proposed } = entry.result.value;

      // Accumulate proposed entity types
      for (const { entityType, title } of proposed) {
        const existing = proposedAccumulator.get(entityType);
        if (existing) {
          existing.count++;
          if (existing.examples.length < 3) existing.examples.push(title);
        } else {
          proposedAccumulator.set(entityType, { count: 1, examples: [title] });
        }
      }

      // Separate skipped plans from actionable ones
      for (const plan of plans) {
        if (plan.action === "skip") {
          skipped.push({
            sourcePath: content.sourceFile,
            reason: plan.skipReason ?? "LLM classified as non-KB-worthy",
          });
        } else {
          allArticlePlans.push(plan);
        }
      }
    }

    // Group plans targeting the same docId (multi-source synthesis)
    const merged = this.mergeByDocId(allArticlePlans);

    // Convert accumulator to typed array
    const proposedEntityTypes: CompilationPlan["proposedEntityTypes"] = Array.from(
      proposedAccumulator.entries(),
    ).map(([entityType, { count, examples }]) => ({ entityType, count, examples }));

    return {
      sourceCount: contents.length,
      articles: merged,
      skipped,
      blockedByMissingDeps: [],
      proposedEntityTypes,
      createdAt: Date.now(),
    };
  }

  // ── Private methods ──────────────────────────────────────

  /**
   * Run the two-pass extraction for a single source file.
   */
  private async extractFromContent(
    content: IngestedContent,
  ): Promise<{ plans: ArticlePlan[]; proposed: Array<{ entityType: string; title: string }> }> {
    // Pass 1: Static analysis (instant, no LLM)
    const staticResult = this.staticAnalyze(content);

    // Pass 2: LLM classification
    const userPrompt = buildExtractionUserPrompt(
      content,
      staticResult,
      this.registry,
      this.ontology,
    );

    // Phase 2A: Wrap LLM call in retry logic for transient failures
    const rawResponse = await withRetry(() => this.generateFn(this.systemPrompt, userPrompt), {
      maxRetries: 3,
    });

    // Pass 3: Parse + validate + post-process
    const { plans, proposed, llmTrustClassification } = parseExtractionResponse(
      rawResponse,
      this.ontology,
      content.sourceFile,
      this.registry,
    );

    // C4/A1: Infer trust from system-controlled source properties.
    // ADR-012/Fix-3: LLM classification is DOWNGRADE-ONLY. It can reduce trust
    // (e.g., from "academic" to "web") but never elevate it. This prevents a
    // compromised or confused LLM from upgrading a web source to academic trust.
    const heuristicTrust = inferSourceTrust(content);
    const trust = llmTrustClassification
      ? mergeTrust(heuristicTrust, llmTrustClassification) // mergeTrust picks lowest trust
      : heuristicTrust;

    if (llmTrustClassification && llmTrustClassification !== heuristicTrust) {
      console.warn(
        `[extractor] LLM trust adjustment: "${content.sourceFile}" — ` +
        `heuristic=${heuristicTrust}, LLM=${llmTrustClassification}, final=${trust} (downgrade-only)`,
      );
    }

    for (const plan of plans) {
      plan.sourceTrust = trust;
    }

    return { plans, proposed };
  }

  /**
   * Static analysis pass — runs in microseconds, no LLM.
   * Provides the LLM with pre-computed facts to improve accuracy.
   */
  private staticAnalyze(content: IngestedContent): StaticAnalysisResult {
    // Vocabulary scan
    // J1: guard against undefined text — image-only PDFs have IngestedContent.text = undefined.
    // scanForEntityMentions calls sourceText.toLowerCase() immediately, throwing TypeError.
    const entityMentions = scanForEntityMentions(content.text ?? "", this.ontology, this.aliasIndex);

    // Registry matches — entities mentioned that already have compiled articles
    const registryMatches = entityMentions
      .filter((m) => m.docId)
      .map((m) => {
        const entry = this.registry.get(m.docId!);
        if (!entry) return null;
        // Confidence: 50% base + count boost (max +40%) + entity type match (+10%)
        const countBoost = Math.min(m.count / 10, 0.4);
        const typeMatch = m.entityType === entry.entityType ? 0.1 : 0;
        return {
          docId: entry.docId,
          canonicalTitle: entry.canonicalTitle,
          entityType: entry.entityType,
          confidence: Math.min(0.5 + countBoost + typeMatch, 1.0),
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .sort((a, b) => b.confidence - a.confidence);

    // Directory hint
    const dirHint = this.detectDirectoryHint(content.sourceFile);

    // Token estimate
    const tokenEstimate = estimateTokens(content.text ?? "");

    return {
      entityMentions,
      registryMatches,
      directoryHint: dirHint,
      tokenEstimate,
    };
  }

  /**
   * Extract entity type hint from the source file's directory path.
   * e.g., .../raw/papers/paper.pdf → 'research_paper'
   */
  private detectDirectoryHint(filePath: string): string | undefined {
    const parts = filePath.replace(/\\/g, "/").split("/");
    for (let i = parts.length - 2; i >= 0; i--) {
      const dir = parts[i]?.toLowerCase() ?? "";
      if (DIRECTORY_HINTS[dir]) {
        return DIRECTORY_HINTS[dir];
      }
    }
    return undefined;
  }

  /**
   * Merge ArticlePlans that target the same docId.
   * When multiple sources reference the same entity, they're all compiled
   * into one article by the Synthesizer — so we combine their source lists.
   */
  private mergeByDocId(plans: ArticlePlan[]): ArticlePlan[] {
    const grouped = new Map<string, ArticlePlan>();

    for (const plan of plans) {
      const existing = grouped.get(plan.docId);

      if (!existing) {
        grouped.set(plan.docId, { ...plan });
        continue;
      }

      // Merge sources
      existing.sourcePaths.push(...plan.sourcePaths);

      // C4/A1: Merge trust conservatively (lowest trust from any source wins)
      existing.sourceTrust = mergeTrust(existing.sourceTrust, plan.sourceTrust);

      // Take the higher-confidence classification
      if (plan.confidence > existing.confidence) {
        existing.canonicalTitle = plan.canonicalTitle;
        existing.entityType = plan.entityType;
        existing.confidence = plan.confidence;
        existing.suggestedFrontmatter = {
          ...existing.suggestedFrontmatter,
          ...plan.suggestedFrontmatter,
        };
      }

      // Merge known links (deduplicate)
      const allLinks = new Set([...existing.knownLinkDocIds, ...plan.knownLinkDocIds]);
      existing.knownLinkDocIds = Array.from(allLinks);

      // Merge candidate new concepts (deduplicate by name)
      const existingNames = new Set(existing.candidateNewConcepts.map((c) => c.name.toLowerCase()));
      for (const candidate of plan.candidateNewConcepts) {
        if (!existingNames.has(candidate.name.toLowerCase())) {
          existing.candidateNewConcepts.push(candidate);
          existingNames.add(candidate.name.toLowerCase());
        }
      }

      // action: prefer 'update' over 'create' (if either source says update, update)
      if (plan.action === "update" && existing.action === "create") {
        existing.action = "update";
        existing.existingDocId = plan.existingDocId;
      }
    }

    return Array.from(grouped.values());
  }
}

// ── Helper: build GenerateFn from BaseLLMAdapter ──────────────────────────────

/**
 * Convenience helper to create a GenerateFn from any YAAF-compatible model.
 * The model must implement `complete({ messages })`.
 *
 * @param model - Any object with a complete() method (BaseLLMAdapter subclass)
 * @param options - Temperature and max tokens for extraction calls
 */
export function makeGenerateFn(
  model: {
    complete(params: {
      messages: Array<{ role: string; content: string }>;
      temperature?: number;
      maxTokens?: number;
    }): Promise<{ content?: string | null }>;
  },
  options: { temperature?: number; maxTokens?: number } = {},
): GenerateFn {
  return async (systemPrompt: string, userPrompt: string) => {
    const result = await model.complete({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: options.temperature ?? 0.1,
      maxTokens: options.maxTokens ?? 8192,
    });
    return result.content ?? "";
  };
}
