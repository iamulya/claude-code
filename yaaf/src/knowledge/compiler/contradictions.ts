/**
 * Cross-Article Contradiction Detection (P4-3)
 *
 * Post-synthesis scan that detects potential contradictions between compiled
 * articles using heuristic methods (no LLM required):
 *
 *   1. **Negation contradictions** — High token overlap between two sentences,
 *      but one contains negation markers and the other doesn't.
 *   2. **Numeric disagreements** — Two articles making numeric claims about
 *      the same entity with different values (e.g., "introduced in 2017"
 *      vs "introduced in 2019").
 *   3. **Temporal conflicts** — Date/year references for the same concept
 *      that disagree across articles.
 *
 * This is a detection-only pass — it reports contradictions but doesn't
 * resolve them. Resolution is left to the human operator or an LLM-powered
 * heal pass.
 *
 * @module knowledge/compiler/contradictions
 */

import { readFile, readdir } from "fs/promises";
import { join, extname } from "path";
import { splitSentences } from "../utils/sentences.js";

// Note (T-2): We do NOT import the full NEGATION_PATTERN from groundingPlugin here.
// The grounding plugin's wide pattern (which includes contrastive phrases like
// "unlike", "rather than", "instead of") is correct for L1 claim escalation —
// any ambiguous phrasing warrants deeper checking.
// But the contradiction detector's `checkNegationContradiction()` uses
// ASYMMETRIC negation logic: (A has negation) XOR (B has negation) → contradiction.
// This only makes semantic sense for TRADITIONAL negation words (not, no, isn't, etc.)
// where one sentence affirms and the other explicitly denies the same thing.
// Contrastive connectives like "unlike" or "rather than" don't follow this XOR logic:
//   "BERT uses bidirectional attention, unlike GPT" (has "unlike")
//   "GPT is a unidirectional model" (no negation)
// → (true XOR false) = true → false positive contradiction.
// The fix: use only the traditional negation subset for contradiction detection.

// ── Types ────────────────────────────────────────────────────────────────────

export interface ContradictionPair {
  articleA: string;
  articleB: string;
  claimA: string;
  claimB: string;
  similarity: number;
  type: "negation" | "numeric_disagreement" | "temporal_conflict";
}

export interface ContradictionReport {
  pairs: ContradictionPair[];
  articlesScanned: number;
  claimsScanned: number;
  /** True if the scan was stopped early due to maxComparisons budget. */
  truncated: boolean;
}

export interface ContradictionOptions {
  /** Maximum number of articles to scan (default: 200) */
  maxArticles?: number;
  /** Minimum token overlap to consider sentences related (default: 0.5) */
  minOverlap?: number;
  /**
   * Maximum sentences extracted per article (default: 30).
   * Caps the per-article sentence fanout so a deeply-written article doesn't
   * cause O(n²×m²) blowup. Sentences are taken from the start of the article,
   * which is where the most salient factual claims appear.
   */
  maxSentencesPerArticle?: number;
  /**
   * Hard budget on total pairwise sentence comparisons (default: 50_000).
   * When exceeded, the scan stops early and a truncation warning is added.
   * This prevents compile stalls on large KBs regardless of article or
   * sentence counts.
   */
  maxComparisons?: number;
}

// ── Implementation ──────────────────────────────────────────────────────────

// T-2: CONTRADICTION_NEGATION_PATTERN — traditional negation words only.
// Contrastive connectives (unlike, rather than, etc.) are intentionally excluded
// here. See the import comment above for the full explanation.
// This pattern uses XOR semantics: if A has it and B doesn't (or vice versa),
// the sentences make contradictory factual claims about the same topic.
const CONTRADICTION_NEGATION_PATTERN =
  /\b(?:not|no|never|neither|nor|without|isn't|aren't|doesn't|don't|won't|can't|cannot|haven't|hasn't|hadn't|wasn't|weren't|couldn't|wouldn't|shouldn't)\b/i;
const YEAR_PATTERN = /\b((?:19|20)\d{2})\b/g;
const NUMBER_PATTERN = /\b(\d+(?:\.\d+)?)\s*(%|percent|million|billion|trillion|thousand|hundred)?\b/gi;

/**
 * Scan compiled articles for potential contradictions.
 */
