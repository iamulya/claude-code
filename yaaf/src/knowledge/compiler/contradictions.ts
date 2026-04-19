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
  const articles: Array<{ docId: string; body: string }> = [];

  async function scanDir(dir: string, prefix: string): Promise<void> {
    if (articles.length >= maxArticles) return;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (articles.length >= maxArticles) break;
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        await scanDir(fullPath, prefix ? `${prefix}/${entry.name}` : entry.name);
      } else if (extname(entry.name) === ".md") {
        try {
          const raw = await readFile(fullPath, "utf-8");
          const fmMatch = raw.replace(/\r\n/g, "\n").match(/^---\n[\s\S]*?\n---\n?([\s\S]*)$/);
          if (fmMatch) {
            const docId = (prefix ? `${prefix}/${entry.name}` : entry.name).replace(/\.md$/, "");
            articles.push({ docId, body: fmMatch[1]?.trim() ?? "" });
          }
        } catch {
          // Skip unreadable files
        }
      }
    }
  }

  await scanDir(compiledDir, "");
  return articles;
}

function extractSentences(text: string): string[] {
  return text
    .replace(/^#{1,6}\s.*/gm, "") // Remove headings
    .replace(/```[\s\S]*?```/g, "") // Remove code blocks
    .replace(/!\[.*?\]\(.*?\)/g, "") // Remove image refs
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && s.split(/\s+/).length >= 5);
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

  const aNumbers: string[] = [];
  const bNumbers: string[] = [];
  let m;

  NUMBER_PATTERN.lastIndex = 0;
  while ((m = NUMBER_PATTERN.exec(a))) aNumbers.push(m[1]!);
  NUMBER_PATTERN.lastIndex = 0;
  while ((m = NUMBER_PATTERN.exec(b))) bNumbers.push(m[1]!);

  // If both have numbers and they're different → possible disagreement
  if (aNumbers.length > 0 && bNumbers.length > 0) {
    const aSet = new Set(aNumbers);
    const bSet = new Set(bNumbers);
    // At least one number in B that isn't in A (and they have overlapping text)
    for (const n of bSet) {
      if (!aSet.has(n)) return true;
    }
  }
  return false;
}

function checkTemporalConflict(a: string, b: string, overlap: number): boolean {
  if (overlap < 0.5) return false;

  const aYears: string[] = [];
  const bYears: string[] = [];
  let m;

  YEAR_PATTERN.lastIndex = 0;
  while ((m = YEAR_PATTERN.exec(a))) aYears.push(m[1]!);
  YEAR_PATTERN.lastIndex = 0;
  while ((m = YEAR_PATTERN.exec(b))) bYears.push(m[1]!);

  // If both reference years and they're different → temporal conflict
  if (aYears.length > 0 && bYears.length > 0) {
    const aSet = new Set(aYears);
    const bSet = new Set(bYears);
    for (const year of bSet) {
      if (!aSet.has(year)) return true;
    }
  }
  return false;
}
