/**
 * src/knowledge/utils/stringDistance.ts
 *
 * Shared string distance and normalization utilities for the KB pipeline.
 *
 * Replaces hand-rolled stemming and similarity logic scattered across:
 *   - dedup.ts (tokenize + jaccardSimilarity)
 *   - linter/checks.ts (stemWord + titleSimilarity)
 *   - utils.ts (stemSlugWord in generateDocId)
 *
 * Uses the `stemmer` package (Porter2 algorithm, 12.9 KB, 0 deps) for
 * English word stemming instead of our incomplete ad-hoc rules.
 *
 * Dice's coefficient (character bigrams) is inlined — it's 15 lines of code
 * and the `string-similarity` package is CJS-only with no types.
 *
 * @module knowledge/utils/stringDistance
 */

import { stemmer } from "stemmer";

// Re-export stemmer for direct use in slug generation, etc.
export { stemmer };

// ── Dice's coefficient (character bigrams) ──────────────────────────────────

/**
 * Sørensen–Dice coefficient on character bigrams.
 *
 * Industry-standard metric for short-string similarity comparison:
 *   Dice = 2 × |shared bigrams| / (|bigrams of A| + |bigrams of B|)
 *
 * Works directly on raw strings — no tokenization, stemming, or
 * camelCase splitting needed. Naturally handles:
 *   - Plural variants: "agentTool" vs "agentTools" → 0.94
 *   - Case differences: "SystemPromptBuilder" vs "systempromptbuilder" → 1.0
 *   - Word reordering: "Loop Agent" vs "Agent Loop" → 0.78
 *   - Slug variants: "system-prompt" vs "system-prompts" → 0.96
 *
 * @returns Similarity score in [0, 1]. 1.0 = identical, 0.0 = no shared bigrams.
 */
export function diceCoefficient(a: string, b: string): number {
  const first = a.replace(/\s+/g, "").toLowerCase();
  const second = b.replace(/\s+/g, "").toLowerCase();

  if (first === second) return 1;
  if (first.length < 2 || second.length < 2) return 0;

  // Build bigram multiset for first string
  const firstBigrams = new Map<string, number>();
  for (let i = 0; i < first.length - 1; i++) {
    const bigram = first.slice(i, i + 2);
    firstBigrams.set(bigram, (firstBigrams.get(bigram) ?? 0) + 1);
  }

  // Count shared bigrams with second string
  let intersectionSize = 0;
  for (let i = 0; i < second.length - 1; i++) {
    const bigram = second.slice(i, i + 2);
    const count = firstBigrams.get(bigram);
    if (count && count > 0) {
      firstBigrams.set(bigram, count - 1);
      intersectionSize++;
    }
  }

  return (2 * intersectionSize) / (first.length - 1 + second.length - 1);
}

// ── Word-level stemmed Jaccard ──────────────────────────────────────────────

/**
 * Split a string into individual words, handling:
 *   - camelCase: "agentTool" → ["agent", "tool"]
 *   - PascalCase: "SystemPromptBuilder" → ["system", "prompt", "builder"]
 *   - Acronyms: "HTTPServer" → ["http", "server"]
 *   - Hyphens/punctuation: "rate-limiter" → ["rate", "limiter"]
 *
 * Each word is lowercased and Porter2-stemmed.
 */
export function stemmedTokens(text: string): Set<string> {
  const tokens = new Set<string>();
  const split = text
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")     // camelCase boundaries
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")  // acronym boundaries
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/);

  for (const word of split) {
    if (word.length > 1) {
      tokens.add(stemmer(word));
    }
  }
  return tokens;
}

/**
 * Jaccard similarity on Porter2-stemmed word tokens.
 *
 * Complementary to diceCoefficient — this gives word-level semantic
 * similarity while Dice gives character-level surface similarity.
 *
 * Example where they diverge:
 *   - "CNN Architecture" vs "RNN Architecture" → Dice: 0.93 (characters similar)
 *     but stemmedJaccard: 0.67 (different first word → lower score)
 *
 * Combining both prevents false positives from Dice on structurally
 * similar but semantically distinct titles.
 */
export function stemmedJaccard(a: string, b: string): number {
  const tokensA = stemmedTokens(a);
  const tokensB = stemmedTokens(b);
  if (tokensA.size === 0 && tokensB.size === 0) return 1;
  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }
  const union = tokensA.size + tokensB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

