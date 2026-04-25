/**
 * C2 — Linter Discovery Mode
 *
 * LLM-powered graph analysis to find structural gaps in the knowledge base.
 * Opt-in — requires explicit `--discover` flag.
 *
 * Discovery scans the entire KB and identifies:
 * - Missing articles: concepts mentioned frequently but without dedicated articles
 * - Weak connections: articles that should cross-reference each other but don't
 * - Depth imbalances: entity types with uneven coverage depth
 * - Suggested new content: topics the KB should cover based on its current scope
 */

import type { LLMCallFn } from "./llmClient.js";
import type { ConceptRegistry } from "../ontology/index.js";
import type { KBOntology } from "../ontology/index.js";
import { DiscoveryResponseSchema } from "./schemas.js";
import { readFile, readdir, stat } from "fs/promises";
import { join, relative } from "path";
import { randomBytes } from "crypto";

// ── Types ─────────────────────────────────────────────────────────────────────

export type DiscoveryOptions = {
  /** Maximum LLM calls. Default: 5 (each covers a batch of articles) */
  maxCalls?: number;
  /** Progress callback */
  onProgress?: (event: DiscoveryProgressEvent) => void;
};

export type DiscoveryProgressEvent =
  | { type: "discovery:start"; articleCount: number }
  | { type: "discovery:analyzing"; batch: number; totalBatches: number }
  | { type: "discovery:complete"; result: DiscoveryResult };

export type DiscoveryResult = {
  /** Concepts mentioned often but without their own article */
  missingArticles: DiscoverySuggestion[];
  /** Pairs of articles that should cross-reference each other */
  weakConnections: DiscoveryConnection[];
  /** Entity types with coverage imbalances */
  depthImbalances: DepthImbalance[];
  /** Number of LLM calls made */
  llmCalls: number;
  /** Total elapsed time (ms) */
  durationMs: number;
};

export type DiscoverySuggestion = {
  /** Suggested article title */
  title: string;
  /** Suggested entity type */
  entityType: string;
  /** Why this article should exist */
  reason: string;
  /** How many existing articles mention this concept */
  mentionCount: number;
};

export type DiscoveryConnection = {
  /** Source article docId */
  fromDocId: string;
  /** Target article docId */
  toDocId: string;
  /** Why these should be connected */
  reason: string;
};

export type DepthImbalance = {
  /** Entity type with the imbalance */
  entityType: string;
  /** Number of articles of this type */
  articleCount: number;
  /** Average word count */
  avgWordCount: number;
  /** Suggestion for improvement */
  suggestion: string;
};

// ── Discovery Engine ──────────────────────────────────────────────────────────

/**
 * Run LLM-powered discovery analysis on the compiled KB.
 *
 * @example
 * ```ts
 * const llm = makeKBLLMClient()
 * const result = await discoverGaps(llm, compiledDir, registry, ontology)
 * for (const suggestion of result.missingArticles) {
 * console.log(`Missing: ${suggestion.title} (${suggestion.reason})`)
 * }
 * ```
 */
