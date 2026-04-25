/**
 * Ontology Type System
 *
 * The ontology is the domain model that drives the entire KB compilation pipeline.
 * Without it, the Knowledge Synthesizer has no understanding of:
 * - What entity types exist in this domain
 * - What relationships are valid between them
 * - What frontmatter fields are required/optional per entity type
 * - What the canonical vocabulary is (and what aliases map to what)
 * - What article structure each entity type should have
 *
 * The ontology is loaded from `ontology.yaml` at the root of the KB directory.
 * It is a hard prerequisite for compilation — the compiler will not run without it.
 */

// ── Primitive field types ────────────────────────────────────────────────────

/**
 * Scalar types allowed in frontmatter fields.
 * - `entity_ref` means the value must be the docId of a compiled KB article
 * - `url` is validated to be a parseable URL
 */
export type FieldType =
  | "string"
  | "string[]"
  | "number"
  | "boolean"
  | "url"
  | "url[]"
  | "enum"
  | "enum[]"
  | "entity_ref"
  | "entity_ref[]"
  | "date";

// ── Frontmatter schema ───────────────────────────────────────────────────────

/** Definition of a single frontmatter field within an entity type schema */
export type FrontmatterFieldSchema = {
  /** Human-readable description of what this field represents */
  description: string;
  /** The value type for this field */
  type: FieldType;
  /** Whether the compiler must produce a value for this field */
  required: boolean;
  /**
   * Lint severity when a required field is missing.
   *
   * - `'error'` (default for required fields) — The KB is broken without this
   *   field. Only use for fields that are structurally necessary (title,
   *   entity_type).
   *
   * - `'warning'` — The KB degrades without this field but still functions.
   *   Use for quality fields that the LLM may not always produce (summary,
   *   export_name, source_file, category).
   *
   * Ignored when `required` is false.
   */
  missing_severity?: "error" | "warning";
  /**
   * Allowed values when type is 'enum' or 'enum[]'.
   * The compiler will reject values not in this list.
   */
  enum?: string[];
  /**
   * When type is 'entity_ref' or 'entity_ref[]':
   * the entity type that the referenced doc must be classified as.
   * If omitted, any entity type is accepted.
   */
  targetEntityType?: string;
  /**
   * Default value used by the compiler when the field is required but absent
   * and cannot be inferred. String representation (e.g., "[]" for empty arrays).
   */
  default?: string;
};

/** Complete frontmatter schema for one entity type */
export type FrontmatterSchema = {
  /** All field definitions for this entity type, keyed by field name */
  fields: Record<string, FrontmatterFieldSchema>;
};

// ── Article structure ────────────────────────────────────────────────────────

/**
 * Describes an H2 section that should appear in compiled articles of this entity type.
 * The Knowledge Synthesizer uses these to scaffold the article structure.
 */
export type ArticleSection = {
  /** The H2 heading text (e.g., "Key Concepts", "How It Works") */
  heading: string;
  /** What content should go in this section — fed to the synthesizer as guidance */
  description: string;
  /** If true, the linter emits a warning when this section is absent */
  required: boolean;
};

// ── Entity type ──────────────────────────────────────────────────────────────

/**
 * Defines one category of knowledge entity in the domain.
 *
 * Supports **entity type inheritance** via the `extends` field. A child type
 * inherits all frontmatter fields and article structure sections from the parent,
 * then adds or overrides its own. Use underscore-prefixed names (e.g., `_base`)
 * for abstract types that should not be instantiated as articles.
 *
 * @example
 * ```yaml
 * entity_types:
 *   _base:  # Abstract base — not instantiated
 *     description: Shared fields for all entity types
 *     frontmatter:
 *       fields:
 *         title: { type: string, required: true }
 *         summary: { type: string, required: true }
 *   research_paper:
 *     extends: _base  # Inherits title + summary fields
 *     description: A published academic paper or preprint
 *     frontmatter:
 *       fields:
 *         authors: { type: string[], required: true }
 *         year: { type: number, required: true }
 *     article_structure:
 *       - heading: Summary
 *         description: 2-3 sentence abstract in plain language
 *         required: true
 *     linkable_to: [concept, tool, dataset]
 * ```
 */
