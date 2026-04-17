/**
 * Static Lint Checks
 *
 * All checks here are deterministic — no LLM required.
 * They run in parallel over the compiled articles and are fast enough
 * to run on every `kb lint` invocation.
 *
 * Check inventory:
 *
 * STRUCTURAL (errors — block compilation if present):
 * 1. MISSING_ENTITY_TYPE — entity_type field missing entirely
 * 2. UNKNOWN_ENTITY_TYPE — entity_type not in ontology
 * 3. MISSING_REQUIRED_FIELD — required frontmatter field absent
 * 4. INVALID_FIELD_VALUE — enum/type violation in frontmatter
 *
 * LINKING (warnings — degraded KB quality but not broken):
 * 5. BROKEN_WIKILINK — [[target]] not in registry
 * 6. NON_CANONICAL_WIKILINK — [[alias]] should be [[canonical]]
 * 7. UNLINKED_MENTION — known entity in text lacks [[wikilink]]
 * 8. ORPHANED_ARTICLE — no other article links to this one
 * 9. MISSING_RECIPROCAL_LINK — A→B but B doesn't→A for reciprocal rels
 *
 * QUALITY (info — improvement opportunities):
 * 10. LOW_ARTICLE_QUALITY — body too short for non-stub
 * 11. BROKEN_SOURCE_REF — compiled_from path missing on disk
 * 12. STUB_WITH_SOURCES — stub can be expanded
 * 13. DUPLICATE_CANDIDATE — similar title to another article
 */

import { access } from "fs/promises";
import type { KBOntology, ConceptRegistry } from "../../ontology/index.js";
import { buildAliasIndex, scanForEntityMentions } from "../../ontology/index.js";
import type { LintIssue, LinkGraph, LintOptions } from "./types.js";
import type { ParsedCompiledArticle } from "./reader.js";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

// ── Wikilink extraction ───────────────────────────────────────────────────────

const WIKILINK_RE = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;

/**
 * Extract all wikilink targets from article body text.
 * Handles [[Target]] and [[Target|Display Text]] syntax.
 * Returns the target portion (before any pipe).
 */
export function extractWikilinks(body: string): Array<{ target: string; fullMatch: string }> {
  const links: Array<{ target: string; fullMatch: string }> = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(WIKILINK_RE.source, "g");
  while ((match = re.exec(body)) !== null) {
    links.push({ target: match[1]!.trim(), fullMatch: match[0] });
  }
  return links;
}

// ── Link graph builder ────────────────────────────────────────────────────────

/**
 * Build a bidirectional link graph from all compiled articles.
 * Used for orphan detection and reciprocal link checking.
 */
export function buildLinkGraph(
  articles: ParsedCompiledArticle[],
  registry: ConceptRegistry,
): LinkGraph {
  const graph: LinkGraph = new Map();

  // Initialize all nodes
  for (const entry of registry.values()) {
    graph.set(entry.docId, { outgoing: new Set(), incoming: new Set() });
  }

  // Populate edges
  for (const article of articles) {
    const { docId, body } = article;
    if (!graph.has(docId)) graph.set(docId, { outgoing: new Set(), incoming: new Set() });

    const links = extractWikilinks(body);
    for (const { target } of links) {
      // Resolve target to a docId
      const resolved = resolveWikilinkToDocId(target, registry);
      if (resolved) {
        graph.get(docId)!.outgoing.add(resolved);
        if (!graph.has(resolved)) graph.set(resolved, { outgoing: new Set(), incoming: new Set() });
        graph.get(resolved)!.incoming.add(docId);
      }
    }
  }

  return graph;
}

/**
 * Resolve a wikilink target text to a registry docId.
 * Tries: exact title match → alias match → docId match.
 */
function resolveWikilinkToDocId(target: string, registry: ConceptRegistry): string | null {
  const lower = target.toLowerCase();

  // Direct docId match
  if (registry.has(lower)) return lower;

  // Title / alias scan
  for (const entry of registry.values()) {
    if (entry.canonicalTitle.toLowerCase() === lower) return entry.docId;
    if (entry.aliases.some((a) => a.toLowerCase() === lower)) return entry.docId;
  }

  return null;
}

// ── Check 1: MISSING_ENTITY_TYPE ─────────────────────────────────────────────

