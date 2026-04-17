/**
 * KB Linter Types
 *
 * Defines the complete type model for lint issues, reports, and auto-fixes.
 * The linter is the "self-healing" component Karpathy describes — it scans
 * the compiled KB and produces a structured list of issues that can be fixed
 * automatically or flagged for human review.
 */

// ── Lint codes ────────────────────────────────────────────────────────────────

/**
 * Every lint issue has a code that identifies the class of problem.
 * Codes follow the pattern: NOUN_VERB or ADJECTIVE_NOUN.
 */
export type LintCode =
  // ── Structural issues (error severity) ────────────────────────────
  | "BROKEN_WIKILINK" // [[Target]] not found in registry
  | "MISSING_REQUIRED_FIELD" // Required frontmatter field absent
  | "UNKNOWN_ENTITY_TYPE" // entity_type not in ontology
  | "MISSING_ENTITY_TYPE" // entity_type frontmatter field missing altogether
  | "INVALID_FIELD_VALUE" // Enum violation, type mismatch, etc.
  // ── Linking issues (warning severity) ─────────────────────────────
  | "ORPHANED_ARTICLE" // No other article links to this one
  | "NON_CANONICAL_WIKILINK" // [[alias]] used instead of [[canonical term]]
  | "UNLINKED_MENTION" // Known KB entity mentioned in text without [[wikilink]]
  | "MISSING_RECIPROCAL_LINK" // Article A → B but B doesn't → A (for reciprocal relationships)
  // ── Quality issues (info/warning severity) ─────────────────────────
  | "STUB_WITH_SOURCES" // Stub article can be expanded (sources cover it)
  | "LOW_ARTICLE_QUALITY" // Article body is very short and not marked as stub
  | "BROKEN_SOURCE_REF" // compiled_from path doesn't exist on disk
  | "DUPLICATE_CANDIDATE" // Two articles have very similar titles
  | "CONTRADICTORY_CLAIMS" // Articles make contradictory claims about the same entity
  // ── Plugin-defined rules ────────────────────────────────────────────
  // Plugin rules use the pattern `PLUGIN_<RuleId>` so they can be filtered separately.
  | `PLUGIN_${string}`;

// ── Severity ──────────────────────────────────────────────────────────────────

export type LintSeverity = "error" | "warning" | "info";

// ── Single issue ──────────────────────────────────────────────────────────────

export type LintIssue = {
  /** Classification of this issue */
  code: LintCode;

  /** Human-readable description of the specific problem */
  message: string;

  severity: LintSeverity;

  /** The docId of the article that has this issue */
  docId: string;

  /** Frontmatter field name (for MISSING_REQUIRED_FIELD, INVALID_FIELD_VALUE) */
  field?: string;

  /**
   * For link issues: the target docId or wikilink text involved.
   * For BROKEN_WIKILINK: the target that couldn't be resolved.
   * For ORPHANED_ARTICLE: undefined.
   * For NON_CANONICAL_WIKILINK: the canonical docId.
   * For MISSING_RECIPROCAL_LINK: the docId that should link back.
   */
  relatedTarget?: string;

  /** What to do to fix this issue */
  suggestion?: string;

  /**
   * Whether this issue can be fixed automatically by `KBLinter.fix()`.
   * Auto-fixable issues:
   * - NON_CANONICAL_WIKILINK → rewrite to canonical form
   * - UNLINKED_MENTION → add [[wikilink]] to first occurrence
   * - MISSING_REQUIRED_FIELD with a default value → apply default
   *
   * Non-auto-fixable (require human or re-compilation):
   * - BROKEN_WIKILINK → need to decide what to link to or remove the link
   * - STUB_WITH_SOURCES → trigger a synthesis pass
   * - DUPLICATE_CANDIDATE → human decision on which to keep/merge
   */
  autoFixable: boolean;

  /**
   * For UNLINKED_MENTION and NON_CANONICAL_WIKILINK:
   * The exact text to find in the article and its replacement.
   * Used by the auto-fixer to apply the change without re-parsing.
   */
  fix?: {
    findText: string;
    replaceWith: string;
    /** Only replace the first occurrence (true for UNLINKED_MENTION) */
    firstOccurrenceOnly: boolean;
  };
};

// ── Link graph ────────────────────────────────────────────────────────────────

/** Bidirectional wikilink graph for the compiled KB */
export type LinkGraph = Map<
  string,
  {
    outgoing: Set<string>; // docIds this article links to
    incoming: Set<string>; // docIds that link to this article
  }
>;

// ── Lint report ────────────────────────────────────────────────────────────────

export type LintReport = {
  /** Timestamp when this report was generated */
  generatedAt: number;

  /** Number of compiled articles scanned */
  articlesChecked: number;

  /** All detected issues */
  issues: LintIssue[];

  /** Aggregated stats */
  summary: {
    errors: number;
    warnings: number;
    info: number;
    autoFixable: number;
    byCode: Partial<Record<LintCode, number>>;
  };
};

// ── Lint options ──────────────────────────────────────────────────────────────

export type LintOptions = {
  /**
   * Whether to run LLM-based semantic checks (slower, more expensive).
   * Default: false (static checks only)
   */
  includeSemantic?: boolean;

  /**
   * Minimum word count below which a non-stub article is flagged as
   * LOW_ARTICLE_QUALITY. Default: 50.
   */
  minArticleWordCount?: number;

  /**
   * Maximum Levenshtein distance ratio for DUPLICATE_CANDIDATE detection.
   * 0 = identical titles only, 0.2 = slightly different titles.
   * Default: 0.15
   */
  duplicateSimilarityThreshold?: number;

  /**
   * DocIds to skip (e.g., canonical list of known-good articles).
   */
  skipDocIds?: string[];

  /**
   * Phase 4C: How many mentions to wikilink per article.
   * 'first' = only the first occurrence (wiki convention)
   * 'all' = all occurrences
   * Default: 'first'
   */
  unlinkedMentionStrategy?: "first" | "all";
};

// ── Auto-fix result ───────────────────────────────────────────────────────────

export type FixedIssue = {
  docId: string;
  code: LintCode;
  description: string;
};

export type AutoFixResult = {
  fixedCount: number;
  fixed: FixedIssue[];
  skipped: Array<{ issue: LintIssue; reason: string }>;
};
