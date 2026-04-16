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
 *   - Vocabulary scan: find all known entity mentions via alias index
 *   - Registry lookup: check which mentioned entities already have articles
 *   - Directory hint: infer entity type from file path convention
 *   - Token estimation: decide how much to include in the LLM prompt
 *
 * Pass 2 — LLM classification (uses extractionModel, fast/cheap):
 *   - Classify the source into entity type + canonical title
 *   - Identify existing articles to update vs new articles to create
 *   - Extract candidate new concepts not yet in the KB
 *   - Suggest frontmatter values from the source
 *   - Determine the article's relationships to known KB entities
 *
 * Pass 3 — Post-processing (no LLM):
 *   - Compute deterministic docIds from LLM output
 *   - Merge sources targeting the same entity (multi-source grouping)
 *   - Validate entity types against ontology
 *   - Flag low-confidence plans for human review
 */

import { join, dirname, relative, basename } from 'path'
import { generateDocId } from '../utils.js'
import { withRetry } from '../retry.js'
import type { KBOntology, ConceptRegistry } from '../../ontology/index.js'
import { buildAliasIndex, scanForEntityMentions } from '../../ontology/index.js'
import type { IngestedContent } from '../ingester/index.js'
import { estimateTokens } from '../../../utils/tokens.js'
import type {
  CompilationPlan,
  ArticlePlan,
  StaticAnalysisResult,
  CandidateConcept,
  ArticleAction,
} from './types.js'
import {
  buildExtractionSystemPrompt,
  buildExtractionUserPrompt,
} from './prompt.js'

// ── Directory → entity type conventions ──────────────────────────────────────

/**
 * Maps directory name patterns to default entity types.
 * Users can put source files in well-known directories and the extractor
 * will use this as a strong prior for LLM classification.
 */
const DIRECTORY_HINTS: Record<string, string> = {
  papers: 'research_paper',
  paper: 'research_paper',
  research: 'research_paper',
  arxiv: 'research_paper',
  preprints: 'research_paper',
  tools: 'tool',
  libs: 'tool',
  libraries: 'tool',
  repos: 'tool',
  concepts: 'concept',
  ideas: 'concept',
  glossary: 'concept',
  tutorials: 'tutorial',
  guides: 'tutorial',
  howtos: 'tutorial',
  datasets: 'dataset',
  data: 'dataset',
  apis: 'api',
  'web-clips': 'article',
  articles: 'article',
  blogs: 'article',
  news: 'article',
}

// ── GenerateFn type ───────────────────────────────────────────────────────────

/**
 * A simple async function that calls an LLM and returns the text response.
 * Decoupled from any specific YAAF model implementation for testability.
 *
 * To create one from a YAAF BaseLLMAdapter:
 * ```ts
 * const model = new GeminiChatModel({ model: 'gemini-2.5-flash', apiKey: '...' })
 * const generateFn: GenerateFn = async (system, user) => {
 *   const result = await model.complete({
 *     messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
 *     temperature: 0.1,
 *     maxTokens: 2048,
 *   })
 *   return result.content ?? ''
 * }
 * ```
 */
export type GenerateFn = (systemPrompt: string, userPrompt: string) => Promise<string>

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
    .replace(/^```(?:json|JSON)?\s*/m, '')
    .replace(/```\s*$/m, '')
    .trim()

  // 2. Find the first '{' — skip any preamble
  const start = text.indexOf('{')
  if (start === -1) {
    // No object found — return as-is and let JSON.parse produce a useful error
    return text
  }

  // 3. Walk forward counting braces, tracking string context (Phase 1B fix)
  //    Previous version didn't account for braces inside JSON string values
  //    e.g., {"code": "function foo() { return {} }"} would break
  let depth = 0
  let inString = false
  let escape = false
  let end = -1

  for (let i = start; i < text.length; i++) {
    const ch = text[i]!

    // Handle escape sequences inside strings
    if (escape) {
      escape = false
      continue
    }

    if (ch === '\\' && inString) {
      escape = true
      continue
    }

    // Toggle string context on unescaped quotes
    if (ch === '"') {
      inString = !inString
      continue
    }

    // Only count braces outside of strings
    if (inString) continue

    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        end = i
        break
      }
    }
  }

  if (end === -1) {
    // Unbalanced — return from start onwards and let JSON.parse fail with context
    return text.slice(start)
  }

  return text.slice(start, end + 1)
}

