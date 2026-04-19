/**
 * Shared KB Utilities — Phase 4B
 *
 * Shared helpers for the KB compilation pipeline.
 * Centralizes duplicated logic (pluralization, docId generation).
 */

import { createHash } from "crypto";

// ── Irregular plurals ─────────────────────────────────────────────────────────

const IRREGULAR_PLURALS: Record<string, string> = {
  thesis: "theses",
  analysis: "analyses",
  index: "indices",
  matrix: "matrices",
  vertex: "vertices",
  appendix: "appendices",
  criterion: "criteria",
  phenomenon: "phenomena",
  datum: "data",
  medium: "media",
  curriculum: "curricula",
  synopsis: "synopses",
  basis: "bases",
  crisis: "crises",
  hypothesis: "hypotheses",
  parenthesis: "parentheses",
  stimulus: "stimuli",
  focus: "foci",
  radius: "radii",
  fungus: "fungi",
  cactus: "cacti",
  syllabus: "syllabi",
  person: "people",
  child: "children",
  man: "men",
  woman: "women",
  mouse: "mice",
  goose: "geese",
  tooth: "teeth",
  foot: "feet",
  ox: "oxen",
  leaf: "leaves",
  life: "lives",
  knife: "knives",
  wife: "wives",
  half: "halves",
  self: "selves",
  shelf: "shelves",
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Pluralize an entity type name for directory naming.
 * Handles irregular plurals, standard English rules, and edge cases.
 *
 * @example
 * pluralizeEntityType('concept') → 'concepts'
 * pluralizeEntityType('category') → 'categories'
 * pluralizeEntityType('analysis') → 'analyses'
 * pluralizeEntityType('api') → 'apis'
 */
export function pluralizeEntityType(entityType: string): string {
  const lower = entityType.toLowerCase();

  // Check irregular plurals
  if (IRREGULAR_PLURALS[lower]) return IRREGULAR_PLURALS[lower]!;

  // Already plural (ends in s but not ss/us/is)
  if (
    lower.endsWith("s") &&
    !lower.endsWith("ss") &&
    !lower.endsWith("us") &&
    !lower.endsWith("is")
  ) {
    return entityType;
  }

  // Words ending in -y with a consonant before: category → categories
  if (lower.endsWith("y") && !/[aeiou]y$/.test(lower)) {
    return entityType.slice(0, -1) + "ies";
  }

  // Words ending in -s, -x, -z, -sh, -ch: add -es
  if (/(?:s|x|z|sh|ch)$/.test(lower)) {
    return entityType + "es";
  }

  // Default: add -s
  return entityType + "s";
}

/**
 * Generate a deterministic docId from a canonical title and entity type.
 * Format: {pluralized-entity-type}/{slug}
 *
 * @example
 * generateDocId('Attention Mechanism', 'concept') → 'concepts/attention-mechanism'
 */
export function generateDocId(canonicalTitle: string, entityType: string): string {
  const slug = canonicalTitle
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  // G4: if the title is pure emoji / CJK / punctuation, the slug may be empty after
  // normalization. "concepts/" is a directory path, not a valid article path.
  // Fall back to a short hash of the original title for a stable, unique docId.
  const finalSlug = slug || createHash("sha256")
    .update(canonicalTitle)
    .digest("hex")
    .slice(0, 16);

  return `${pluralizeEntityType(entityType)}/${finalSlug}`;
}
