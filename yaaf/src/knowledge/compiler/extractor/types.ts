/**
 * Compilation Plan Types
 *
 * The CompilationPlan is the contract between the Concept Extractor and the
 * Knowledge Synthesizer. It answers the question:
 *
 *   "Given these ingested source documents, what KB articles should be
 *    created or updated, and with what relationships?"
 *
 * The Concept Extractor produces a CompilationPlan; the Knowledge Synthesizer
 * consumes it to author articles. Nothing from the Extractor step bypasses the
 * Synthesizer — the plan is guidance, not content.
 */

// ── Candidate new concept ─────────────────────────────────────────────────────

/**
 * A concept discovered in the source that does not yet have a KB article.
 * The Synthesizer may create a stub article for it (or queue it for a future
 * full compilation pass).
 */
export type CandidateConcept = {
  /** Canonical name suggested by the LLM (should match ontology vocabulary if possible) */
  name: string
  /** Suggested entity type — must be one of the ontology's entity types */
  entityType: string
  /** One-sentence description extracted from the source */
  description: string
  /** Number of times this concept was mentioned in the source */
  mentionCount: number
}

// ── Article plan ──────────────────────────────────────────────────────────────

/** What to do with an article during compilation */
export type ArticleAction = 'create' | 'update' | 'skip'

/**
 * A plan for a single compiled KB article.
 * One source file can produce multiple ArticlePlans (e.g., a survey paper
 * covering attention, transformers, and BERT → three article updates).
 * Multiple source files can contribute to one ArticlePlan (they are merged
 * by the Knowledge Synthesizer into a single coherent article).
 */
export type ArticlePlan = {
  /**
   * The target docId for this article (relative to compiled/, no .md extension).
   * Format: {entityType}/{slug-of-canonical-title}
   * Example: "concepts/attention-mechanism"
   * Computed deterministically by the Extractor — never user-provided.
   */
  docId: string

  /** The canonical article title */
  canonicalTitle: string

  /** Entity type key from the ontology */
  entityType: string

  /**
   * What to do:
   * - create: new article, none in the registry
   * - update: existing article needs new info merged in
   * - skip:   source isn't KB-worthy (changelog, license, test file, etc.)
   */
  action: ArticleAction

  /**
   * If action = 'update', the existing article's docId (from the registry).
   * The Synthesizer will read the existing article + new sources and merge.
   */
  existingDocId?: string

  /**
   * Absolute file paths of IngestedContent that contribute to this article.
   * Multiple sources are synthesized into one article by the Synthesizer.
   */
  sourcePaths: string[]

  /**
   * docIds of KB articles this article should link to.
   * Populated from: registry lookup + vocabulary scan + LLM classification.
   * The Synthesizer writes these as [[wikilinks]] in the article body.
   */
  knownLinkDocIds: string[]

  /**
   * New concepts discovered in the source that don't have KB articles yet.
   * The Synthesizer creates stub articles for high-confidence candidates.
   */
  candidateNewConcepts: CandidateConcept[]

  /**
   * Suggested frontmatter field values, inferred from the source.
   * The Synthesizer validates these against the ontology frontmatter schema
   * and merges them with any author-provided frontmatter.
   * Tagged as "compiler-inferred" — never overwrites explicit values.
   */
  suggestedFrontmatter: Record<string, unknown>

  /**
   * Only set when action = 'skip'.
   * Used in the compilation report to explain why this source was skipped.
   */
  skipReason?: string

  /**
   * Confidence score in the entity classification [0, 1].
   * Plans below 0.5 are flagged in the compilation report for human review.
   */
  confidence: number
}

// ── Compilation plan ──────────────────────────────────────────────────────────

/**
 * The complete output of the Concept Extractor for one compilation run.
 * Contains all planned article creates/updates plus metadata about the run.
 */
export type CompilationPlan = {
  /** Total source files analyzed in this run */
  sourceCount: number

  /** Articles to create or update (excludes skipped) */
  articles: ArticlePlan[]

  /** Sources that were skipped with their reasons */
  skipped: Array<{ sourcePath: string; reason: string }>

  /**
   * Sources that need optional dependencies not currently installed.
   * (e.g., .html files when @mozilla/readability is not installed)
   */
  blockedByMissingDeps: Array<{ sourcePath: string; deps: string[] }>

  /** Timestamp of when this plan was created */
  createdAt: number
}

// ── Static analysis result ────────────────────────────────────────────────────

/**
 * The output of the static (non-LLM) analysis pass.
 * Computed before any LLM call to save tokens and provide context.
 */
export type StaticAnalysisResult = {
  /** Known entities mentioned in the source (from vocabulary scan) */
  entityMentions: Array<{
    canonicalTerm: string
    entityType?: string
    docId?: string
    count: number
  }>

  /** Registry entries that already have compiled articles for mentioned entities */
  registryMatches: Array<{
    docId: string
    canonicalTitle: string
    entityType: string
    confidence: number  // 0-1, based on title similarity + mention count
  }>

  /**
   * Entity type hint from directory convention.
   * e.g., raw/papers/ → 'research_paper', raw/tools/ → 'tool'
   */
  directoryHint?: string

  /**
   * Approximate token count of the source text.
   * Used to decide how much to truncate for the LLM prompt.
   */
  tokenEstimate: number
}