// ── LLM response parser ───────────────────────────────────────────────────────

interface RawArticlePlan {
  canonicalTitle?: string
  entityType?: string
  action?: string
  existingDocId?: string | null
  docIdSuggestion?: string
  knownLinkDocIds?: string[]
  candidateNewConcepts?: Array<{
    name?: string
    entityType?: string
    description?: string
    mentionCount?: number
  }>
  suggestedFrontmatter?: Record<string, unknown>
  skipReason?: string | null
  confidence?: number
}

interface RawExtractionResponse {
  articles?: RawArticlePlan[]
}

/**
 * Parse and validate the raw LLM JSON response into typed ArticlePlans.
 * Extremely defensive — the LLM can produce invalid JSON, missing fields,
 * wrong entity types. We validate and fill defaults rather than throw.
 */
function parseExtractionResponse(
  raw: string,
  ontology: KBOntology,
  sourcePath: string,
  registry: ConceptRegistry,
): ArticlePlan[] {
  // Robustly extract JSON from the LLM response.
  // LLMs may wrap JSON in markdown fences, add preamble prose, or include trailing text.
  const cleaned = extractJsonFromLlmResponse(raw)

  let parsed: RawExtractionResponse
  try {
    parsed = JSON.parse(cleaned)
  } catch (err) {
    throw new Error(
      `Concept Extractor: Failed to parse JSON from LLM response.\n` +
      `Source: ${sourcePath}\n` +
      `Parse error: ${err instanceof Error ? err.message : String(err)}\n` +
      `Cleaned excerpt: ${cleaned.slice(0, 300)}`,
    )
  }

  if (!parsed.articles || !Array.isArray(parsed.articles)) {
    throw new Error(
      `Concept Extractor: Response missing 'articles' array.\n` +
      `Source: ${sourcePath}`,
    )
  }

  const validEntityTypes = new Set(Object.keys(ontology.entityTypes))
  const validRegistryDocIds = new Set(Array.from(registry.keys()))

  return parsed.articles
    .filter((a): a is RawArticlePlan => !!a && typeof a === 'object')
    .map((raw): ArticlePlan | null => {
      const title = typeof raw.canonicalTitle === 'string' ? raw.canonicalTitle.trim() : ''
      if (!title) return null // Skip plans without a title

      // Validate and fall back entity type
      let entityType = typeof raw.entityType === 'string' ? raw.entityType.trim() : ''
      if (!validEntityTypes.has(entityType)) {
        entityType = Object.keys(ontology.entityTypes)[0]! // Fall back to first entity type
      }

      const action: ArticleAction =
        raw.action === 'create' || raw.action === 'update' || raw.action === 'skip'
          ? raw.action
          : 'create'

      // DocId: use LLM suggestion if it looks valid, else generate deterministically
      const suggestedDocId =
        typeof raw.docIdSuggestion === 'string' &&
        /^[a-z][a-z0-9-/]+$/.test(raw.docIdSuggestion)
          ? raw.docIdSuggestion
          : generateDocId(title, entityType)

      // Validate existing docId for updates
      const existingDocId =
        action === 'update' &&
        typeof raw.existingDocId === 'string' &&
        validRegistryDocIds.has(raw.existingDocId)
          ? raw.existingDocId
          : undefined

      // Validate known link docIds (must exist in registry)
      const knownLinkDocIds = (raw.knownLinkDocIds ?? [])
        .filter((id): id is string => typeof id === 'string' && validRegistryDocIds.has(id))

      // Parse candidate new concepts
      const candidateNewConcepts: CandidateConcept[] = (raw.candidateNewConcepts ?? [])
        .filter(c => typeof c?.name === 'string' && c.name.trim())
        .map(c => ({
          name: (c.name ?? '').trim(),
          entityType: validEntityTypes.has(c.entityType ?? '')
            ? c.entityType!
            : Object.keys(ontology.entityTypes)[0]!,
          description: typeof c.description === 'string' ? c.description.trim() : '',
          mentionCount: typeof c.mentionCount === 'number' ? c.mentionCount : 1,
        }))

      const confidence =
        typeof raw.confidence === 'number' &&
        raw.confidence >= 0 &&
        raw.confidence <= 1
          ? raw.confidence
          : 0.7 // Default moderate confidence

      return {
        docId: suggestedDocId,
        canonicalTitle: title,
        entityType,
        action,
        existingDocId,
        sourcePaths: [sourcePath],
        knownLinkDocIds,
        candidateNewConcepts,
        suggestedFrontmatter: typeof raw.suggestedFrontmatter === 'object' &&
          raw.suggestedFrontmatter !== null
          ? raw.suggestedFrontmatter
          : {},
        skipReason:
          action === 'skip' && typeof raw.skipReason === 'string'
            ? raw.skipReason
            : undefined,
        confidence,
      }
    })
    .filter((p): p is ArticlePlan => p !== null)
}

