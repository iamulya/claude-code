/**
 * Knowledge Synthesizer Types
 *
 * Defines the output types for the KnowledgeSynthesizer, which consumes
 * a CompilationPlan and produces compiled, frontmatter-validated markdown
 * articles in the compiled/ directory.
 */

import type { ArticleAction } from "../extractor/index.js";
import type { ConceptRegistryEntry } from "../../ontology/index.js";

// ── Progress events ───────────────────────────────────────────────────────────

/**
 * Emitted by the Synthesizer during a compilation run.
 * Used by the CLI to display real-time progress.
 */
export type SynthesisProgressEvent =
  | { type: "article:started"; docId: string; action: ArticleAction; title: string }
  | {
      type: "article:written";
      docId: string;
      action: ArticleAction;
      title: string;
      wordCount: number;
    }
  | { type: "article:failed"; docId: string; title: string; error: Error }
  | { type: "article:warning"; docId: string; title: string; message: string }
  | { type: "stub:created"; docId: string; title: string; entityType: string }
  | { type: "run:complete"; stats: SynthesisResult };

// ── Per-article result ────────────────────────────────────────────────────────

export type ArticleSynthesisResult = {
  /** The docId of this article (path relative to compiled/) */
  docId: string;
  /** Canonical article title */
  canonicalTitle: string;
  /** What was done */
  action: "created" | "updated" | "skipped" | "failed";
  /** Approximate word count of the written article */
  wordCount?: number;
  /** Absolute path to the written file */
  outputPath?: string;
  /** Error if action = 'failed' */
  error?: Error;
  /** Phase 1C: Registry entry for batch application after concurrent synthesis */
  registryEntry?: ConceptRegistryEntry;
  /** Phase 5C: Grounding validation score (0-1) */
  groundingScore?: number;
};

// ── Run-level result ──────────────────────────────────────────────────────────

export type SynthesisResult = {
  /** Articles created (new) */
  created: number;
  /** Articles updated (merged with new sources) */
  updated: number;
  /** Stub articles auto-created for candidate new concepts */
  stubsCreated: number;
  /** Articles that failed to synthesize */
  failed: number;
  /** Articles skipped by the differential engine (sources unchanged) */
  skipped: number;
  /** Per-article results */
  articles: ArticleSynthesisResult[];
  /** Total wall-clock time for the synthesis run */
  durationMs: number;
};

// ── Synthesis options ─────────────────────────────────────────────────────────

export type SynthesisOptions = {
  /**
   * Maximum number of articles to synthesize concurrently.
   * Higher = faster but uses more API quota. Default: 3.
   */
  concurrency?: number;

  /**
   * If true, don't write any files — return the plan + generated content
   * but don't touch the disk. Useful for previewing before a real run.
   */
  dryRun?: boolean;

  /**
   * Minimum confidence required to create a stub article for a
   * candidateNewConcept. Default: 0.7
   */
  stubConfidenceThreshold?: number;

  /**
   * Progress callback — called after each article is written.
   */
  onProgress?: (event: SynthesisProgressEvent) => void;

  /**
   * If true, skip synthesis for articles whose source files are older than
   * the current compiled article (based on mtime). Default: false.
   */
  incrementalMode?: boolean;

  /**
   * Set of article docIds to skip entirely (no LLM call, no disk write).
   * Used by the differential compiler to bypass clean (unchanged) articles.
   * Articles in this set are counted as `skipped` in SynthesisResult.
   */
  skipDocIds?: Set<string>;
};

// ── Frontmatter validation result ─────────────────────────────────────────────

export type FrontmatterValidationResult = {
  valid: boolean;
  /** All validated and coerced frontmatter values */
  values: Record<string, unknown>;
  /** Fields that failed validation */
  errors: Array<{ field: string; message: string }>;
  /** Fields that were missing but have defaults */
  warnings: Array<{ field: string; message: string }>;
};

// ── Parsed article ────────────────────────────────────────────────────────────

export type ParsedArticle = {
  /** YAML frontmatter as key-value pairs */
  frontmatter: Record<string, unknown>;
  /** Markdown body (everything after the frontmatter block) */
  body: string;
  /** Full raw markdown (frontmatter + body) */
  raw: string;
};
