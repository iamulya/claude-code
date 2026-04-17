/**
 * Post-Synthesis Validator — Phase 5C
 *
 * Validates that synthesized articles are grounded in their source material.
 * Uses keyword overlap scoring (no LLM required) to detect potential
 * hallucinated claims.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GroundingResult {
  /** 0-1 score: percentage of article claims backed by source material */
  score: number;
  /** Total sentences analyzed */
  totalClaims: number;
  /** Number of claims with sufficient source backing */
  supportedClaims: number;
  /** Sentences that may not be grounded in sources */
  unsupportedClaims: string[];
  /** Summary warnings */
  warnings: string[];
}

// ── Stop words (excluded from overlap calculation) ────────────────────────────

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "as",
  "is",
  "was",
  "are",
  "were",
  "been",
  "be",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "can",
  "shall",
  "not",
  "no",
  "this",
  "that",
  "these",
  "those",
  "it",
  "its",
  "they",
  "them",
  "their",
  "we",
  "our",
  "you",
  "your",
  "he",
  "she",
  "his",
  "her",
  "which",
  "who",
  "whom",
  "what",
  "when",
  "where",
  "why",
  "how",
  "all",
  "each",
  "every",
  "both",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "than",
  "too",
  "very",
  "also",
  "just",
  "about",
  "above",
  "after",
  "again",
  "between",
  "into",
  "through",
  "during",
  "before",
  "here",
  "there",
  "then",
  "once",
  "only",
  "same",
  "so",
  "because",
  "if",
  "while",
  "although",
  "though",
  "since",
  "until",
  "using",
  "used",
  "based",
  "provides",
  "allows",
  "including",
]);

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Validate that article claims are grounded in source material.
 * Uses keyword overlap scoring — no LLM required.
 *
 * @param articleBody - The markdown body of the synthesized article
 * @param sourceTexts - Array of source text contents
 * @param threshold - Minimum keyword overlap ratio to consider "supported" (default: 0.3)
 */
export function validateGrounding(
  articleBody: string,
  sourceTexts: string[],
  threshold: number = 0.3,
): GroundingResult {
  // Build source word set (lowercase, no stop words)
  const sourceCorpus = sourceTexts.join(" ").toLowerCase();
  const sourceWords = new Set(
    sourceCorpus.split(/\s+/).filter((w) => w.length > 3 && !STOP_WORDS.has(w)),
  );

  // Extract declarative sentences from the article
  // Skip headings, code blocks, frontmatter, and very short fragments
  const cleanBody = articleBody
    .replace(/```[\s\S]*?```/g, "") // Remove code blocks
    .replace(/^#+\s.*/gm, "") // Remove headings
    .replace(/^\s*[-*]\s/gm, "") // Remove list markers
    .replace(/\[\[([^\]]+)\]\]/g, "$1"); // Remove wikilink brackets

  const sentences = cleanBody
    .split(/[.!?]\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30 && /[a-zA-Z]/.test(s));

  if (sentences.length === 0) {
    return { score: 1, totalClaims: 0, supportedClaims: 0, unsupportedClaims: [], warnings: [] };
  }

  const unsupported: string[] = [];
  let supported = 0;

  for (const sentence of sentences) {
    const words = sentence
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w));

    if (words.length === 0) {
      supported++; // No substantive words — treat as supported
      continue;
    }

    const overlap = words.filter((w) => sourceWords.has(w)).length / words.length;

    if (overlap >= threshold) {
      supported++;
    } else {
      unsupported.push(sentence.slice(0, 150));
    }
  }

  const score = sentences.length > 0 ? supported / sentences.length : 1;
  const warnings: string[] = [];

  if (unsupported.length > 0) {
    warnings.push(
      `${unsupported.length} of ${sentences.length} claims may not be grounded in source material`,
    );
  }

  if (score < 0.5) {
    warnings.push(
      `Low grounding score (${(score * 100).toFixed(0)}%). Article may contain hallucinated content.`,
    );
  }

  return {
    score,
    totalClaims: sentences.length,
    supportedClaims: supported,
    unsupportedClaims: unsupported.slice(0, 10), // Cap at 10 for readability
    warnings,
  };
}