export function checkMissingEntityType(article: ParsedCompiledArticle): LintIssue | null {
  const et = article.frontmatter["entity_type"];
  if (et === undefined || et === null || et === "") {
    return {
      code: "MISSING_ENTITY_TYPE",
      severity: "error",
      message: `Article is missing the required "entity_type" frontmatter field`,
      docId: article.docId,
      field: "entity_type",
      suggestion:
        'Add entity_type: <type> to the frontmatter. Run "kb compile --force" to re-synthesize.',
      autoFixable: false,
    };
  }
  return null;
}

// ── Check 2: UNKNOWN_ENTITY_TYPE ─────────────────────────────────────────────

export function checkUnknownEntityType(
  article: ParsedCompiledArticle,
  ontology: KBOntology,
): LintIssue | null {
  const et = String(article.frontmatter["entity_type"] ?? "");
  if (!et) return null; // Handled by MISSING_ENTITY_TYPE
  if (!ontology.entityTypes[et]) {
    return {
      code: "UNKNOWN_ENTITY_TYPE",
      severity: "error",
      message: `entity_type "${et}" is not defined in the ontology`,
      docId: article.docId,
      field: "entity_type",
      suggestion: `Valid entity types: ${Object.keys(ontology.entityTypes).join(", ")}`,
      autoFixable: false,
    };
  }
  return null;
}

// ── Check 3: MISSING_REQUIRED_FIELD ──────────────────────────────────────────

export function checkMissingRequiredFields(
  article: ParsedCompiledArticle,
  ontology: KBOntology,
): LintIssue[] {
  const et = String(article.frontmatter["entity_type"] ?? "");
  const schema = ontology.entityTypes[et];
  if (!schema) return [];

  const issues: LintIssue[] = [];

  for (const [fieldName, fieldSchema] of Object.entries(schema.frontmatter.fields)) {
    if (!fieldSchema.required) continue;
    const value = article.frontmatter[fieldName];
    if (value === undefined || value === null || value === "") {
      const hasDefault = fieldSchema.default !== undefined;

      issues.push({
        code: "MISSING_REQUIRED_FIELD",
        severity: "error",
        message: `Required frontmatter field "${fieldName}" is missing or empty`,
        docId: article.docId,
        field: fieldName,
        suggestion: hasDefault
          ? `Add "${fieldName}: ${fieldSchema.default}" to the frontmatter`
          : `Add "${fieldName}" to the frontmatter. Type: ${fieldSchema.type}. ${fieldSchema.description}`,
        autoFixable: hasDefault,
        // Phase 1D: Use frontmatter-aware fix that inserts before the closing ---
        // instead of targeting the opening --- (which could match body horizontal rules)
        fix: hasDefault
          ? {
              findText: "\n---",
              replaceWith: `\n${fieldName}: ${fieldSchema.default}\n---`,
              firstOccurrenceOnly: false, // Target closing delimiter
            }
          : undefined,
      });
    }
  }

  return issues;
}

// ── Check 4: INVALID_FIELD_VALUE ─────────────────────────────────────────────

export function checkInvalidFieldValues(
  article: ParsedCompiledArticle,
  ontology: KBOntology,
): LintIssue[] {
  const et = String(article.frontmatter["entity_type"] ?? "");
  const schema = ontology.entityTypes[et];
  if (!schema) return [];

  const issues: LintIssue[] = [];

  for (const [fieldName, fieldSchema] of Object.entries(schema.frontmatter.fields)) {
    const value = article.frontmatter[fieldName];
    if (value === undefined || value === null) continue;

    // Enum validation
    if ((fieldSchema.type === "enum" || fieldSchema.type === "enum[]") && fieldSchema.enum) {
      const values = Array.isArray(value) ? value.map(String) : [String(value)];
      const invalid = values.filter((v) => !fieldSchema.enum!.includes(v));
      if (invalid.length > 0) {
        issues.push({
          code: "INVALID_FIELD_VALUE",
          severity: "error",
          message: `Field "${fieldName}" has invalid value(s): [${invalid.join(", ")}]. Allowed: [${fieldSchema.enum.join(", ")}]`,
          docId: article.docId,
          field: fieldName,
          suggestion: `Change "${fieldName}" to one of: ${fieldSchema.enum.join(", ")}`,
          autoFixable: false,
        });
      }
    }

    // Number validation
    if (fieldSchema.type === "number" && typeof value !== "number") {
      const n = Number(value);
      if (Number.isNaN(n)) {
        issues.push({
          code: "INVALID_FIELD_VALUE",
          severity: "warning",
          message: `Field "${fieldName}" should be a number but got: "${value}"`,
          docId: article.docId,
          field: fieldName,
          suggestion: `Change "${fieldName}" to a numeric value`,
          autoFixable: false,
        });
      }
    }
  }

  return issues;
}

