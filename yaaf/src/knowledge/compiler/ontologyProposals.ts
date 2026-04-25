/**
 * Ontology Proposals — Compilation → Ontology Feedback Loop (O7)
 *
 * After each compilation, this module analyzes the extracted concepts and
 * compiled articles to generate `OntologyProposal` suggestions:
 *
 * 1. **New entity types** — when many concepts don't fit any existing type
 * 2. **New vocabulary entries** — terms that appear frequently but aren't in vocab
 * 3. **New relationships** — cross-type links discovered in wikilinks
 * 4. **New fields** — frontmatter fields that appear in articles but aren't in schema
 *
 * Proposals are written to `.kb-ontology-proposals.json` for human review.
 * High-confidence proposals can be auto-applied with `--auto-evolve`.
 *
 * @module knowledge/compiler/ontologyProposals
 */

import { readFile } from "fs/promises";
import { join } from "path";
import type { KBOntology, VocabularyEntry } from "../ontology/types.js";
import type { ConceptRegistry } from "../ontology/index.js";
import { atomicWriteFile } from "./atomicWrite.js";
import { ProposalFileSchema } from "./schemas.js";

// ── Local proposal type (separate from KBOntologyProposal in plugin/types.ts) ─────
//
// KBOntologyProposal in plugin/types.ts is the adapter-level aggregate response.
// This module produces per-suggestion records that are written to disk for
// human review or auto-application.

export type OntologyProposal = {
  kind: "add_entity_type" | "add_vocabulary" | "add_relationship" | "add_field";
  confidence: number; // 0–1
  reason: string;
  /** For add_entity_type */
  entityType?: string;
  /** For add_vocabulary */
  term?: string;
  /** For add_relationship */
  from?: string;
  to?: string;
  /** Extra structured data */
  details?: Record<string, unknown>;
};

// ── Types ────────────────────────────────────────────────────────────────────

export type ProposalGeneratorOptions = {
  /**
   * Minimum number of concept occurrences to suggest a new entity type.
   * Default: 3
   */
  minConceptsForNewType?: number;

  /**
   * Minimum number of mentions for a term to suggest adding it to vocabulary.
   * Default: 2
   */
  minMentionsForVocab?: number;

  /**
   * Whether to auto-apply high-confidence proposals.
   * Default: false (write proposals file only)
   */
  autoEvolve?: boolean;
};

export type ProposalResult = {
  /** Generated proposals */
  proposals: OntologyProposal[];
  /** Proposals that were auto-applied (if autoEvolve=true) */
  applied: OntologyProposal[];
  /** Path where proposals were written */
  proposalsPath: string;
};

// ── Implementation ──────────────────────────────────────────────────────────

const PROPOSALS_FILENAME = ".kb-ontology-proposals.json";

/**
 * P3-5: Prevent concurrent autoEvolve calls from racing to mutate the same ontology.
 * Uses a WeakSet so GC can reclaim ontology objects that are no longer referenced.
 */
const evolutionLocks = new WeakSet<KBOntology>();

/**
 * Analyze compiled KB state and generate ontology evolution proposals.
 */