export async function discoverGaps(
  llm: LLMCallFn,
  compiledDir: string,
  registry: ConceptRegistry,
  ontology: KBOntology,
  options: DiscoveryOptions = {},
): Promise<DiscoveryResult> {
  const startMs = Date.now();
  const maxCalls = options.maxCalls ?? 5;
  const emit = options.onProgress ?? (() => {});

  // Load all compiled articles
  const articles = await loadAllArticles(compiledDir);
  emit({ type: "discovery:start", articleCount: articles.length });

  if (articles.length === 0) {
    return {
      missingArticles: [],
      weakConnections: [],
      depthImbalances: [],
      llmCalls: 0,
      durationMs: Date.now() - startMs,
    };
  }

  // Phase 1: Static analysis (free — no LLM)
  const depthImbalances = analyzeDepthImbalances(articles, ontology);

  // Phase 2: LLM-based gap analysis (batched)
  const batchSize = Math.max(10, Math.ceil(articles.length / maxCalls));
  const batches = batchArticles(articles, batchSize);
  const totalBatches = Math.min(batches.length, maxCalls);

  let llmCalls = 0;
  const allMissing: DiscoverySuggestion[] = [];
  const allConnections: DiscoveryConnection[] = [];

  // Build the context: list of all current articles
  const articleIndex = articles
    .map((a) => `- ${a.title} (${a.entityType}) [${a.docId}] — ${a.wordCount}w`)
    .join("\n");

  const entityTypes = Object.keys(ontology.entityTypes).join(", ");

  for (let i = 0; i < totalBatches; i++) {
    emit({ type: "discovery:analyzing", batch: i + 1, totalBatches });

    const batch = batches[i]!;
    const batchDelimiter = `===DISCOVERY_BATCH_${randomBytes(6).toString("hex")}===`;
    const batchSummaries = batch
      .map((a) => `### ${a.title} (${a.docId})\n${a.body.slice(0, 500)}...`)
      .join("\n\n");
    // 2.4 fix: fence article summaries with a random delimiter so that a compiled
    // article whose body starts with injection instructions cannot break out of the
    // article section to hijack the discovery LLM.
    const fencedBatch = `${batchDelimiter}\n${batchSummaries}\n${batchDelimiter}`;


    try {
      const response = await llm({
        system: `You are a knowledge base architect. Analyze a batch of articles and identify gaps.

Your response must be valid JSON with this structure:
{
 "missingArticles": [
 { "title": "...", "entityType": "...", "reason": "..." }
 ],
 "weakConnections": [
 { "fromDocId": "...", "toDocId": "...", "reason": "..." }
 ]
}

Rules:
- Only suggest MISSING articles for concepts mentioned in the text but without their own article
- Only suggest CONNECTIONS between articles that exist (use docIds from the index)
- Entity types must be one of: ${entityTypes}
- Be conservative — only suggest high-confidence gaps
- Maximum 5 missing articles and 5 connections per batch`,
        user: `## Current KB Index
${articleIndex}

## Batch ${i + 1} of ${totalBatches} — Articles to analyze:
${fencedBatch}

Identify missing articles and weak connections for this batch.`,

        temperature: 0.3,
        maxTokens: 2048,
      });

      llmCalls++;

      const parsed = parseDiscoveryResponse(response, articles);
      allMissing.push(...parsed.missingArticles);
      allConnections.push(...parsed.weakConnections);
    } catch {
      // LLM failure — continue with other batches
    }
  }

  // Deduplicate missing articles by title
  const seenTitles = new Set<string>();
  const uniqueMissing = allMissing.filter((m) => {
    const key = m.title.toLowerCase();
    if (seenTitles.has(key)) return false;
    // Also skip if already in registry
    for (const entry of registry.values()) {
      if (entry.canonicalTitle.toLowerCase() === key) return false;
    }
    seenTitles.add(key);
    return true;
  });

  // Count mentions for each suggested missing article
  const allText = articles
    .map((a) => a.body)
    .join(" ")
    .toLowerCase();
  for (const suggestion of uniqueMissing) {
    const term = suggestion.title.toLowerCase();
    suggestion.mentionCount = (
      allText.match(new RegExp(`\\b${escapeRegex(term)}\\b`, "gi")) ?? []
    ).length;
  }

  // Sort by mention count descending
  uniqueMissing.sort((a, b) => b.mentionCount - a.mentionCount);

  // Deduplicate connections
  const seenConnections = new Set<string>();
  const uniqueConnections = allConnections.filter((c) => {
    const key = [c.fromDocId, c.toDocId].sort().join("|");
    if (seenConnections.has(key)) return false;
    seenConnections.add(key);
    return true;
  });

  const result: DiscoveryResult = {
    missingArticles: uniqueMissing,
    weakConnections: uniqueConnections,
    depthImbalances,
    llmCalls,
    durationMs: Date.now() - startMs,
  };

  emit({ type: "discovery:complete", result });
  return result;
}

// ── Static analysis ───────────────────────────────────────────────────────────