export type EntityTypeSchema = {
  /** Human-readable description — fed to the LLM during compilation and linting */
  description: string;
  /**
   * Optional: parent entity type to inherit fields and structure from.
   * The parent must be defined in the same ontology. Use `_base` convention
   * for abstract base types that should not produce articles.
   *
   * Inheritance rules:
   * - Frontmatter fields are merged (child overrides parent on collision)
   * - Article structure sections are concatenated (parent first, then child)
   * - linkableTo is union of parent + child
   * - description is NOT inherited (always required on the child)
   */
  extends?: string;
  /** Frontmatter schema for articles of this entity type */
  frontmatter: FrontmatterSchema;
  /**
   * Ordered list of H2 sections the synthesizer should produce.
   * The synthesizer respects this order.
   */
  articleStructure: ArticleSection[];
  /**
   * Which other entity types this entity type may link to via [[wikilinks]].
   * An empty array means no type restriction (any entity type is linkable).
   * Used by the linter to flag semantically invalid cross-links.
   */
  linkableTo: string[];
  /**
   * Whether articles of this type should appear in the llms.txt index.
   * Default: true. Set false for internal/stub-only types.
   */
  indexable?: boolean;

  /**
   * 1.1: Optional freshness TTL in days for articles of this entity type.
   *
   * When set, the compiler writes `expires_at` into every compiled article's
   * frontmatter (`compiled_at + freshness_ttl_days`). The KB tools
   * (`fetch_kb_document`, `search_kb`) then annotate results that have
   * passed their expiry with a `[STALE: compiled N days ago]` prefix so
   * the agent knows the content may be out of date.
   *
   * Omit (or set to 0) to disable staleness tracking for this entity type.
   *
   * @example
   * ```yaml
   * entity_types:
   *   best_practice:
   *     freshness_ttl_days: 90   # warn after 3 months
   *   research_paper:
   *     freshness_ttl_days: 0    # papers don't expire
   * ```
   */
  freshness_ttl_days?: number;
};

// ── Relationship types ───────────────────────────────────────────────────────

/**
 * Defines a named, directed relationship between two entity types.
 * Used by the Knowledge Synthesizer to write precise [[wikilinks]]
 * and by the linter to validate relationship semantics.
 *
 * @example
 * ```yaml
 * relationship_types:
 * - name: IMPLEMENTS
 * from: tool
 * to: concept
 * description: A tool that provides an implementation of a concept
 * reciprocal: IMPLEMENTED_BY
 * ```
 */
export type RelationshipType = {
  /** Canonical name in SCREAMING_SNAKE_CASE (e.g., "IS_IMPLEMENTED_BY") */
  name: string;
  /** Source entity type */
  from: string;
  /** Target entity type */
  to: string;
  /** Human-readable description fed to synthesizer and linter */
  description: string;
  /**
   * The inverse relationship name, if one exists.
   * When the linker adds edge A→B via `name`, it also adds B→A via `reciprocal`.
   */
  reciprocal?: string;
};

// ── Vocabulary ───────────────────────────────────────────────────────────────

/**
 * A vocabulary entry maps a canonical term to a list of aliases.
 * The Concept Extractor and compilation pipeline use this to:
 * 1. Normalize text: replace aliases with canonical terms
 * 2. Detect when a source document discusses a known entity
 * 3. Resolve ambiguous [[wikilinks]] to canonical article titles
 *
 * @example
 * ```yaml
 * vocabulary:
 * attention mechanism:
 * aliases:
 * - self-attention
 * - scaled dot-product attention
 * - multi-head attention
 * entity_type: concept # optional: which entity type this term maps to
 * doc_id: concepts/attention-mechanism # optional: compiled article path
 * ```
 */
export type VocabularyEntry = {
  /** All alternative names that resolve to this canonical term */
  aliases: string[];
  /** Optional: the entity type this term is classified as */
  entityType?: string;
  /**
   * Optional: the relative path to the compiled article for this term
   * (relative to the `compiled/` directory, without `.md` extension).
   * Set automatically by the compiler when an article is created.
   */
  docId?: string;
};

// ── Knowledge Base config ────────────────────────────────────────────────────

/**
 * Token budget configuration for the KB runtime.
 * Controls how much context space compiled documents may consume.
 */
export type KBBudgetConfig = {
  /** Maximum tokens for a compiled text document. Default: 4096 */
  textDocumentTokens: number;
  /** Maximum vision tokens for images injected per fetch call. Default: 1200 */
  imageTokens: number;
  /** Maximum number of images returned per fetch_kb_document call. Default: 3 */
  maxImagesPerFetch: number;
};

/**
 * Model configuration for the KB compiler.
 * Each model role can be set independently; all default to the agent model.
 */