export async function detectContradictions(
  compiledDir: string,
  options?: ContradictionOptions,
): Promise<ContradictionReport> {
  const maxArticles = options?.maxArticles ?? 200;
  const minOverlap = options?.minOverlap ?? 0.5;
  // C1: sentence and comparison budgets to prevent O(n²×m²) stalls
  const maxSentencesPerArticle = options?.maxSentencesPerArticle ?? 30;
  const maxComparisons = options?.maxComparisons ?? 50_000;

  // Load articles
  const articles = await loadArticles(compiledDir, maxArticles);

  const pairs: ContradictionPair[] = [];
  let claimsScanned = 0;
  let totalComparisons = 0;
  let truncated = false;

  // Extract claims from each article, capped at maxSentencesPerArticle
  const articleClaims: Array<{ docId: string; claims: string[] }> = [];
  for (const { docId, body } of articles) {
    const allClaims = extractSentences(body);
    // C1: cap sentence count to bound the inner loop fanout
    const claims = allClaims.slice(0, maxSentencesPerArticle);
    articleClaims.push({ docId, claims });
    claimsScanned += claims.length;
  }

  // Compare claims across articles pairwise, with total comparison budget
  outer:
  for (let i = 0; i < articleClaims.length; i++) {
    for (let j = i + 1; j < articleClaims.length; j++) {
      const a = articleClaims[i]!;
      const b = articleClaims[j]!;

      for (const claimA of a.claims) {
        for (const claimB of b.claims) {
          // C1: hard comparison budget — stop scanning when exhausted
          if (++totalComparisons > maxComparisons) {
            truncated = true;
            break outer;
          }

          const overlap = tokenOverlap(claimA, claimB);
          if (overlap < minOverlap) continue;

          // Check for negation contradiction
          const negation = checkNegationContradiction(claimA, claimB, overlap);
          if (negation) {
            pairs.push({
              articleA: a.docId,
              articleB: b.docId,
              claimA,
              claimB,
              similarity: overlap,
              type: "negation",
            });
            continue;
          }

          // Check for numeric disagreement
          const numeric = checkNumericDisagreement(claimA, claimB, overlap);
          if (numeric) {
            pairs.push({
              articleA: a.docId,
              articleB: b.docId,
              claimA,
              claimB,
              similarity: overlap,
              type: "numeric_disagreement",
            });
            continue;
          }

          // Check for temporal conflict
          const temporal = checkTemporalConflict(claimA, claimB, overlap);
          if (temporal) {
            pairs.push({
              articleA: a.docId,
              articleB: b.docId,
              claimA,
              claimB,
              similarity: overlap,
              type: "temporal_conflict",
            });
          }
        }
      }
    }
  }

  return {
    pairs,
    articlesScanned: articles.length,
    claimsScanned,
    truncated,
  };
}

// ── Internal helpers ────────────────────────────────────────────────────────

async function loadArticles(
  compiledDir: string,
  maxArticles: number,
): Promise<Array<{ docId: string; body: string }>> {
  // J-5: Collect all .md paths first, then read them concurrently.
  // The original implementation awaited each readFile() and each sub-directory
  // scan sequentially, replicating the unbounded pattern that store.ts already
  // fixed with pAllSettled(IO_CONCURRENCY). For a 200-article KB, sequential
  // reads block the post-compile contradiction pass unnecessarily.
  const mdPaths: Array<{ fullPath: string; docId: string }> = [];

  async function collectPaths(dir: string, prefix: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relName = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await collectPaths(fullPath, relName);
      } else if (extname(entry.name) === ".md") {
        mdPaths.push({ fullPath, docId: relName.replace(/\.md$/, "") });
      }
    }
  }

  await collectPaths(compiledDir, "");

  // Cap article count before reading (avoid reading more files than needed)
  const pathsToRead = mdPaths.slice(0, maxArticles);

  // Bounded-concurrent reads — mirrors store.ts IO_CONCURRENCY pattern
  const IO_CONCURRENCY = 64;
  const articles: Array<{ docId: string; body: string }> = [];

  // Simple bounded pool: process in chunks of IO_CONCURRENCY
  for (let i = 0; i < pathsToRead.length; i += IO_CONCURRENCY) {
    const batch = pathsToRead.slice(i, i + IO_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async ({ fullPath, docId }) => {
        const raw = await readFile(fullPath, "utf-8");
        const fmMatch = raw.replace(/\r\n/g, "\n").match(/^---\n[\s\S]*?\n---\n?([\s\S]*)$/);
        if (fmMatch) {
          return { docId, body: fmMatch[1]?.trim() ?? "" };
        }
        return null;
      }),
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value !== null) {
        articles.push(r.value);
      }
    }
  }

  return articles;
}

// 3.3 / 8.3 fix: use shared abbreviation-aware splitSentences from utils/sentences.ts
function extractSentences(text: string): string[] {
  return splitSentences(
    text
      .replace(/^#{1,6}\s.*/gm, "") // Remove headings
      .replace(/```[\s\S]*?```/g, "") // Remove code blocks
      .replace(/!\[.*?\]\(.*?\)/g, ""), // Remove image refs
  ).filter((s) => s.length > 20 && s.split(/\s+/).length >= 5);
}


function tokenize(text: string): Set<string> {
  const tokens = new Set<string>();
  for (const word of text.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/)) {
    if (word.length > 2) tokens.add(word);
  }
  return tokens;
}

function tokenOverlap(a: string, b: string): number {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection++;
  }
  return intersection / Math.min(tokensA.size, tokensB.size);
}

