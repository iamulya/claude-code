/**
 * Shared KB Utilities — Phase 4B
 *
 * Shared helpers for the KB compilation pipeline.
 * Centralizes duplicated logic (pluralization, docId generation).
 */

import { createHash, randomBytes } from "crypto";

// ── Prompt injection fencing (Sprint 1.4) ─────────────────────────────────────

/**
 * Wrap untrusted content in a cryptographically random delimiter so an LLM
 * cannot break out of the "data" section by embedding the closing delimiter.
 *
 * Called from the extraction prompt, synthesis prompt, and heal prompts.
 * Centralised here to avoid duplication across those three modules.
 *
 * @example
 * const { fenced, delimiter } = fenceContent(articleBody);
 * // LLM prompt: `The article is fenced with ${delimiter}:\n${fenced}`
 */
export function fenceContent(content: string): { fenced: string; delimiter: string } {
  let delimiter: string;
  do {
    delimiter = `===CONTENT_${randomBytes(8).toString("hex")}===`;
  } while (content.includes(delimiter));
  return {
    fenced: `${delimiter}\n${content}\n${delimiter}`,
    delimiter,
  };
}


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
 * The slug normalizes:
 * - camelCase/PascalCase → kebab-case (agentTool → agent-tool)
 * - Plural → singular stems (agentTools → agent-tool)
 * - Diacritics → ASCII equivalents
 *
 * Plural stemming ensures "agentTool" and "agentTools" produce the same
 * docId, preventing duplicate articles from surviving with different slugs.
 *
 * @example
 * generateDocId('Attention Mechanism', 'concept') → 'concepts/attention-mechanism'
 * generateDocId('agentTool', 'api') → 'apis/agent-tool'
 * generateDocId('agentTools', 'api') → 'apis/agent-tool'  // same!
 */
export function generateDocId(canonicalTitle: string, entityType: string): string {
  const slug = canonicalTitle
    // Insert hyphens at PascalCase/camelCase word boundaries BEFORE lowercasing.
    // "AccessPolicy" → "Access-Policy", "HTTPServer" → "HTTP-Server",
    // "eventBus" → "event-Bus". All become kebab-case after toLowerCase().
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")     // camelCase: accessPolicy → access-Policy
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")   // acronyms: HTTPServer → HTTP-Server
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    // Normalize singular/plural for slug stability:
    // "agent-tools" → "agent-tool", "permissions-management" → "permission-management"
    //
    // IMPORTANT: This uses a conservative 4-rule stemmer, NOT Porter2.
    // Porter2 (from the `stemmer` package) is too aggressive for slugs —
    // it produces unrecognizable stems (compiler→compil, memory→memori)
    // that would break all existing docIds, file paths, wikilinks, and
    // registry entries. Porter2 is used in dedup/linter comparison where
    // the output is transient; slugs must be human-readable and stable.
    .split("-")
    .map(stemSlugWord)
    .join("-")
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

/**
 * Conservative plural-only stemmer for slug generation.
 *
 * Intentionally minimal — only strips -s, -es, -ies suffixes.
 * Porter2 is NOT used here because it produces unrecognizable stems
 * (compiler→compil, memory→memori) that break file paths.
 */
function stemSlugWord(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.endsWith("es") && !word.endsWith("ses")) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}
