/**
 * Concept Extractor Prompt Builder
 *
 * Builds the system and user prompts for the LLM-based classification pass.
 * The extraction model (fast/cheap — gemini-2.5-flash or equivalent) reads:
 *
 * 1. The ontology's entity types and frontmatter schemas (what articles look like)
 * 2. The concept registry (what articles already exist — the "known universe")
 * 3. The vocabulary (canonical terms and aliases — the "known terminology")
 * 4. Pre-computed static analysis (entity mentions, directory hints)
 * 5. The ingested source text (truncated to fit the token budget)
 *
 * And produces a JSON compilation plan describing what article(s) to create
 * or update and with what relationships.
 *
 * Prompt engineering principles applied:
 * - Ground the LLM in the ontology domain before showing the source
 * - Front-load the most constraining information (entity types, registry)
 * - Show the static analysis as pre-computed facts the LLM can rely on
 * - Keep the JSON schema minimal and explicit
 * - Use few-shot examples for the expected JSON format
 */

import type { KBOntology, ConceptRegistry } from "../../ontology/index.js";
import type { IngestedContent } from "../ingester/index.js";
import type { StaticAnalysisResult } from "./types.js";

// ── Token budget ──────────────────────────────────────────────────────────────

/** Maximum characters of source text to include in the extraction prompt */
const SOURCE_TEXT_MAX_CHARS = 8_000;

/**
 * Maximum registry entries to show in the prompt.
 * Too many entries overwhelm the LLM and reduce classification accuracy.
 * We prioritize entries that match vocabulary mentions in the source.
 */
const MAX_REGISTRY_ENTRIES_IN_PROMPT = 30;

// ── System prompt ─────────────────────────────────────────────────────────────

