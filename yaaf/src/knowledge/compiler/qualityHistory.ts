/**
 * Compile Quality History — W-22 Fix
 *
 * Append-only JSONL log of compile quality metrics. After each compile,
 * a single-line JSON record is appended to `.kb-quality-history.jsonl`.
 *
 * This enables:
 * - "Did grounding improve after adding L2 embeddings?" → compare meanScore
 * - "Are lint errors trending up?" → plot lint.errors over time
 * - CI gates: reject compiles where grounding drops by >5%
 *
 * Design:
 * - JSONL (one JSON object per line) for append-only writes
 * - No schema migration needed — fields can be added without breaking readers
 * - Zero runtime cost — only runs at compile end
 */

import { readFile, appendFile } from "fs/promises";
import { join } from "path";
import { atomicWriteFile } from "./atomicWrite.js";
import type { CompileResult } from "./compiler.js";

// ── Types ────────────────────────────────────────────────────────────────────

export type CompileQualityRecord = {
  /** ISO timestamp of this compile */
  compiledAt: string;
  /** Compile duration in ms */
  durationMs: number;
  /** Articles compiled (created + updated) */
  articlesCompiled: number;
  /** Articles skipped (clean / differential) */
  articlesSkipped: number;
  /** Stubs auto-created */
  stubsCreated: number;
  /** Articles that failed synthesis */
  articlesFailed: number;

  /** Grounding summary (absent if grounding was disabled) */
  grounding?: {
    articlesVerified: number;
    articlesPassed: number;
    articlesFailed: number;
    meanScore: number;
    minScore: number;
  };

  /** Lint summary (absent if linting was disabled) */
  lint?: {
    totalIssues: number;
    errors: number;
    warnings: number;
    /** Top 5 most frequent lint codes */
    topCodes: Array<{ code: string; count: number }>;
  };

  /** KB size snapshot */
  size: {
    totalArticles: number;
    totalSources: number;
  };
};

export type QualityDelta = {
  /** Previous vs current grounding score change */
  groundingScoreDelta: number | null;
  /** Previous vs current lint error change */
  lintErrorDelta: number | null;
  /** Net articles added */
  articlesAdded: number;
  /** Human-readable regressions detected */
  regressions: string[];
  /** Human-readable improvements detected */
  improvements: string[];
};

// ── Build record from CompileResult ──────────────────────────────────────────

export function buildQualityRecord(result: CompileResult): CompileQualityRecord {
  const record: CompileQualityRecord = {
    compiledAt: new Date().toISOString(),
    durationMs: result.durationMs,
    articlesCompiled: result.synthesis.created + result.synthesis.updated,
    articlesSkipped: result.synthesis.skipped,
    stubsCreated: result.synthesis.stubsCreated,
    articlesFailed: result.synthesis.failed,
    size: {
      totalArticles:
        result.synthesis.created +
        result.synthesis.updated +
        result.synthesis.skipped +
        result.synthesis.stubsCreated,
      totalSources: result.sourcesIngested,
    },
  };

  // Grounding summary
  if (result.grounding) {
    const scores = result.grounding.perArticle.map((a) => a.score);
    record.grounding = {
      articlesVerified: result.grounding.articlesVerified,
      articlesPassed: result.grounding.articlesPassed,
      articlesFailed: result.grounding.articlesFailed,
      meanScore: result.grounding.averageScore,
      minScore: scores.length > 0 ? Math.min(...scores) : 0,
    };
  }

  // Lint summary
  if (result.lint) {
    // Count by code to find top codes
    const codeCounts = new Map<string, number>();
    for (const issue of result.lint.issues) {
      codeCounts.set(issue.code, (codeCounts.get(issue.code) ?? 0) + 1);
    }
    const topCodes = [...codeCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([code, count]) => ({ code, count }));

    record.lint = {
      totalIssues: result.lint.issues.length,
      errors: result.lint.issues.filter((i) => i.severity === "error").length,
      warnings: result.lint.issues.filter((i) => i.severity === "warning").length,
      topCodes,
    };
  }

  return record;
}

// ── Append to history ────────────────────────────────────────────────────────

const HISTORY_FILENAME = ".kb-quality-history.jsonl";

/**
 * Append a quality record to the JSONL history file.
 * Creates the file if it doesn't exist. Append-only — never overwrites.
 */
export async function appendQualityRecord(
  kbDir: string,
  record: CompileQualityRecord,
): Promise<void> {
  const path = join(kbDir, HISTORY_FILENAME);
  const line = JSON.stringify(record) + "\n";
  await appendFile(path, line, "utf-8");
}

// ── Load history ─────────────────────────────────────────────────────────────

/**
 * Read all quality records from the history file.
 * Returns empty array if the file doesn't exist.
 */
export async function loadQualityHistory(kbDir: string): Promise<CompileQualityRecord[]> {
  const path = join(kbDir, HISTORY_FILENAME);
  try {
    const content = await readFile(path, "utf-8");
    return content
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        try {
          return JSON.parse(line) as CompileQualityRecord;
        } catch {
          return null;
        }
      })
      .filter((r): r is CompileQualityRecord => r !== null);
  } catch {
    return []; // file doesn't exist yet
  }
}

// ── Compare compiles ─────────────────────────────────────────────────────────

/**
 * Compare two compile quality records and detect regressions/improvements.
 */
export function compareCompiles(
  prev: CompileQualityRecord,
  curr: CompileQualityRecord,
): QualityDelta {
  const regressions: string[] = [];
  const improvements: string[] = [];

  // Grounding comparison
  let groundingScoreDelta: number | null = null;
  if (prev.grounding && curr.grounding) {
    groundingScoreDelta = curr.grounding.meanScore - prev.grounding.meanScore;
    if (groundingScoreDelta < -0.05) {
      regressions.push(
        `Grounding score decreased: ${prev.grounding.meanScore.toFixed(2)} → ${curr.grounding.meanScore.toFixed(2)} ` +
          `(Δ${groundingScoreDelta.toFixed(2)})`,
      );
    } else if (groundingScoreDelta > 0.05) {
      improvements.push(
        `Grounding score improved: ${prev.grounding.meanScore.toFixed(2)} → ${curr.grounding.meanScore.toFixed(2)} ` +
          `(+${groundingScoreDelta.toFixed(2)})`,
      );
    }
  }

  // Lint comparison
  let lintErrorDelta: number | null = null;
  if (prev.lint && curr.lint) {
    lintErrorDelta = curr.lint.errors - prev.lint.errors;
    if (lintErrorDelta > 0) {
      regressions.push(
        `Lint errors increased: ${prev.lint.errors} → ${curr.lint.errors} (+${lintErrorDelta})`,
      );
    } else if (lintErrorDelta < 0) {
      improvements.push(
        `Lint errors decreased: ${prev.lint.errors} → ${curr.lint.errors} (${lintErrorDelta})`,
      );
    }
  }

  return {
    groundingScoreDelta,
    lintErrorDelta,
    articlesAdded: curr.size.totalArticles - prev.size.totalArticles,
    regressions,
    improvements,
  };
}