// ── Check 5: BROKEN_WIKILINK ──────────────────────────────────────────────────

export function checkBrokenWikilinks(
  article: ParsedCompiledArticle,
  registry: ConceptRegistry,
): LintIssue[] {
  const links = extractWikilinks(article.body);
  const issues: LintIssue[] = [];

  for (const { target, fullMatch } of links) {
    const resolved = resolveWikilinkToDocId(target, registry);
    if (!resolved) {
      issues.push({
        code: "BROKEN_WIKILINK",
        severity: "error",
        message: `Wikilink [[${target}]] cannot be resolved — no matching article in the KB`,
        docId: article.docId,
        relatedTarget: target,
        suggestion: `Remove [[${target}]] or create an article for it. Run "kb compile" on source material about "${target}".`,
        autoFixable: false,
      });
    }
  }

  return issues;
}

// ── Check 6: NON_CANONICAL_WIKILINK ──────────────────────────────────────────

export function checkNonCanonicalWikilinks(
  article: ParsedCompiledArticle,
  registry: ConceptRegistry,
  aliasIndex: Map<string, string>,
): LintIssue[] {
  const links = extractWikilinks(article.body);
  const issues: LintIssue[] = [];

  for (const { target, fullMatch } of links) {
    const lower = target.toLowerCase();
    const canonical = aliasIndex.get(lower);
    if (!canonical) continue; // Unknown term — not a vocabulary issue

    // Is the target already canonical?
    if (canonical === lower) continue;

    // The wikilink uses an alias — suggest canonical form
    const canonicalEntry = Array.from(registry.values()).find(
      (e) => e.canonicalTitle.toLowerCase() === canonical,
    );
    if (!canonicalEntry) continue;

    const canonicalLink = `[[${canonicalEntry.canonicalTitle}]]`;
    if (fullMatch !== canonicalLink) {
      issues.push({
        code: "NON_CANONICAL_WIKILINK",
        severity: "warning",
        message: `Wikilink [[${target}]] uses an alias. Canonical form is [[${canonicalEntry.canonicalTitle}]]`,
        docId: article.docId,
        relatedTarget: canonicalEntry.docId,
        suggestion: `Replace [[${target}]] with [[${canonicalEntry.canonicalTitle}]]`,
        autoFixable: true,
        fix: {
          findText: fullMatch,
          replaceWith: canonicalLink,
          firstOccurrenceOnly: false, // Replace ALL occurrences of this non-canonical link
        },
      });
    }
  }

  return issues;
}

// ── Check 7: UNLINKED_MENTION ─────────────────────────────────────────────────

export function checkUnlinkedMentions(
  article: ParsedCompiledArticle,
  ontology: KBOntology,
  registry: ConceptRegistry,
  aliasIndex: Map<string, string>,
): LintIssue[] {
  // Get all canonical entity mentions in the body text
  const mentions = scanForEntityMentions(article.body, ontology, aliasIndex);
  if (mentions.length === 0) return [];

  // Get all wikilinks already in the body
  const existingLinks = new Set(extractWikilinks(article.body).map((l) => l.target.toLowerCase()));

  // Also include aliases of existing links
  for (const link of Array.from(existingLinks)) {
    const canonical = aliasIndex.get(link);
    if (canonical) existingLinks.add(canonical);
  }

  const issues: LintIssue[] = [];

  for (const mention of mentions) {
    const { canonicalTerm, docId } = mention;
    if (!docId) continue; // Concept doesn't have a compiled article yet

    // Skip if the article IS about this concept (don't self-link in suggestions)
    if (docId === article.docId) continue;

    // Skip if there's already a wikilink for this concept
    const isLinked =
      existingLinks.has(canonicalTerm.toLowerCase()) || existingLinks.has(docId.toLowerCase());
    if (isLinked) continue;

    // Find the first occurrence of the term in the text for the fix
    const termPattern = new RegExp(`\\b(${escapeRegex(canonicalTerm)})\\b`, "i");
    const termMatch = article.body.match(termPattern);
    if (!termMatch) continue; // Paranoia check

    const entry = registry.get(docId);
    if (!entry) continue;

    issues.push({
      code: "UNLINKED_MENTION",
      severity: "info",
      message: `"${canonicalTerm}" is mentioned ${mention.count} time(s) but not wikilinked. Article exists at ${docId}`,
      docId: article.docId,
      relatedTarget: docId,
      suggestion: `Add [[${entry.canonicalTitle}]] around mentions of "${canonicalTerm}"`,
      autoFixable: true,
      fix: {
        findText: termMatch[0]!,
        replaceWith: `[[${entry.canonicalTitle}]]`,
        firstOccurrenceOnly: true,
      },
    });
  }

  return issues;
}