// ── ConceptExtractor class ────────────────────────────────────────────────────

/**
 * The Concept Extractor — planning layer of the KB compilation pipeline.
 *
 * @example
 * ```ts
 * const model = new GeminiChatModel({ model: 'gemini-2.5-flash', apiKey: key })
 * const generateFn: GenerateFn = (sys, user) =>
 *   model.complete({ messages: [{ role: 'system', content: sys }, { role: 'user', content: user }] })
 *     .then(r => r.content ?? '')
 *
 * const extractor = new ConceptExtractor(ontology, registry, generateFn)
 * const plan = await extractor.buildPlan(ingestedContents)
 * ```
 */
export class ConceptExtractor {
  private readonly systemPrompt: string
  private readonly aliasIndex: ReturnType<typeof buildAliasIndex>

  constructor(
    private readonly ontology: KBOntology,
    private readonly registry: ConceptRegistry,
    private readonly generateFn: GenerateFn,
  ) {
    this.systemPrompt = buildExtractionSystemPrompt(ontology)
    this.aliasIndex = buildAliasIndex(ontology)
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
    const allArticlePlans: ArticlePlan[] = []
    const skipped: CompilationPlan['skipped'] = []

    // Process each source file independently
    const results = await Promise.allSettled(
      contents.map(content => this.extractFromContent(content)),
    )

    for (const [i, result] of results.entries()) {
      const content = contents[i]!

      if (result.status === 'rejected') {
        const err = result.reason instanceof Error ? result.reason : new Error(String(result.reason))
        skipped.push({
          sourcePath: content.sourceFile,
          reason: `Extraction failed: ${err.message}`,
        })
        continue
      }

      const plans = result.value

      // Separate skipped plans from actionable ones
      for (const plan of plans) {
        if (plan.action === 'skip') {
          skipped.push({
            sourcePath: content.sourceFile,
            reason: plan.skipReason ?? 'LLM classified as non-KB-worthy',
          })
        } else {
          allArticlePlans.push(plan)
        }
      }
    }

    // Group plans targeting the same docId (multi-source synthesis)
    const merged = this.mergeByDocId(allArticlePlans)

    return {
      sourceCount: contents.length,
      articles: merged,
      skipped,
      blockedByMissingDeps: [],
      createdAt: Date.now(),
    }
  }

  // ── Private methods ──────────────────────────────────────

  /**
   * Run the two-pass extraction for a single source file.
   */
  private async extractFromContent(content: IngestedContent): Promise<ArticlePlan[]> {
    // Pass 1: Static analysis (instant, no LLM)
    const staticResult = this.staticAnalyze(content)

    // Pass 2: LLM classification
    const userPrompt = buildExtractionUserPrompt(
      content,
      staticResult,
      this.registry,
      this.ontology,
    )

    // Phase 2A: Wrap LLM call in retry logic for transient failures
    const rawResponse = await withRetry(
      () => this.generateFn(this.systemPrompt, userPrompt),
      { maxRetries: 3 },
    )

    // Pass 3: Parse + validate + post-process
    const plans = parseExtractionResponse(
      rawResponse,
      this.ontology,
      content.sourceFile,
      this.registry,
    )

    return plans
  }