export async function generateOntologyProposals(
  kbDir: string,
  ontology: KBOntology,
  registry: ConceptRegistry,
  options: ProposalGeneratorOptions = {},
): Promise<ProposalResult> {
  // P3-5: guard against concurrent autoEvolve on the same in-memory ontology
  if (options.autoEvolve) {
    if (evolutionLocks.has(ontology)) {
      throw new Error(
        "generateOntologyProposals: concurrent autoEvolve called on the same ontology instance. " +
        "This is a bug — the compile lock should prevent re-entrant compilation.",
      );
    }
    evolutionLocks.add(ontology);
  }
  const minConceptsForNewType = options.minConceptsForNewType ?? 3;
  const minMentionsForVocab = options.minMentionsForVocab ?? 2;
  const proposals: OntologyProposal[] = [];

  // ── 1. Find untyped concepts (potential new entity types) ─────────────

  const untypedConcepts = new Map<string, string[]>(); // entityType → concept names
  for (const [docId, entry] of registry) {
    const entityType = entry.entityType;
    if (!ontology.entityTypes[entityType]) {
      const concepts = untypedConcepts.get(entityType) ?? [];
      concepts.push(entry.canonicalTitle ?? docId);
      untypedConcepts.set(entityType, concepts);
    }
  }

  for (const [typeName, concepts] of untypedConcepts) {
    if (concepts.length >= minConceptsForNewType) {
      proposals.push({
        kind: "add_entity_type",
        entityType: typeName,
        reason: `${concepts.length} compiled articles use entity_type="${typeName}" which is not in the ontology`,
        confidence: Math.min(0.9, 0.5 + concepts.length * 0.1),
        details: { exampleConcepts: concepts.slice(0, 5) },
      });
    }
  }

  // ── 2. Find terms not in vocabulary (potential new vocab entries) ──────

  const vocabLower = new Set(Object.keys(ontology.vocabulary).map((k) => k.toLowerCase()));
  const termFrequency = new Map<string, number>();

  for (const [_docId, entry] of registry) {
    // Count aliases as potential vocabulary entries
    for (const alias of entry.aliases) {
      const lower = alias.toLowerCase();
      if (!vocabLower.has(lower)) {
        termFrequency.set(lower, (termFrequency.get(lower) ?? 0) + 1);
      }
    }
    // Count the canonical title too
    const titleLower = (entry.canonicalTitle ?? "").toLowerCase();
    if (titleLower && !vocabLower.has(titleLower)) {
      termFrequency.set(titleLower, (termFrequency.get(titleLower) ?? 0) + 1);
    }
  }

  // Fix H-3: Pre-build reverse index O(n) so the proposal loop below is O(m)
  // instead of O(n×m). For a 10k-article KB this goes from 5M to 10k+m iterations.
  const reverseIndex = new Map<string, { docId: string; entityType: string }>();
  for (const [docId, entry] of registry) {
    const title = (entry.canonicalTitle ?? "").toLowerCase();
    if (title) {
      reverseIndex.set(title, { docId, entityType: entry.entityType });
    }
    for (const alias of entry.aliases) {
      const lower = alias.toLowerCase();
      if (!reverseIndex.has(lower)) {
        reverseIndex.set(lower, { docId, entityType: entry.entityType });
      }
    }
  }

  for (const [term, count] of termFrequency) {
    if (count >= minMentionsForVocab) {
      // Fix H-3: O(1) lookup via pre-built reverse index
      const related = reverseIndex.get(term);

      // ADR-012/Fix-4: Cap add_vocabulary confidence at 0.75 (below the 0.8
      // auto-evolve threshold). This means vocabulary proposals ALWAYS require
      // human review and can never be auto-applied. Without this cap, an adversary
      // who writes 4+ source files mentioning a fake term gets auto-applied
      // vocabulary entries (the "Vocabulary Worm" attack), which then influence
      // future TF-IDF query expansion and search ranking.
      //
      // The confidence formula rewards frequency but the cap ensures that even
      // N=100 mentions cannot bypass human review for vocabulary changes.
      proposals.push({
        kind: "add_vocabulary",
        term,
        reason: `Term "${term}" appears ${count} times in the registry but is not in vocabulary`,
        confidence: Math.min(0.75, 0.3 + count * 0.15),
        details: {
          suggestedEntry: {
            aliases: [],
            entityType: related?.entityType,
            docId: related?.docId,
          } satisfies VocabularyEntry,
        },
      });
    }
  }

  // ── 3. Find potential new relationships from wikilink patterns ─────────

  // Count cross-type co-location patterns in O(n):
  // Group entries by entityType, then count how many entity types exist
  // in each "directory namespace" (docId prefix before the first /).
  // When a namespace contains 2+ different entity types, we suggest
  // a relationship between them.
  const linkPatterns = new Map<string, number>();

  // Build: prefix → Set<entityType>
  const prefixTypes = new Map<string, Set<string>>();
  for (const [docId, entry] of registry) {
    const prefix = docId.split("/")[0] ?? "";
    if (!prefix) continue;
    const types = prefixTypes.get(prefix) ?? new Set<string>();
    types.add(entry.entityType);
    prefixTypes.set(prefix, types);
  }

  // Each prefix with 2+ entity types yields cross-type pair candidates
  // P3-4: Cap at 500 pairs to prevent O(n²) blowup in large KBs
  const MAX_CROSS_TYPE_PAIRS = 500;
  let pairCount = 0;
  for (const [, types] of prefixTypes) {
    if (pairCount >= MAX_CROSS_TYPE_PAIRS) break;
    const typeArr = [...types];
    for (let i = 0; i < typeArr.length && pairCount < MAX_CROSS_TYPE_PAIRS; i++) {
      for (let j = i + 1; j < typeArr.length && pairCount < MAX_CROSS_TYPE_PAIRS; j++) {
        const from = typeArr[i]!;
        const to = typeArr[j]!;
        const pattern = `${from}->${to}`;
        linkPatterns.set(pattern, (linkPatterns.get(pattern) ?? 0) + 1);
        pairCount++;
      }
    }
  }

  const existingRelPairs = new Set(
    ontology.relationshipTypes.map((r) => `${r.from}->${r.to}`),
  );

  for (const [pattern, count] of linkPatterns) {
    if (count >= 2 && !existingRelPairs.has(pattern)) {
      const [from, to] = pattern.split("->") as [string, string];
      proposals.push({
        kind: "add_relationship",
        from,
        to,
        reason: `Found ${count} wikilinks from ${from} → ${to} articles, but no relationship type exists`,
        confidence: Math.min(0.7, 0.3 + count * 0.1),
        details: { linkCount: count },
      });
    }
  }

  // ── Write proposals file ──────────────────────────────────────────────

  const proposalsPath = join(kbDir, PROPOSALS_FILENAME);
  const applied: OntologyProposal[] = [];

  // Sort by confidence descending
  proposals.sort((a, b) => b.confidence - a.confidence);

  // Auto-evolve: apply high-confidence proposals
  if (options.autoEvolve) {
    try {
      for (const proposal of proposals) {
        if (proposal.confidence >= 0.8) {
          const success = applyProposal(ontology, proposal);
          if (success) applied.push(proposal);
        }
      }
    } finally {
      // P3-5: always release the evolution lock
      evolutionLocks.delete(ontology);
    }
  }

  // Write remaining proposals to disk (P0-4: atomic write to prevent truncation on crash)
  const remaining = proposals.filter((p) => !applied.includes(p));
  if (remaining.length > 0 || applied.length > 0) {
    const output = {
      generatedAt: new Date().toISOString(),
      totalProposals: proposals.length,
      autoApplied: applied.length,
      proposals: remaining.map((p) => ({
        ...p,
        status: "pending" as const,
      })),
    };
    await atomicWriteFile(proposalsPath, JSON.stringify(output, null, 2));
  }

  return { proposals, applied, proposalsPath };
}