// ── Check 8: ORPHANED_ARTICLE ─────────────────────────────────────────────────

export function checkOrphanedArticle(
  article: ParsedCompiledArticle,
  graph: LinkGraph,
): LintIssue | null {
  const node = graph.get(article.docId);
  const isStub = article.frontmatter["stub"] === true;

  // Stubs are expected to be orphans — no issue
  if (isStub) return null;

  if (!node || node.incoming.size === 0) {
    return {
      code: "ORPHANED_ARTICLE",
      severity: "warning",
      message: `Article "${article.docId}" has no incoming wikilinks from other articles`,
      docId: article.docId,
      suggestion:
        "Add a [[wikilink]] to this article from a related compiled article, or check that sources reference it.",
      autoFixable: false,
    };
  }
  return null;
}

// ── Check 9: MISSING_RECIPROCAL_LINK ─────────────────────────────────────────

export function checkMissingReciprocalLinks(
  article: ParsedCompiledArticle,
  graph: LinkGraph,
  ontology: KBOntology,
): LintIssue[] {
  // Find reciprocal relationship types
  const reciprocalPairs = new Map<string, string>(); // relName → reciprocalRelName
  for (const rel of ontology.relationshipTypes) {
    if (rel.reciprocal) {
      reciprocalPairs.set(rel.name, rel.reciprocal);
    }
  }

  if (reciprocalPairs.size === 0) return [];

  const node = graph.get(article.docId);
  if (!node) return [];

  const issues: LintIssue[] = [];
  const et = String(article.frontmatter["entity_type"] ?? "");

  // For each article this one links to, check if the target links back
  // (This is a simplified check — in a full implementation we'd track
  // relationship type labels, not just presence of a link)
  for (const targetDocId of node.outgoing) {
    const targetNode = graph.get(targetDocId);
    if (!targetNode) continue;

    // Check if target has at least one incoming link back to this article
    if (!targetNode.outgoing.has(article.docId)) {
      // Only flag if there's a reciprocal relationship defined for this entity type pair
      // Simplified: flag only if source entity type has reciprocal relationship to target entity type
      const hasReciprocalRel = ontology.relationshipTypes.some(
        (rel) =>
          rel.from === et &&
          rel.reciprocal &&
          ontology.relationshipTypes.some((r) => r.name === rel.reciprocal),
      );
      if (hasReciprocalRel) {
        issues.push({
          code: "MISSING_RECIPROCAL_LINK",
          severity: "info",
          message: `"${article.docId}" links to "${targetDocId}" but the reverse link may be missing`,
          docId: article.docId,
          relatedTarget: targetDocId,
          suggestion: `Add a wikilink to [[${article.docId}]] in the article at ${targetDocId}`,
          autoFixable: false,
        });
      }
    }
  }

  return issues;
}

// ── Check 10: LOW_ARTICLE_QUALITY ─────────────────────────────────────────────

