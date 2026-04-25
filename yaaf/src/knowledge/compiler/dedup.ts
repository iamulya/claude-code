/**
 * Semantic Deduplication — Post-Extraction Plan Merging (P4-1)
 *
 * Detects near-duplicate article plans after extraction and merges them
 * before they reach synthesis. This prevents:
 *   1. Redundant LLM calls for near-identical topics
 *   2. Duplicate compiled articles with slightly different titles
 *   3. Source material fragmentation across articles
 *
 * Uses three zero-cost heuristics (no LLM required):
 *   - Dice coefficient (character bigrams) on title text — catches surface
 *     variants like "agentTool" vs "agentTools" without tokenization
 *   - Porter2 stemmed Jaccard on word tokens — catches semantic variants
 *     like "System Prompt" vs "System Prompts" after proper stemming
 *   - Source path overlap ratio (how many source files are shared)
 *
 * 5.1 fix: replaced the greedy O(n²) algorithm with Union-Find.
 *
 * The greedy algorithm missed transitive duplicates: if A↔B and B↔C both
 * exceed the threshold but A↔C does not, the greedy pass produced either
 * {A+B, C} or {A, B+C} depending on sort order, never the correct {A+B+C}.
 *
 * Union-Find builds a graph of all pairs exceeding the threshold, then
 * finds connected components. Every node in a component is merged into a
 * single survivor — the one with the lexicographically smallest docId
 * (same tiebreak as before: stable, deterministic).
 *
 * @module knowledge/compiler/dedup
 */

import type { ArticlePlan } from "./extractor/index.js";
import { diceCoefficient, stemmedJaccard } from "../utils/stringDistance.js";

// ── Types ────────────────────────────────────────────────────────────────────

export interface DedupResult {
  /** Surviving plans after deduplication */
  merged: ArticlePlan[];
  /** Plans that were absorbed into survivors */
  removed: Array<{ docId: string; mergedInto: string; similarity: number }>;
}

// ── Implementation ──────────────────────────────────────────────────────────

/**
 * M7: Default dedup similarity threshold.
 *
 * CALIBRATION RATIONALE:
 * - 0.5: Too aggressive — merges loosely related topics ("Neural Networks" + "Network Security")
 * - 0.7: Sweet spot — merges title variants ("agentTool" + "agentTools", Dice=0.94)
 *        but not distinct topics sharing vocabulary ("CNN Architecture" + "RNN Architecture")
 * - 0.9: Too conservative — only catches near-exact duplicates
 *
 * The combined score is:
 *   0.35 × Dice(title)          — character-level surface similarity
 * + 0.35 × stemmedJaccard(title) — word-level semantic similarity  
 * + 0.30 × sourceOverlap         — shared contributing source files
 *
 * Using BOTH Dice and stemmed Jaccard prevents false positives:
 *   - "CNN Architecture" vs "RNN Architecture" → Dice=0.93 but Jaccard=0.67 → combined=0.56 ❌
 *   - "agentTool" vs "agentTools" → Dice=0.94 + Jaccard=1.0 → combined=0.68 + source → ✅
 *
 * Override via the `threshold` parameter if your domain has many similar-but-distinct concepts.
 */
const DEFAULT_DEDUP_THRESHOLD = 0.65;

/**
 * Detect and merge near-duplicate article plans using title similarity
 * and source path overlap.
 *
 * 5.1 fix: uses Union-Find for transitive closure instead of greedy pairing.
 *
 * @param plans - Article plans from the extractor
 * @param threshold - Minimum combined similarity to merge (default: 0.7)
 * @returns Deduplicated plans and a record of merges
 */