function checkNegationContradiction(a: string, b: string, overlap: number): boolean {
  if (overlap < 0.5) return false;
  // T-2: Use the narrow CONTRADICTION_NEGATION_PATTERN (traditional negation only).
  // The contrastive-aware NEGATION_PATTERN from groundingPlugin would cause false
  // positives here because the XOR logic doesn't work for connectives like "unlike".
  const aHasNeg = CONTRADICTION_NEGATION_PATTERN.test(a);
  const bHasNeg = CONTRADICTION_NEGATION_PATTERN.test(b);
  // One has negation and the other doesn't — potential contradiction
  return (aHasNeg && !bHasNeg) || (!aHasNeg && bHasNeg);
}

function checkNumericDisagreement(a: string, b: string, overlap: number): boolean {
  if (overlap < 0.5) return false;

  // H4: Extract numbers WITH their surrounding noun-phrase context.
  // The naive check flagged any differing number as a contradiction, but
  // "accuracy: 94.1%" vs "parameters: 175 billion" should NOT contradict.
  // Solution: require ≥50% overlap in the 3-word window around each number.
  const aContexts = extractNumberContexts(a);
  const bContexts = extractNumberContexts(b);

  if (aContexts.length === 0 || bContexts.length === 0) return false;

  // For each number pair: same subject-entity context + different number = disagreement
  for (const ctxA of aContexts) {
    for (const ctxB of bContexts) {
      // Numbers must be different
      if (ctxA.number === ctxB.number) continue;
      // Subject context must overlap significantly (≥50% shared context words)
      const contextOverlap = wordSetOverlap(ctxA.context, ctxB.context);
      if (contextOverlap >= 0.5) return true;
    }
  }
  return false;
}

/** Extract numbers and their surrounding 3-word context windows. */
function extractNumberContexts(text: string): Array<{ number: string; context: Set<string> }> {
  const results: Array<{ number: string; context: Set<string> }> = [];
  const words = text.toLowerCase().replace(/[^\w\s.%]/g, " ").split(/\s+/);

  for (let i = 0; i < words.length; i++) {
    const word = words[i]!;
    // Match numbers ≥ 2 digits or decimals
    if (/^\d{2,}$|^\d+\.\d+$/.test(word)) {
      const context = new Set<string>();
      // 3-word window on each side
      for (let j = Math.max(0, i - 3); j <= Math.min(words.length - 1, i + 3); j++) {
        if (j === i) continue;
        const w = words[j]!;
        if (w.length > 2 && !/^\d/.test(w)) context.add(w);
      }
      results.push({ number: word, context });
    }
  }
  return results;
}

/** Compute overlap ratio between two word sets. */
function wordSetOverlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const w of a) {
    if (b.has(w)) intersection++;
  }
  return intersection / Math.min(a.size, b.size);
}


/**
 * 5.3 fix: checkTemporalConflict with verb-context windowing.
 *
 * Old behaviour: fire if two high-overlap sentences have ANY different year.
 * False positive: "released in 2017" vs "updated in 2021" — different events.
 *
 * New behaviour: apply the same 3-word context window used in checkNumericDisagreement.
 * Two year references only conflict if they appear in the SAME verb-phrase context
 * (the 3 words either side of the year overlap ≥50%).
 *
 * "introduced in 2017" vs "introduced in 2019" → same context ("introduced in") → conflict ✓
 * "released in 2017" vs "updated in 2021" → different context → no conflict ✓
 */
function checkTemporalConflict(a: string, b: string, overlap: number): boolean {
  if (overlap < 0.5) return false;

  const aCtx = extractYearContexts(a);
  const bCtx = extractYearContexts(b);

  if (aCtx.length === 0 || bCtx.length === 0) return false;

  for (const ca of aCtx) {
    for (const cb of bCtx) {
      // Years must be different (same year = no conflict)
      if (ca.year === cb.year) continue;
      // Context must overlap significantly — same verb/event frame
      const contextOverlap = wordSetOverlap(ca.context, cb.context);
      if (contextOverlap >= 0.5) return true;
    }
  }
  return false;
}

/** Extract years and their surrounding 3-word verb-phrase context windows. */
function extractYearContexts(text: string): Array<{ year: string; context: Set<string> }> {
  const results: Array<{ year: string; context: Set<string> }> = [];
  const words = text.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/);

  for (let i = 0; i < words.length; i++) {
    const word = words[i]!;
    if (/^(?:19|20)\d{2}$/.test(word)) {
      const context = new Set<string>();
      for (let j = Math.max(0, i - 3); j <= Math.min(words.length - 1, i + 3); j++) {
        if (j === i) continue;
        const w = words[j]!;
        // Include substantive words (not digits, not single chars)
        if (w.length > 2 && !/^\d/.test(w)) context.add(w);
      }
      results.push({ year: word, context });
    }
  }
  return results;
}