export function checkLowArticleQuality(
  article: ParsedCompiledArticle,
  minWordCount: number,
): LintIssue | null {
  const isStub = article.frontmatter["stub"] === true;
  if (isStub) return null;

  const wordCount = article.body.split(/\s+/).filter(Boolean).length;
  if (wordCount < minWordCount) {
    return {
      code: "LOW_ARTICLE_QUALITY",
      severity: "warning",
      message: `Article body has only ${wordCount} words (minimum: ${minWordCount}). Consider marking as stub or adding more source material.`,
      docId: article.docId,
      suggestion: `Add more source material about "${article.frontmatter["title"] ?? article.docId}" and re-compile, or mark stub: true.`,
      autoFixable: false,
    };
  }
  return null;
}

// ── Check 11: BROKEN_SOURCE_REF ───────────────────────────────────────────────

export async function checkBrokenSourceRefs(article: ParsedCompiledArticle): Promise<LintIssue[]> {
  const refs = article.frontmatter["compiled_from"];
  if (!Array.isArray(refs) || refs.length === 0) return [];

  const issues: LintIssue[] = [];

  for (const ref of refs) {
    const path = String(ref);
    try {
      await access(path);
    } catch {
      issues.push({
        code: "BROKEN_SOURCE_REF",
        severity: "info",
        message: `Source reference "${path}" no longer exists on disk`,
        docId: article.docId,
        field: "compiled_from",
        suggestion: `Remove the stale reference from compiled_from or confirm the file was intentionally deleted.`,
        autoFixable: false,
      });
    }
  }

  return issues;
}

// ── Check 12: STUB_WITH_SOURCES ───────────────────────────────────────────────

export async function checkStubWithSources(
  article: ParsedCompiledArticle,
  rawDir: string | undefined,
  registry: ConceptRegistry,
): Promise<LintIssue | null> {
  const isStub = article.frontmatter["stub"] === true;
  if (!isStub || !rawDir) return null;

  const title = String(article.frontmatter["title"] ?? "").toLowerCase();
  if (!title) return null;

  const entry = registry.get(article.docId);
  if (!entry) return null;

  // Phase 4A: Actually scan raw/ for files that mention this concept
  const titleWords = title.split(/\s+/).filter((w) => w.length > 3);
  if (titleWords.length === 0) return null;

  try {
    const rawFiles = await scanDirectoryRecursive(rawDir);
    const filesToCheck = rawFiles.slice(0, 200); // Cap at 200 to bound runtime
    let hasSource = false;

    for (const file of filesToCheck) {
      try {
        const content = await readFile(file, "utf-8");
        const lower = content.toLowerCase();
        // Require at least 2 title words (or all if fewer than 2) to appear in the file
        const threshold = Math.min(2, titleWords.length);
        const matches = titleWords.filter((w) => lower.includes(w));
        if (matches.length >= threshold) {
          hasSource = true;
          break;
        }
      } catch {
        /* unreadable file */
      }
    }

    if (!hasSource) return null; // No evidence of source material
  } catch {
    return null; // rawDir doesn't exist or isn't readable
  }

  return {
    code: "STUB_WITH_SOURCES",
    severity: "info",
    message: `Stub article "${entry.canonicalTitle}" has source material in raw/ that could expand it`,
    docId: article.docId,
    suggestion: `Run "kb compile" to synthesize a full article from available sources.`,
    autoFixable: false,
  };
}

// ── Check 13: DUPLICATE_CANDIDATE ─────────────────────────────────────────────