  /**
   * Static analysis pass — runs in microseconds, no LLM.
   * Provides the LLM with pre-computed facts to improve accuracy.
   */
  private staticAnalyze(content: IngestedContent): StaticAnalysisResult {
    // Vocabulary scan
    const entityMentions = scanForEntityMentions(
      content.text,
      this.ontology,
      this.aliasIndex,
    )

    // Registry matches — entities mentioned that already have compiled articles
    const registryMatches = entityMentions
      .filter(m => m.docId)
      .map(m => {
        const entry = this.registry.get(m.docId!)
        if (!entry) return null
        // Confidence: 50% base + count boost (max +40%) + entity type match (+10%)
        const countBoost = Math.min(m.count / 10, 0.4)
        const typeMatch = m.entityType === entry.entityType ? 0.1 : 0
        return {
          docId: entry.docId,
          canonicalTitle: entry.canonicalTitle,
          entityType: entry.entityType,
          confidence: Math.min(0.5 + countBoost + typeMatch, 1.0),
        }
      })
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .sort((a, b) => b.confidence - a.confidence)

    // Directory hint
    const dirHint = this.detectDirectoryHint(content.sourceFile)

    // Token estimate
    const tokenEstimate = estimateTokens(content.text)

    return {
      entityMentions,
      registryMatches,
      directoryHint: dirHint,
      tokenEstimate,
    }
  }

  /**
   * Extract entity type hint from the source file's directory path.
   * e.g., .../raw/papers/paper.pdf → 'research_paper'
   */
  private detectDirectoryHint(filePath: string): string | undefined {
    const parts = filePath.replace(/\\/g, '/').split('/')
    for (let i = parts.length - 2; i >= 0; i--) {
      const dir = parts[i]?.toLowerCase() ?? ''
      if (DIRECTORY_HINTS[dir]) {
        return DIRECTORY_HINTS[dir]
      }
    }
    return undefined
  }

  /**
   * Merge ArticlePlans that target the same docId.
   * When multiple sources reference the same entity, they're all compiled
   * into one article by the Synthesizer — so we combine their source lists.
   */
  private mergeByDocId(plans: ArticlePlan[]): ArticlePlan[] {
    const grouped = new Map<string, ArticlePlan>()

    for (const plan of plans) {
      const existing = grouped.get(plan.docId)

      if (!existing) {
        grouped.set(plan.docId, { ...plan })
        continue
      }

      // Merge sources
      existing.sourcePaths.push(...plan.sourcePaths)

      // Take the higher-confidence classification
      if (plan.confidence > existing.confidence) {
        existing.canonicalTitle = plan.canonicalTitle
        existing.entityType = plan.entityType
        existing.confidence = plan.confidence
        existing.suggestedFrontmatter = {
          ...existing.suggestedFrontmatter,
          ...plan.suggestedFrontmatter,
        }
      }

      // Merge known links (deduplicate)
      const allLinks = new Set([...existing.knownLinkDocIds, ...plan.knownLinkDocIds])
      existing.knownLinkDocIds = Array.from(allLinks)

      // Merge candidate new concepts (deduplicate by name)
      const existingNames = new Set(existing.candidateNewConcepts.map(c => c.name.toLowerCase()))
      for (const candidate of plan.candidateNewConcepts) {
        if (!existingNames.has(candidate.name.toLowerCase())) {
          existing.candidateNewConcepts.push(candidate)
          existingNames.add(candidate.name.toLowerCase())
        }
      }

      // action: prefer 'update' over 'create' (if either source says update, update)
      if (plan.action === 'update' && existing.action === 'create') {
        existing.action = 'update'
        existing.existingDocId = plan.existingDocId
      }
    }

    return Array.from(grouped.values())
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
      messages: Array<{ role: string; content: string }>
      temperature?: number
      maxTokens?: number
    }): Promise<{ content?: string | null }>
  },
  options: { temperature?: number; maxTokens?: number } = {},
): GenerateFn {
  return async (systemPrompt: string, userPrompt: string) => {
    const result = await model.complete({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: options.temperature ?? 0.1,
      maxTokens: options.maxTokens ?? 8192,
    })
    return result.content ?? ''
  }
}