function analyzeDepthImbalances(
  articles: ArticleSummary[],
  ontology: KBOntology,
): DepthImbalance[] {
  const byType = new Map<string, ArticleSummary[]>();
  for (const a of articles) {
    const group = byType.get(a.entityType) ?? [];
    group.push(a);
    byType.set(a.entityType, group);
  }

  const imbalances: DepthImbalance[] = [];

  for (const [entityType] of Object.entries(ontology.entityTypes)) {
    const typeArticles = byType.get(entityType) ?? [];
    if (typeArticles.length === 0) {
      imbalances.push({
        entityType,
        articleCount: 0,
        avgWordCount: 0,
        suggestion: `No articles of type "${entityType}" exist. Add source material for this entity type.`,
      });
      continue;
    }

    const avgWords = Math.round(
      typeArticles.reduce((sum, a) => sum + a.wordCount, 0) / typeArticles.length,
    );
    const stubs = typeArticles.filter((a) => a.isStub);

    if (stubs.length > typeArticles.length / 2) {
      imbalances.push({
        entityType,
        articleCount: typeArticles.length,
        avgWordCount: avgWords,
        suggestion: `${stubs.length}/${typeArticles.length} articles are stubs. Add more source material to expand them.`,
      });
    }
  }

  return imbalances;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type ArticleSummary = {
  docId: string;
  title: string;
  entityType: string;
  isStub: boolean;
  wordCount: number;
  body: string;
};

async function loadAllArticles(compiledDir: string): Promise<ArticleSummary[]> {
  const files = await scanMarkdownFiles(compiledDir);
  const articles: ArticleSummary[] = [];

  for (const filePath of files) {
    const raw = await readFile(filePath, "utf-8");
    const relPath = relative(compiledDir, filePath);
    const docId = relPath.replace(/\\/g, "/").replace(/\.md$/, "");

    // Skip part files and assets
    if (docId.startsWith("assets/")) continue;

    // P2: CRLF normalization — same class as reader.ts/M4.
    // Windows-format compiled files cause silent skip without this.
    const normalized = raw.replace(/\r\n/g, "\n");
    const fmMatch = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!fmMatch) continue;

    const fm = fmMatch[1] ?? "";
    const body = fmMatch[2]?.trim() ?? "";

    const title = fm.match(/^title:\s*['"]?(.+?)['"]?\s*$/m)?.[1] ?? docId;
    const entityType = fm.match(/^entity_type:\s*(.+?)\s*$/m)?.[1] ?? "unknown";
    const isStub = /^stub:\s*true/m.test(fm);
    const wordCount = body.split(/\s+/).filter(Boolean).length;

    articles.push({ docId, title, entityType, isStub, wordCount, body });
  }

  return articles;
}

function parseDiscoveryResponse(
  response: string,
  articles: ArticleSummary[],
): { missingArticles: DiscoverySuggestion[]; weakConnections: DiscoveryConnection[] } {
  try {
    // Extract JSON from response (may be wrapped in ```json blocks)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { missingArticles: [], weakConnections: [] };

    // Sprint 1b: Validate LLM output with DiscoveryResponseSchema
    const result = DiscoveryResponseSchema.safeParse(JSON.parse(jsonMatch[0]));
    if (!result.success) return { missingArticles: [], weakConnections: [] };

    const parsed = result.data;
    const docIds = new Set(articles.map((a) => a.docId));

    const missingArticles: DiscoverySuggestion[] = parsed.missingArticles
      .map((m) => ({
        title: m.title,
        entityType: m.entityType,
        reason: m.reason,
        mentionCount: 0,
      }));

    const weakConnections: DiscoveryConnection[] = parsed.weakConnections
      .filter(
        (c) => docIds.has(c.fromDocId) && docIds.has(c.toDocId),
      )
      .map((c) => ({
        fromDocId: c.fromDocId,
        toDocId: c.toDocId,
        reason: c.reason,
      }));

    return { missingArticles, weakConnections };
  } catch {
    return { missingArticles: [], weakConnections: [] };
  }
}

function batchArticles(articles: ArticleSummary[], batchSize: number): ArticleSummary[][] {
  const batches: ArticleSummary[][] = [];
  for (let i = 0; i < articles.length; i += batchSize) {
    batches.push(articles.slice(i, i + batchSize));
  }
  return batches;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function scanMarkdownFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  try {
    const entries = await readdir(dir);
    for (const entry of entries) {
      const full = join(dir, entry);
      const s = await stat(full);
      if (s.isDirectory()) files.push(...(await scanMarkdownFiles(full)));
      else if (s.isFile() && entry.endsWith(".md")) files.push(full);
    }
  } catch {
    /* dir may not exist */
  }
  return files.sort();
}
