/**
 * Vocabulary Normalizer
 *
 * Applies the ontology vocabulary to compiled article text, replacing
 * alias terms with their canonical equivalents. This ensures that all
 * articles in the KB use consistent terminology, which is critical for:
 *
 * 1. [[Wikilink]] resolution — "[[self-attention]]" resolves to the same
 * article as "[[attention mechanism]]"
 * 2. Backlink detection — mentions of alias terms are counted as mentions
 * of the canonical entity
 * 3. LLM retrieval — the agent's search uses canonical terms, so article
 * text must use them too
 *
 * The normalizer also maintains the inverse map: canonical term → all
 * aliases, used by the Concept Extractor to scan source text for entity
 * mentions regardless of which alias the source author used.
 */

import type { KBOntology, VocabularyEntry } from "./types.js";

// ── Alias index ──────────────────────────────────────────────────────────────

export type AliasIndex = Map<string, string>; // lowercase alias → canonical term

/**
 * Build a fast lookup map from the ontology vocabulary.
 * Maps every alias (lowercased) → canonical term.
 * Also maps canonical term → itself (for consistency).
 */
export function buildAliasIndex(ontology: KBOntology): AliasIndex {
  const index = new Map<string, string>();

  for (const [canonicalTerm, entry] of Object.entries(ontology.vocabulary)) {
    const canonical = canonicalTerm.toLowerCase();
    index.set(canonical, canonical);

    for (const alias of entry.aliases) {
      const aliasLower = alias.toLowerCase();
      if (index.has(aliasLower) && index.get(aliasLower) !== canonical) {
        // Collision: two canonical terms claim the same alias
        console.warn(
          `[VocabularyNormalizer] Alias collision: "${alias}" maps to both ` +
            `"${index.get(aliasLower)}" and "${canonical}". Using: "${index.get(aliasLower)}"`,
        );
      } else {
        index.set(aliasLower, canonical);
      }
    }
  }

  return index;
}

// ── Wikilink resolution ──────────────────────────────────────────────────────

/**
 * Resolve a [[wikilink]] target to its canonical term.
 * Returns the canonical term if found, or the original text if not.
 *
 * @example
 * resolveWikilink("self-attention", aliasIndex)
 * // → "attention mechanism" (if that's the canonical term)
 */
export function resolveWikilink(
  wikilinkTarget: string,
  aliasIndex: AliasIndex,
): { resolved: string; wasAlias: boolean } {
  const lower = wikilinkTarget.toLowerCase().trim();
  const canonical = aliasIndex.get(lower);
  if (canonical && canonical !== lower) {
    return { resolved: canonical, wasAlias: true };
  }
  if (canonical) {
    return { resolved: canonical, wasAlias: false };
  }
  return { resolved: wikilinkTarget, wasAlias: false };
}

// ── Text normalization ───────────────────────────────────────────────────────

/** Options for text normalization */
export type NormalizeOptions = {
  /**
   * If true, replace alias terms in prose text with canonical terms.
   * Default: false (normalization is opt-in for prose, always on for wikilinks).
   */
  normalizeProse?: boolean;
  /**
   * If true, track which replacements were made.
   */
  trackReplacements?: boolean;
};

export type NormalizationResult = {
  text: string;
  replacements: Array<{ original: string; canonical: string; count: number }>;
};

/**
 * Normalize wikilinks in a compiled article body.
 * Replaces [[alias]] with [[canonical term]] throughout the text.
 *
 * @example
 * Input: "The [[self-attention]] mechanism in [[Transformers]]..."
 * Output: "The [[attention mechanism]] mechanism in [[transformer]]..."
 */
export function normalizeWikilinks(
  text: string,
  aliasIndex: AliasIndex,
  options: NormalizeOptions = {},
): NormalizationResult {
  const replacements = new Map<string, { original: string; canonical: string; count: number }>();

  const normalized = text.replace(/\[\[([^\]]+)\]\]/g, (match, target: string) => {
    const { resolved, wasAlias } = resolveWikilink(target, aliasIndex);

    if (wasAlias && options.trackReplacements) {
      const key = target.toLowerCase();
      const existing = replacements.get(key);
      if (existing) {
        existing.count++;
      } else {
        replacements.set(key, { original: target, canonical: resolved, count: 1 });
      }
    }

    return `[[${resolved}]]`;
  });

  return {
    text: normalized,
    replacements: Array.from(replacements.values()),
  };
}

// ── Concept Extractor helpers ────────────────────────────────────────────────

export type EntityMention = {
  /** The canonical term that was mentioned */
  canonicalTerm: string;
  /** The exact text that triggered the match (may be an alias) */
  matchedText: string;
  /** Entity type from vocabulary */
  entityType?: string;
  /** Known doc ID if already compiled */
  docId?: string;
  /** How many times this entity was mentioned */
  count: number;
};

/**
 * Scan source text for mentions of known vocabulary entities.
 * Returns a de-duplicated list of entity mentions with counts.
 *
 * Used by the Concept Extractor before calling the LLM — it provides
 * the LLM with a pre-identified list of known entities in the source,
 * so the LLM can write correct [[wikilinks]] without hallucinating names.
 *
 * Matching is word-boundary aware to avoid false positives:
 * "tool" won't match inside "toolkit" or "toolbox".
 *
 * @param sourceText - Raw extracted text from the ingester
 * @param ontology - The loaded ontology
 * @param aliasIndex - Pre-built alias index
 * @returns Sorted list of entity mentions (by count descending)
 */
export function scanForEntityMentions(
  sourceText: string,
  ontology: KBOntology,
  aliasIndex: AliasIndex,
): EntityMention[] {
  const mentionCounts = new Map<string, EntityMention>();
  const lowerSource = sourceText.toLowerCase();

  // Sort alias index entries by length descending (longest match wins)
  const sortedAliases = Array.from(aliasIndex.entries()).sort(([a], [b]) => b.length - a.length);

  for (const [alias, canonical] of sortedAliases) {
    // Word-boundary-aware search
    // Build a regex that matches the alias as a whole word/phrase
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, "gi");

    let match: RegExpExecArray | null;
    let count = 0;
    while ((match = pattern.exec(lowerSource)) !== null) {
      count++;
    }

    if (count > 0) {
      const key = canonical;
      const existing = mentionCounts.get(key);
      const vocabEntry: VocabularyEntry | undefined = ontology.vocabulary[canonical];

      if (!existing) {
        mentionCounts.set(key, {
          canonicalTerm: canonical,
          matchedText: alias,
          entityType: vocabEntry?.entityType,
          docId: vocabEntry?.docId,
          count,
        });
      } else {
        existing.count += count;
        // Keep the longest/most specific match text
        if (alias.length > existing.matchedText.length) {
          existing.matchedText = alias;
        }
      }
    }
  }

  return Array.from(mentionCounts.values()).sort((a, b) => b.count - a.count);
}
