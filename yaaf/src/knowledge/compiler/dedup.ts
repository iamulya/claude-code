/**
 * Semantic Deduplication — Post-Extraction Plan Merging (P4-1)
 *
 * Detects near-duplicate article plans after extraction and merges them
 * before they reach synthesis. This prevents:
 *   1. Redundant LLM calls for near-identical topics
 *   2. Duplicate compiled articles with slightly different titles
 *   3. Source material fragmentation across articles
 *
 * Uses two zero-cost heuristics (no LLM required):
 *   - Jaccard similarity on tokenized, lowercased titles
 *   - Source path overlap ratio (how many source files are shared)
 *
 * @module knowledge/compiler/dedup
 */

import type { ArticlePlan } from "./extractor/index.js";

// ── Types ────────────────────────────────────────────────────────────────────

export interface DedupResult {
  /** Surviving plans after deduplication */
  merged: ArticlePlan[];
  /** Plans that were absorbed into survivors */
  removed: Array<{ docId: string; mergedInto: string; similarity: number }>;
}

// ── Implementation ──────────────────────────────────────────────────────────

/**
 * Detect and merge near-duplicate article plans using title similarity
 * and source path overlap.
 *
 * @param plans - Article plans from the extractor
 * @param threshold - Minimum combined similarity to merge (default: 0.7)
 * @returns Deduplicated plans and a record of merges
 */
export function deduplicatePlans(
  plans: ArticlePlan[],
  threshold: number = 0.7,
): DedupResult {
  if (plans.length <= 1) return { merged: [...plans], removed: [] };

  // D-3: Sort plans by docId before the greedy pass.
  // The greedy algorithm is order-dependent: plans[i] wins the survivor role
  // for the cluster, so different orderings produce different merged sets.
  // Sorting by docId guarantees that the same source content always produces
  // the same compiled plan set regardless of filesystem scan order or OS.
  const sortedPlans = [...plans].sort((a, b) => a.docId.localeCompare(b.docId));

  const merged: ArticlePlan[] = [];
  const removed: DedupResult["removed"] = [];
  const consumed = new Set<number>();

  for (let i = 0; i < sortedPlans.length; i++) {
    if (consumed.has(i)) continue;
    let survivor = sortedPlans[i]!;
    // R3-8: Cache survivor title tokenization — title doesn't change during merges
    const survivorTokens = tokenize(survivor.canonicalTitle);

    for (let j = i + 1; j < sortedPlans.length; j++) {
      if (consumed.has(j)) continue;
      const candidate = sortedPlans[j]!;

      const titleSim = jaccardSimilarity(
        survivorTokens,
        tokenize(candidate.canonicalTitle),
      );
      const sourceSim = sourceOverlap(
        survivor.sourcePaths ?? [],
        candidate.sourcePaths ?? [],
      );
      const combined = 0.6 * titleSim + 0.4 * sourceSim;

      if (combined >= threshold) {
        // Merge candidate into survivor — survivor keeps its docId/title
        survivor = mergePlans(survivor, candidate);
        consumed.add(j);
        removed.push({
          docId: candidate.docId,
          mergedInto: survivor.docId,
          similarity: combined,
        });
      }
    }

    merged.push(survivor);
  }

  return { merged, removed };
}

// ── Internal helpers ────────────────────────────────────────────────────────

/** Tokenize a string into lowercased words for comparison */
function tokenize(text: string): Set<string> {
  const tokens = new Set<string>();
  for (const word of text.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/)) {
    if (word.length > 1) tokens.add(word);
  }
  return tokens;
}

/** Jaccard similarity between two token sets: |A∩B| / |A∪B| */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Source path overlap ratio: |shared paths| / max(|A|, |B|) */
function sourceOverlap(pathsA: string[], pathsB: string[]): number {
  if (pathsA.length === 0 && pathsB.length === 0) return 0;
  const setB = new Set(pathsB);
  let shared = 0;
  for (const p of pathsA) {
    if (setB.has(p)) shared++;
  }
  return shared / Math.max(pathsA.length, pathsB.length);
}

/** Merge two article plans — survivor absorbs candidate's source paths, links, and concepts */
function mergePlans(survivor: ArticlePlan, candidate: ArticlePlan): ArticlePlan {
  const mergedSources = new Set([
    ...(survivor.sourcePaths ?? []),
    ...(candidate.sourcePaths ?? []),
  ]);

  // R-7: Union link targets and candidate concepts so dedup doesn't silently
  // drop stub article creation or wikilink targets from the absorbed plan.
  const mergedLinks = new Set([
    ...survivor.knownLinkDocIds,
    ...candidate.knownLinkDocIds,
  ]);

  // Dedupe candidate concepts by name (survivor's take precedence)
  const existingConceptNames = new Set(
    survivor.candidateNewConcepts.map((c) => c.name.toLowerCase()),
  );
  const newConcepts = candidate.candidateNewConcepts.filter(
    (c) => !existingConceptNames.has(c.name.toLowerCase()),
  );

  return {
    ...survivor,
    sourcePaths: [...mergedSources],
    knownLinkDocIds: [...mergedLinks],
    candidateNewConcepts: [...survivor.candidateNewConcepts, ...newConcepts],
    // R4-3: Merge suggested frontmatter — candidate as defaults, survivor overrides
    suggestedFrontmatter: { ...candidate.suggestedFrontmatter, ...survivor.suggestedFrontmatter },
  };
}