export type KBCompilerModelConfig = {
  /**
   * Used for: Concept Extractor, Frontmatter Generator, image alt/caption pass.
   * Should be a fast, cheap model (flash/mini tier).
   */
  extractionModel?: string;
  /**
   * Used for: Knowledge Synthesizer — the LLM authoring step.
   * Should be your best available model (pro tier).
   */
  synthesisModel?: string;
  /**
   * Used for: Linter consistency/gap/discovery passes.
   * Should be a capable reasoning model (pro tier).
   */
  analysisModel?: string;
  /**
   * Used for: generating alt text and captions for unlabeled images.
   * Must support vision. Defaults to extractionModel.
   */
  visionModel?: string;
};

// ── Top-level ontology ───────────────────────────────────────────────────────

/**
 * The complete ontology document loaded from `ontology.yaml`.
 *
 * This is the schema that the compiler, linker, and linter all operate against.
 * It MUST be reviewed and committed by a human before compilation begins.
 *
 * @example ontology.yaml
 * ```yaml
 * domain: TypeScript agent framework documentation
 *
 * entity_types:
 * concept:
 * description: A core idea or abstraction in the domain
 * ...
 * tool:
 * description: A callable function exposed to the LLM
 * ...
 *
 * relationship_types:
 * - name: BELONGS_TO
 * from: tool
 * to: agent
 * ...
 *
 * vocabulary:
 * tool call:
 * aliases: [function call, tool invocation]
 *
 * compiler:
 * extractionModel: gemini-2.5-flash
 * synthesisModel: gemini-2.5-pro
 * analysisModel: gemini-2.5-pro
 * ```
 */
export type KBOntology = {
  /**
   * Plain-language description of the knowledge domain.
   * Fed verbatim to the Knowledge Synthesizer's system prompt.
   * @example "Large language model research, architectures, and tooling"
   */
  domain: string;

  /**
   * All entity types recognized in this domain.
   * Keys are the entity type identifiers used in frontmatter and wikilinks.
   * Types prefixed with `_` are abstract bases (not instantiated as articles).
   */
  entityTypes: Record<string, EntityTypeSchema>;

  /**
   * Directed relationship types between entity types.
   * The synthesizer uses these to write typed wikilinks.
   */
  relationshipTypes: RelationshipType[];

  /**
   * Canonical vocabulary: canonical term → aliases + optional article mapping.
   * Keys are lowercase canonical terms.
   */
  vocabulary: Record<string, VocabularyEntry>;

  /** Token budgets for compiled documents and runtime injection */
  budget: KBBudgetConfig;

  /** Compiler model assignments */
  compiler: KBCompilerModelConfig;

  /**
   * Schema validation mode for the linter.
   *
   * - `'strict'` (default) — All required fields and sections must be present.
   *   Missing required fields produce `error`-level lint issues.
   *
   * - `'progressive'` — New required fields are treated as `info`-level
   *   suggestions instead of errors, giving existing articles a grace period
   *   to be updated. The linter tracks which articles are "conforming" vs
   *   "legacy" and suggests targeted re-synthesis. Article structure changes
   *   are additive-only (missing sections are warnings, not errors).
   *
   * Progressive mode is recommended for evolving KBs where you want to
   * add schema constraints gradually without breaking existing articles.
   */
  schemaMode?: "strict" | "progressive";
};

// ── Concept registry ─────────────────────────────────────────────────────────

/**
 * A live registry of all concepts that have compiled articles.
 * Built from the compiled/ directory and kept in memory during compilation.
 * Used by the Concept Extractor to match source text to known entities.
 */
export type ConceptRegistryEntry = {
  /** Relative path from compiled/ root, without .md extension */
  docId: string;
  /** Canonical article title */
  canonicalTitle: string;
  /** Entity type */
  entityType: string;
  /** All names by which this entity can be referenced (title + vocabulary aliases) */
  aliases: string[];
  /** When this article was last compiled (Unix ms) */
  compiledAt: number;
  /** Whether this is a stub article (written by linter gap detection) */
  isStub: boolean;
};

/** The in-memory concept registry indexed by docId */
export type ConceptRegistry = Map<string, ConceptRegistryEntry>;

// ── Validation result ────────────────────────────────────────────────────────

export type OntologyValidationIssue = {
  severity: "error" | "warning";
  path: string; // e.g., "entityTypes.concept.frontmatter.fields.year"
  message: string;
};

export type OntologyValidationResult = {
  valid: boolean;
  issues: OntologyValidationIssue[];
};