export function buildExtractionSystemPrompt(ontology: KBOntology): string {
  const entityTypeBlocks = Object.entries(ontology.entityTypes)
    .map(([typeName, schema]) => {
      const requiredFields = Object.entries(schema.frontmatter.fields)
        .filter(([, f]) => f.required)
        .map(([name, f]) => `${name} (${f.type}): ${f.description}`)
        .join(", ");

      const sections = schema.articleStructure.map((s) => s.heading).join(", ");

      return [
        ` ${typeName}: ${schema.description}`,
        requiredFields ? ` Required frontmatter: ${requiredFields}` : "",
        sections ? ` Article sections: ${sections}` : "",
        schema.linkableTo.length > 0 ? ` Can link to: ${schema.linkableTo.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  const relTypes = ontology.relationshipTypes
    .map((r) => ` ${r.name}: (${r.from} → ${r.to}) ${r.description}`)
    .join("\n");

  return [
    `You are a knowledge base compilation assistant for the following domain:`,
    `"${ontology.domain}"`,
    ``,
    `Your task is to analyze source documents and produce a structured compilation`,
    `plan describing what KB articles to create or update.`,
    ``,
    `# Entity Types`,
    `These are the only valid entity types. You MUST classify each article as one of these:`,
    ``,
    entityTypeBlocks,
    ``,
    `# Relationship Types`,
    relTypes ? relTypes : ` (none defined)`,
    ``,
    `# Rules`,
    `1. One source can produce multiple articles (e.g., a survey paper → many concept updates).`,
    `2. Multiple sources on the SAME entity must be grouped into ONE article plan.`,
    `3. "update" means an article already exists in the registry — merge new info.`,
    `4. "skip" ONLY for clearly non-KB content: changelogs, licenses, test fixtures, READMEs with no conceptual content.`,
    `5. docId format: {entityType}s/{slug} where slug is lowercase + hyphens. Example: concepts/attention-mechanism`,
    `6. candidateNewConcepts are entities mentioned but NOT in the registry — suggest creating stubs.`,
    `7. Your output must be valid JSON matching the schema exactly.`,
  ].join("\n");
}

// ── User prompt ───────────────────────────────────────────────────────────────

export function buildExtractionUserPrompt(
  content: IngestedContent,
  staticResult: StaticAnalysisResult,
  registry: ConceptRegistry,
  ontology: KBOntology,
): string {
  // Select the most relevant registry entries to show
  const relevantRegistryEntries = selectRelevantRegistryEntries(staticResult, registry);

  const registryBlock =
    relevantRegistryEntries.length > 0
      ? relevantRegistryEntries
          .map((e) => ` - "${e.canonicalTitle}" [${e.entityType}] → docId: ${e.docId}`)
          .join("\n")
      : " (empty — this is the first compilation run)";

  // Vocabulary terms that appear in the source
  const mentionedVocabBlock =
    staticResult.entityMentions.length > 0
      ? staticResult.entityMentions
          .slice(0, 20)
          .map(
            (m) =>
              ` - "${m.canonicalTerm}" [${m.entityType ?? "unknown"}] (${m.count}x)${m.docId ? ` → compiled at: ${m.docId}` : " → NOT YET COMPILED"}`,
          )
          .join("\n")
      : " (none detected)";

  // Registry matches (already-compiled articles that match this source)
  const registryMatchBlock =
    staticResult.registryMatches.length > 0
      ? staticResult.registryMatches
          .map(
            (m) =>
              ` - "${m.canonicalTitle}" [${m.entityType}] docId=${m.docId} confidence=${(m.confidence * 100).toFixed(0)}%`,
          )
          .join("\n")
      : " (no strong matches — likely a new article)";

  // Directory convention hint
  const directoryHint = staticResult.directoryHint
    ? `\nDirectory convention suggests entity type: **${staticResult.directoryHint}**`
    : "";

  // Truncate source text to token budget
  // K1: guard against undefined text — image-only PDFs have IngestedContent.text = undefined.
  // Both .length and .slice() throw TypeError on undefined (fifth occurrence of this class of bug).
  const rawText = content.text ?? "";
  const sourceText =
    rawText.length > SOURCE_TEXT_MAX_CHARS
      ? rawText.slice(0, SOURCE_TEXT_MAX_CHARS) +
        `\n\n[... truncated at ${SOURCE_TEXT_MAX_CHARS} chars — ${rawText.length - SOURCE_TEXT_MAX_CHARS} chars omitted ...]`
      : rawText;

  // Image summary (if any)
  const imageBlock =
    content.images.length > 0
      ? `Images: ${content.images.length} local images found (${content.images.map((i) => i.altText || "untitled").join(", ")})`
      : "";

  return [
    `# Source Document`,
    `File: ${content.sourceFile}`,
    `MIME type: ${content.mimeType}`,
    content.title ? `Detected title: "${content.title}"` : "",
    content.sourceUrl ? `Original URL: ${content.sourceUrl}` : "",
    imageBlock,
    directoryHint,
    ``,
    `## Pre-detected Entity Mentions (static vocabulary scan)`,
    mentionedVocabBlock,
    ``,
    `## Registry Matches (articles that likely overlap with this source)`,
    registryMatchBlock,
    ``,
    `## Knowledge Base Registry (compiled articles you can link to)`,
    registryBlock,
    ``,
    `## Source Text`,
    `\`\`\``,
    sourceText,
    `\`\`\``,
    ``,
    `---`,
    ``,
    `Produce a JSON object with this exact schema:`,
    ``,
    `\`\`\`json`,
    JSON.stringify(EXTRACTION_RESPONSE_SCHEMA_EXAMPLE, null, 2),
    `\`\`\``,
    ``,
    `IMPORTANT: entityType must be one of: ${Object.keys(ontology.entityTypes).join(", ")}`,
    `docId format: {entityType}s/{hyphen-slug} e.g., concepts/attention-mechanism`,
    `knownLinkDocIds: ONLY use docIds from the registry shown above.`,
    `Output ONLY valid JSON, no markdown, no explanation.`,
  ]
    .filter((l) => l !== "")
    .join("\n");
}

// ── Response schema example ───────────────────────────────────────────────────

/**
 * Example JSON that shows the LLM exactly what structure to produce.
 * Used as a few-shot example in the prompt.
 */
const EXTRACTION_RESPONSE_SCHEMA_EXAMPLE = {
  articles: [
    {
      canonicalTitle: "Attention Mechanism",
      entityType: "concept",
      action: "create",
      existingDocId: null,
      docIdSuggestion: "concepts/attention-mechanism",
      knownLinkDocIds: ["concepts/transformer", "tools/pytorch"],
      candidateNewConcepts: [
        {
          name: "Query-Key-Value Attention",
          entityType: "concept",
          description: "The specific formulation of attention using query, key, and value matrices",
          mentionCount: 3,
        },
      ],
      suggestedFrontmatter: {
        tags: ["nlp", "transformers", "deep-learning"],
        year_introduced: "2017",
      },
      skipReason: null,
      confidence: 0.92,
    },
  ],
};

// ── Registry selection ────────────────────────────────────────────────────────

/**
 * Select the most relevant registry entries to include in the prompt.
 * Prioritizes entries that match vocabulary mentions in the source.
 * Falls back to all entries (up to the cap) if no vocabulary matches found.
 */
function selectRelevantRegistryEntries(
  staticResult: StaticAnalysisResult,
  registry: ConceptRegistry,
): Array<{ docId: string; canonicalTitle: string; entityType: string }> {
  // Start with entries that directly match vocabulary mentions
  const mentionedDocIds = new Set(
    staticResult.entityMentions.filter((m) => m.docId).map((m) => m.docId!),
  );

  const prioritized: Array<{ docId: string; canonicalTitle: string; entityType: string }> = [];

  // First: add direct vocabulary matches
  for (const docId of mentionedDocIds) {
    const entry = registry.get(docId);
    if (entry) {
      prioritized.push({
        docId: entry.docId,
        canonicalTitle: entry.canonicalTitle,
        entityType: entry.entityType,
      });
    }
  }

  // Then: fill up to the cap with remaining entries, sorted by title
  if (prioritized.length < MAX_REGISTRY_ENTRIES_IN_PROMPT) {
    const remaining = Array.from(registry.values())
      .filter((e) => !mentionedDocIds.has(e.docId))
      .sort((a, b) => a.canonicalTitle.localeCompare(b.canonicalTitle))
      .slice(0, MAX_REGISTRY_ENTRIES_IN_PROMPT - prioritized.length);

    prioritized.push(...remaining);
  }

  return prioritized.slice(0, MAX_REGISTRY_ENTRIES_IN_PROMPT);
}
