/**
 * Knowledge Base Compiler Schemas
 *
 * Zod schemas for validating all LLM-generated and parsed data at the
 * KB compiler boundary. These act as the contract between YAAF and
 * untrusted LLM/user input.
 *
 * Sprint 0b: Created as part of the schema validation layer.
 * All LLM extraction, grounding, and frontmatter parsing now validates
 * through these schemas before any further processing.
 *
 * @module knowledge/compiler/schemas
 */

import { z } from "zod";

// ── Extraction Pipeline ──────────────────────────────────────────────────────

/**
 * Schema for the extraction plan returned by the LLM extractor.
 * Validates each proposed article has required fields and valid formats.
 */
export const ExtractionArticleSchema = z.object({
  canonicalTitle: z.string().min(1).max(200),
  entityType: z.string().min(1),
  action: z.enum(["create", "update", "merge", "skip"]),
  docIdSuggestion: z
    .string()
    .regex(/^[a-z][a-z0-9\-\/]+$/)
    .optional(),
  confidence: z.number().min(0).max(1).default(0.5),
  sources: z.array(z.string()).min(1),
  relatedArticles: z.array(z.string()).default([]),
  referencedBy: z.array(z.string()).default([]),
});

export const ExtractionPlanSchema = z.object({
  articles: z.array(ExtractionArticleSchema),
});

export type ExtractionPlan = z.infer<typeof ExtractionPlanSchema>;

// ── Grounding Pipeline ───────────────────────────────────────────────────────

/**
 * Schema for the L3 grounding verdict returned by the LLM verifier.
 * On parse failure, the grounding pipeline classifies as 'uncertain' (fail-closed).
 */
export const GroundingVerdictSchema = z.object({
  verdict: z.enum(["supported", "unsupported", "uncertain"]),
  reason: z.string().max(500).optional(),
});

export type GroundingVerdict = z.infer<typeof GroundingVerdictSchema>;

// ── Article Frontmatter ──────────────────────────────────────────────────────

/**
 * Schema for parsed article frontmatter.
 * Uses .passthrough() to allow ontology-defined custom fields.
 */
export const ArticleFrontmatterSchema = z
  .object({
    title: z.string().min(1),
    entity_type: z.string().min(1),
    doc_id: z
      .string()
      .regex(/^[a-z][a-z0-9\-\/]+$/),
    confidence: z.number().min(0).max(1).default(0.5),
    sources: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    grounding_score: z.number().min(0).max(1).optional(),
    grounding_mode: z
      .enum(["vocabulary_only", "embedding", "llm_verified"])
      .optional(),
    source_quality: z
      .enum(["peer_reviewed", "official_docs", "blog", "transcription", "unknown"])
      .default("unknown"),
  })
  .passthrough();

export type ArticleFrontmatter = z.infer<typeof ArticleFrontmatterSchema>;

// ── Synthesis Response ───────────────────────────────────────────────────────

/**
 * Schema for the LLM synthesis response (a complete markdown article).
 * Validates the metadata wrapper, not the markdown body itself.
 */
export const SynthesisArticleSchema = z.object({
  docId: z.string().min(1),
  title: z.string().min(1),
  entityType: z.string().min(1),
  markdown: z.string().min(10),
  confidence: z.number().min(0).max(1).default(0.5),
  sources: z.array(z.string()).default([]),
});

export type SynthesisArticle = z.infer<typeof SynthesisArticleSchema>;

// ── Discovery Response (LLM output) ─────────────────────────────────────────

export const DiscoveryResponseSchema = z.object({
  missingArticles: z.array(z.object({
    title: z.string().min(1),
    entityType: z.string().min(1),
    reason: z.string().min(1),
  })).default([]),
  weakConnections: z.array(z.object({
    fromDocId: z.string().min(1),
    toDocId: z.string().min(1),
    reason: z.string().min(1),
  })).default([]),
});

export type DiscoveryResponse = z.infer<typeof DiscoveryResponseSchema>;

// ── Vocabulary Sidecar (.kb-vocab-sync.json) ─────────────────────────────────

export const VocabSidecarSchema = z.object({
  vocabulary: z.record(
    z.string(),
    z.object({
      aliases: z.array(z.string()).default([]),
      entityType: z.string().optional(),
      docId: z.string().optional(),
    }),
  ).optional(),
});

export type VocabSidecar = z.infer<typeof VocabSidecarSchema>;

// ── Source Hash Manifest (.kb-source-hashes.json) ────────────────────────────

export const SourceHashManifestSchema = z.object({
  version: z.literal(1),
  generatedAt: z.number(),
  hashes: z.record(z.string(), z.string()),
  ontologyHash: z.string().optional(),
});

// ── Ontology Proposals (.kb-ontology-proposals.json) ─────────────────────────

export const ProposalFileSchema = z.object({
  proposals: z.array(z.object({
    kind: z.enum(["add_entity_type", "add_vocabulary", "add_relationship", "add_field"]),
    confidence: z.number().min(0).max(1),
    reason: z.string(),
    entityType: z.string().optional(),
    term: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    details: z.record(z.string(), z.unknown()).optional(),
  })).default([]),
});

export type ProposalFile = z.infer<typeof ProposalFileSchema>;

