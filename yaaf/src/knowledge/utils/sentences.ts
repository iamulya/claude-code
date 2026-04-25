/**
 * Shared sentence splitting utility — used by the grounding pipeline,
 * contradiction detector, and runtime GroundingValidator.
 *
 * Finding 3.3 / 8.3: The naive lookbehind-only regex
 *   `.split(/(?<=[.!?])\s+/)`
 * falsely splits "Dr. Smith", "Version 3.5", "U.S.A.", "e.g., this",
 * producing sentence fragments that fail keyword overlap and cause both
 * false-positive escalations and false-negative contradiction misses.
 *
 * This module implements the same abbreviation-protection approach already
 * used in groundingPlugin.ts's `extractClaims()`, extracted here so all
 * three callsites share one implementation.
 *
 * The `\u2024` (ONE DOT LEADER, U+2024) is used as a temporary placeholder
 * to protect dots that should NOT trigger sentence boundaries.
 */

/** Common title/suffix abbreviations that should not end a sentence */
const ABBREVIATIONS =
  /(?:e\.g|i\.e|vs|etc|Dr|Mr|Mrs|Ms|Sr|Jr|Prof|Inc|Ltd|Corp|Fig|Eq)\./g;

/** Academic citation abbreviations */
const ACADEMIC_ABBREV =
  /(?:et al|cf|viz|approx|est|seq|loc|op|cit|ibid|al)\.(?=\s)/g;

/**
 * Split `text` into sentences using an abbreviation-aware algorithm.
 *
 * Steps:
 * 1. Protect known abbreviations by replacing their dots with U+2024 (one-dot leader)
 * 2. Protect decimal numbers (e.g. "3.14") the same way
 * 3. Split on `.` / `!` / `?` followed by whitespace
 * 4. Restore real dots
 * 5. Trim and remove empty strings
 *
 * Minimum length filtering is left to the caller — this function returns
 * all non-empty fragments.
 */
export function splitSentences(text: string): string[] {
  // Step 1: protect abbreviations
  let safe = text.replace(ABBREVIATIONS, (m) => m.replace(/\./g, "\u2024"));
  safe = safe.replace(ACADEMIC_ABBREV, (m) => m.replace(/\./g, "\u2024"));
  // Step 2: protect decimal numbers (e.g. "3.5", "94.1%")
  safe = safe.replace(/(\d)\.(\d)/g, "$1\u2024$2");
  // Step 3: protect multi-char abbreviations like U.S.A. or N.L.P.
  safe = safe.replace(/(?<!\w)([A-Z]\.){2,}/g, (m) => m.replace(/\./g, "\u2024"));

  // Step 4: split on sentence boundaries
  return safe
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.replace(/\u2024/g, ".").trim())
    .filter((s) => s.length > 0);
}