export function deduplicatePlans(
  plans: ArticlePlan[],
  threshold: number = DEFAULT_DEDUP_THRESHOLD,
): DedupResult {
  if (plans.length <= 1) return { merged: [...plans], removed: [] };

  // D-3 / F-4: Sort by docId (Unicode code-point order) for deterministic clustering.
  // The cluster survivor is the lowest-sorted node, matching the old greedy winner.
  const sortedPlans = [...plans].sort((a, b) =>
    a.docId < b.docId ? -1 : a.docId > b.docId ? 1 : 0,
  );

  // ── 5.1: Union-Find ──────────────────────────────────────────────────────
  // parent[i] = root of i's cluster. Initially every plan is its own root.
  const parent = sortedPlans.map((_, i) => i);
  // Best similarity score for each merge edge (used for reporting)
  const edgeSimilarity = new Map<string, number>();

  function find(x: number): number {
    // Path compression
    if (parent[x] !== x) parent[x] = find(parent[x]!);
    return parent[x]!;
  }

  function union(x: number, y: number, sim: number): void {
    const rx = find(x);
    const ry = find(y);
    if (rx === ry) return;
    // Always attach larger index to smaller (keeps smallest-docId as root)
    const [smaller, larger] = rx < ry ? [rx, ry] : [ry, rx];
    parent[larger] = smaller;
    // Record the best similarity seen between these two plans
    const key = `${smaller}:${larger}`;
    const prev = edgeSimilarity.get(key) ?? 0;
    if (sim > prev) edgeSimilarity.set(key, sim);
  }

  // Build edges: O(n²) comparisons, but only union pairs above threshold
  for (let i = 0; i < sortedPlans.length; i++) {
    for (let j = i + 1; j < sortedPlans.length; j++) {
      const titleA = sortedPlans[i]!.canonicalTitle;
      const titleB = sortedPlans[j]!.canonicalTitle;

      // Dice coefficient: character-bigram surface similarity.
      // Catches camelCase variants ("agentTool" vs "agentTools" → 0.94)
      // and slug-level differences without any tokenization.
      const diceSim = diceCoefficient(titleA, titleB);

      // Stemmed Jaccard: Porter2-stemmed word-level semantic similarity.
      // Guards against Dice false positives on structurally similar but
      // semantically distinct titles ("CNN Architecture" vs "RNN Architecture").
      const jaccardSim = stemmedJaccard(titleA, titleB);

      const sourceSim = sourceOverlap(
        sortedPlans[i]!.sourcePaths ?? [],
        sortedPlans[j]!.sourcePaths ?? [],
      );

      const combined = 0.35 * diceSim + 0.35 * jaccardSim + 0.30 * sourceSim;
      if (combined >= threshold) {
        union(i, j, combined);
      }
    }
  }

  // ── Cluster → merged plan ────────────────────────────────────────────────
  // Group every index by its root
  const clusters = new Map<number, number[]>();
  for (let i = 0; i < sortedPlans.length; i++) {
    const root = find(i);
    const cluster = clusters.get(root);
    if (cluster) cluster.push(i);
    else clusters.set(root, [i]);
  }

  const merged: ArticlePlan[] = [];
  const removed: DedupResult["removed"] = [];

  for (const [root, members] of clusters) {
    if (members.length === 1) {
      // Singleton — no merging needed
      merged.push(sortedPlans[root]!);
      continue;
    }

    // Survivor = plan at root index (smallest docId in cluster — deterministic)
    let survivor = sortedPlans[root]!;
    for (const idx of members) {
      if (idx === root) continue;
      const candidate = sortedPlans[idx]!;
      // Use best edge similarity for this pair (root may be transitive)
      const [a, b] = root < idx ? [root, idx] : [idx, root];
      const sim = edgeSimilarity.get(`${a}:${b}`) ?? threshold;
      removed.push({
        docId: candidate.docId,
        mergedInto: survivor.docId,
        similarity: sim,
      });
      survivor = mergePlans(survivor, candidate);
    }
    merged.push(survivor);
  }

  return { merged, removed };
}

// ── Internal helpers ────────────────────────────────────────────────────────

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