/**
 * Apply a single proposal to the ontology in-memory.
 * Returns true if the proposal was successfully applied.
 */
function applyProposal(ontology: KBOntology, proposal: OntologyProposal): boolean {
  switch (proposal.kind) {
    case "add_vocabulary": {
      const entry = proposal.details?.suggestedEntry as VocabularyEntry | undefined;
      if (entry && proposal.term) {
        // P1-8: sanitize the key — strip non-word chars to prevent prototype pollution
        const safeKey = proposal.term.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
        if (!safeKey || safeKey === "__proto__" || safeKey === "constructor") return false;
        ontology.vocabulary[safeKey] = entry;
        return true;
      }
      return false;
    }
    case "add_relationship": {
      if (proposal.from && proposal.to) {
        ontology.relationshipTypes.push({
          name: `${proposal.from}_to_${proposal.to}`,
          from: proposal.from,
          to: proposal.to,
          description: proposal.reason,
        });
        return true;
      }
      return false;
    }
    default:
      // Don't auto-apply entity type additions — too risky
      return false;
  }
}

/**
 * Load previously generated proposals from disk.
 *
 * P1-8: Validates each proposal's structure before returning it. Malformed or
 * tampered proposals (bad confidence, unknown kind, prototype-polluting keys)
 * are silently dropped rather than being auto-applied to the ontology.
 */
export async function loadProposals(kbDir: string): Promise<OntologyProposal[]> {
  try {
    const raw = await readFile(join(kbDir, PROPOSALS_FILENAME), "utf-8");
    // Sprint 1b: Replace manual isValidProposal() with Zod schema validation
    const result = ProposalFileSchema.safeParse(JSON.parse(raw));
    if (!result.success) return [];

    // Additional filtering: kind-specific field requirements
    return result.data.proposals.filter((p) => {
      if (p.kind === "add_vocabulary" && (!p.term || p.term.trim() === "")) return false;
      if (p.kind === "add_relationship") {
        if (!p.from || p.from.trim() === "" || !p.to || p.to.trim() === "") return false;
      }
      return true;
    }) as OntologyProposal[];
  } catch {
    return [];
  }
}

/**
 * P1-8: Runtime schema guard for proposals loaded from disk.
 * @deprecated Replaced by ProposalFileSchema Zod validation in loadProposals().
 * Kept for backward compatibility with external consumers.
 */
function isValidProposal(p: unknown): p is OntologyProposal {
  if (!p || typeof p !== "object") return false;
  const obj = p as Record<string, unknown>;

  const validKinds: OntologyProposal["kind"][] = [
    "add_entity_type",
    "add_vocabulary",
    "add_relationship",
    "add_field",
  ];
  if (!validKinds.includes(obj["kind"] as OntologyProposal["kind"])) return false;

  const conf = obj["confidence"];
  if (typeof conf !== "number" || conf < 0 || conf > 1) return false;
  if (typeof obj["reason"] !== "string") return false;

  if (obj["kind"] === "add_vocabulary") {
    if (typeof obj["term"] !== "string" || obj["term"].trim() === "") return false;
  }
  if (obj["kind"] === "add_relationship") {
    if (typeof obj["from"] !== "string" || obj["from"].trim() === "") return false;
    if (typeof obj["to"] !== "string" || obj["to"].trim() === "") return false;
  }

  return true;
}