export function checkDuplicateCandidates(
  articles: ParsedCompiledArticle[],
  threshold: number,
): LintIssue[] {
  const issues: LintIssue[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < articles.length; i++) {
    for (let j = i + 1; j < articles.length; j++) {
      const a = articles[i]!;
      const b = articles[j]!;

      const titleA = String(a.frontmatter["title"] ?? "").toLowerCase();
      const titleB = String(b.frontmatter["title"] ?? "").toLowerCase();

      if (!titleA || !titleB) continue;

      const similarity = titleSimilarity(titleA, titleB);
      if (similarity >= 1 - threshold) {
        const key = [a.docId, b.docId].sort().join("|");
        if (!seen.has(key)) {
          seen.add(key);
          issues.push({
            code: "DUPLICATE_CANDIDATE",
            severity: "warning",
            message: `Articles "${a.docId}" and "${b.docId}" have very similar titles ("${a.frontmatter["title"]}" vs "${b.frontmatter["title"]}")`,
            docId: a.docId,
            relatedTarget: b.docId,
            suggestion: `Consider merging these articles or disambiguating their titles. If they are distinct, add clarifying subtitles.`,
            autoFixable: false,
          });
        }
      }
    }
  }

  return issues;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Phase 3A: Word n-gram based title similarity.
 * Much more accurate than character-level Jaccard:
 * - "React" vs "React Native" → low similarity (different word sets)
 * - "PyTorch" vs "TorchPy" → low similarity (different words)
 *
 * For short titles (< 4 words): uses word-level Jaccard
 * For longer titles: uses word 2-gram Jaccard
 */
function titleSimilarity(a: string, b: string): number {
  if (a === b) return 1;

  const aWords = a
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .map(stemWord);
  const bWords = b
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .map(stemWord);

  // For short titles, use word-level Jaccard
  if (aWords.length < 4 || bWords.length < 4) {
    const setA = new Set(aWords);
    const setB = new Set(bWords);
    const intersection = new Set([...setA].filter((w) => setB.has(w)));
    const union = new Set([...setA, ...setB]);
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  // For longer titles, use 2-gram Jaccard
  const ngramsA = wordNgrams(aWords, 2);
  const ngramsB = wordNgrams(bWords, 2);
  const intersection = new Set([...ngramsA].filter((ng) => ngramsB.has(ng)));
  const union = new Set([...ngramsA, ...ngramsB]);
  return union.size > 0 ? intersection.size / union.size : 0;
}

/** Basic plural stemming — strips trailing 's', 'es', 'ies' for Jaccard comparison */
function stemWord(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.endsWith("es") && !word.endsWith("ses")) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function wordNgrams(words: string[], n: number): Set<string> {
  const ngrams = new Set<string>();
  for (let i = 0; i <= words.length - n; i++) {
    ngrams.add(words.slice(i, i + n).join(" "));
  }
  return ngrams;
}

// Phase 4A: Recursive directory scanner for stub source checking
async function scanDirectoryRecursive(dir: string): Promise<string[]> {
  const files: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        files.push(...(await scanDirectoryRecursive(fullPath)));
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  } catch {
    /* unreadable dir */
  }
  return files;
}

// ── Check 14: CONTRADICTORY_CLAIMS (Phase 5D) ────────────────────────────────

/**
 * Detect when two articles make contradictory factual statements about
 * the same subject. Uses pattern matching for "X is/has/uses N" claims
 * and flags when different articles disagree on numeric values.
 */
export function checkContradictoryClaims(
  articles: ParsedCompiledArticle[],
  _registry: ConceptRegistry,
): LintIssue[] {
  // Extract factual claims in "subject is/has/uses value" patterns
  const factPattern =
    /\b([\w][\w\s]{2,30})\b\s+(?:is|are|has|have|uses?|contains?|requires?)\s+(\d[\d,.]*\s*\w*)/gi;

  const factsByEntity = new Map<string, Array<{ docId: string; claim: string; value: string }>>();

  for (const article of articles) {
    let match: RegExpExecArray | null;
    const re = new RegExp(factPattern.source, "gi");
    while ((match = re.exec(article.body))) {
      const entity = match[1]!.trim().toLowerCase();
      if (entity.length < 3) continue; // Skip very short matches
      const value = match[2]!.trim();
      const list = factsByEntity.get(entity) ?? [];
      list.push({ docId: article.docId, claim: match[0], value });
      factsByEntity.set(entity, list);
    }
  }

  const issues: LintIssue[] = [];
  for (const [entity, facts] of factsByEntity) {
    if (facts.length < 2) continue;
    // Check if different articles state different numeric values for the same entity
    const uniqueValues = new Set(facts.map((f) => f.value.replace(/[,\s]/g, "")));
    if (uniqueValues.size > 1) {
      const docIds = [...new Set(facts.map((f) => f.docId))];
      if (docIds.length > 1) {
        issues.push({
          code: "CONTRADICTORY_CLAIMS",
          severity: "warning",
          message: `Potential contradiction about "${entity}": ${facts
            .slice(0, 3)
            .map((f) => `"${f.claim.slice(0, 80)}" (${f.docId})`)
            .join(" vs ")}`,
          docId: docIds[0]!,
          relatedTarget: docIds[1],
          suggestion: `Review these articles and reconcile the discrepancy.`,
          autoFixable: false,
        });
      }
    }
  }

  return issues;
}
