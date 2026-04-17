/**
 * KB Store — Read-only access to compiled Knowledge Base articles
 *
 * Provides a filesystem-backed store for reading compiled KB documents,
 * building an llms.txt-style index, and keyword searching over the KB.
 *
 * This is the runtime counterpart to the compile-time KBCompiler.
 */

import { readdir, readFile, stat } from "fs/promises";
import { join, extname, relative } from "path";
import { estimateTokens } from "../../utils/tokens.js";
import type { ConceptRegistry, ConceptRegistryEntry } from "../ontology/index.js";
import { deserializeRegistry } from "../ontology/index.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export type CompiledDocument = {
  /** Unique document identifier (e.g. "concepts/attention-mechanism") */
  docId: string;
  /** Canonical article title */
  title: string;
  /** Entity type from ontology */
  entityType: string;
  /** Full markdown body (without frontmatter) */
  body: string;
  /** Whether this is a stub article */
  isStub: boolean;
  /** Word count of the body */
  wordCount: number;
  /** Estimated token count */
  tokenEstimate: number;
  /** Raw frontmatter key-value pairs */
  frontmatter: Record<string, unknown>;
};

export type KBIndex = {
  /** Domain description from ontology */
  domain?: string;
  /** Total number of documents */
  totalDocuments: number;
  /** Total estimated tokens across all documents */
  totalTokenEstimate: number;
  /** Index entries grouped by entity type */
  entries: KBIndexEntry[];
};

export type KBIndexEntry = {
  docId: string;
  title: string;
  entityType: string;
  isStub: boolean;
  /** One-line summary (first sentence of body) */
  summary: string;
};

export type SearchResult = {
  docId: string;
  title: string;
  entityType: string;
  isStub: boolean;
  /** Relevance score (0-1) */
  score: number;
  /** Matching excerpt */
  excerpt: string;
};

// ── KBStore ───────────────────────────────────────────────────────────────────

export class KBStore {
  private readonly kbDir: string;
  private readonly compiledDir: string;
  private readonly registryPath: string;
  private documents: Map<string, CompiledDocument> = new Map();
  private loaded = false;

  constructor(kbDir: string, compiledDirName = "compiled") {
    this.kbDir = kbDir;
    this.compiledDir = join(kbDir, compiledDirName);
    this.registryPath = join(kbDir, ".kb-registry.json");
  }

  // ── Loading ─────────────────────────────────────────────────────────────────

  /**
   * Load all compiled documents from disk.
   * Must be called before any other method.
   */
  async load(): Promise<void> {
    this.documents.clear();

    const paths = await this.scanMarkdownFiles(this.compiledDir);

    await Promise.allSettled(
      paths.map(async (filePath) => {
        const raw = await readFile(filePath, "utf-8");
        const relPath = relative(this.compiledDir, filePath);
        const doc = this.parseDocument(relPath, raw);
        if (doc) this.documents.set(doc.docId, doc);
      }),
    );

    this.loaded = true;
  }

  private ensureLoaded(): void {
    if (!this.loaded) throw new Error("KBStore not loaded. Call load() first.");
  }

  // ── Read API ────────────────────────────────────────────────────────────────

  /**
   * Get a single compiled document by docId.
   */
  getDocument(docId: string): CompiledDocument | undefined {
    this.ensureLoaded();
    return this.documents.get(docId);
  }

  /**
   * Get all compiled documents.
   */
  getAllDocuments(): CompiledDocument[] {
    this.ensureLoaded();
    return Array.from(this.documents.values());
  }

  /**
   * Get the number of loaded documents.
   */
  get size(): number {
    return this.documents.size;
  }

  // ── Index Generation ────────────────────────────────────────────────────────

  /**
   * Build an llms.txt-style index of all documents.
   */
  buildIndex(): KBIndex {
    this.ensureLoaded();

    const entries: KBIndexEntry[] = [];
    let totalTokens = 0;

    for (const doc of this.documents.values()) {
      totalTokens += doc.tokenEstimate;
      entries.push({
        docId: doc.docId,
        title: doc.title,
        entityType: doc.entityType,
        isStub: doc.isStub,
        summary: this.extractSummary(doc.body),
      });
    }

    // Sort: non-stubs first, then by entity type, then title
    entries.sort((a, b) => {
      if (a.isStub !== b.isStub) return a.isStub ? 1 : -1;
      if (a.entityType !== b.entityType) return a.entityType.localeCompare(b.entityType);
      return a.title.localeCompare(b.title);
    });

    return {
      totalDocuments: entries.length,
      totalTokenEstimate: totalTokens,
      entries,
    };
  }

  /**
   * Format the index as an llms.txt plain-text string.
   */
  formatIndexAsLlmsTxt(index?: KBIndex): string {
    const idx = index ?? this.buildIndex();

    if (idx.entries.length === 0) {
      return "# Knowledge Base\n\n_No articles compiled yet._\n";
    }

    const lines: string[] = [
      `# Knowledge Base (${idx.totalDocuments} articles, ~${idx.totalTokenEstimate.toLocaleString()} tokens)`,
      "",
    ];

    // Group by entity type
    const byType = new Map<string, KBIndexEntry[]>();
    for (const entry of idx.entries) {
      const group = byType.get(entry.entityType) ?? [];
      group.push(entry);
      byType.set(entry.entityType, group);
    }

    for (const [type, entries] of byType) {
      const typeLabel = type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
      lines.push(`## ${typeLabel}s`);

      for (const entry of entries) {
        const stub = entry.isStub ? " _(stub)_" : "";
        lines.push(`- **${entry.title}**${stub}: ${entry.summary}`);
      }
      lines.push("");
    }

    return lines.join("\n");
  }

  // ── Search ──────────────────────────────────────────────────────────────────

  /**
   * Keyword search across all documents.
   * Searches titles, entity types, and body text.
   * No vector embeddings — pure text matching.
   */
  search(
    query: string,
    options: { maxResults?: number; entityType?: string } = {},
  ): SearchResult[] {
    this.ensureLoaded();
    const { maxResults = 10, entityType } = options;

    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 1);
    if (terms.length === 0) return [];

    const results: SearchResult[] = [];

    for (const doc of this.documents.values()) {
      if (entityType && doc.entityType !== entityType) continue;

      const titleLower = doc.title.toLowerCase();
      const bodyLower = doc.body.toLowerCase();

      // Score: title matches weighted 3x, body matches weighted 1x
      let score = 0;
      let matchedTerms = 0;

      for (const term of terms) {
        const titleHit = titleLower.includes(term);
        const bodyHit = bodyLower.includes(term);

        if (titleHit) {
          score += 3;
          matchedTerms++;
        } else if (bodyHit) {
          score += 1;
          matchedTerms++;
        }
      }

      // Skip if no terms matched
      if (matchedTerms === 0) continue;

      // Normalize score to 0-1
      const maxScore = terms.length * 3;
      const normalizedScore = Math.min(score / maxScore, 1);

      // Extract excerpt around first match
      const excerpt = this.extractExcerpt(doc.body, terms);

      results.push({
        docId: doc.docId,
        title: doc.title,
        entityType: doc.entityType,
        isStub: doc.isStub,
        score: normalizedScore,
        excerpt,
      });
    }

    // Sort by score descending, then by title
    results.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

    return results.slice(0, maxResults);
  }

  // ── Registry ────────────────────────────────────────────────────────────────

  /**
   * Load the concept registry from disk.
   */
  async loadRegistry(): Promise<ConceptRegistry> {
    try {
      const raw = await readFile(this.registryPath, "utf-8");
      return deserializeRegistry(raw);
    } catch {
      return new Map<string, ConceptRegistryEntry>();
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async scanMarkdownFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    try {
      const entries = await readdir(dir);
      await Promise.all(
        entries.map(async (entry) => {
          const full = join(dir, entry);
          const s = await stat(full);
          if (s.isDirectory()) {
            files.push(...(await this.scanMarkdownFiles(full)));
          } else if (s.isFile() && extname(entry) === ".md") {
            files.push(full);
          }
        }),
      );
    } catch {
      /* compiled/ may not exist */
    }
    return files.sort();
  }

  private parseDocument(relativePath: string, raw: string): CompiledDocument | null {
    const docId = relativePath.replace(/\\/g, "/").replace(/\.md$/, "");

    // Skip assets directory entries
    if (docId.startsWith("assets/")) return null;

    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!fmMatch) return null;

    const fm = fmMatch[1]!;
    const body = fmMatch[2]?.trim() ?? "";

    // Parse frontmatter key-value pairs
    const frontmatter: Record<string, unknown> = {};
    for (const line of fm.split("\n")) {
      const kvMatch = line.match(/^(\w[\w_-]*?):\s*(.+)$/);
      if (kvMatch) {
        const key = kvMatch[1]!;
        let value: unknown = kvMatch[2]!.trim();
        // Unquote strings
        if (typeof value === "string" && /^['"](.*)['"]$/.test(value)) {
          value = (value as string).slice(1, -1);
        }
        // Parse booleans
        if (value === "true") value = true;
        else if (value === "false") value = false;
        frontmatter[key] = value;
      }
    }

    const title = (frontmatter.title as string) ?? docId.split("/").pop() ?? docId;
    const entityType = (frontmatter.entity_type as string) ?? "unknown";
    const isStub = frontmatter.stub === true;
    const wordCount = body.split(/\s+/).filter(Boolean).length;
    const tokenEstimate = estimateTokens(body);

    return { docId, title, entityType, body, isStub, wordCount, tokenEstimate, frontmatter };
  }

  private extractSummary(body: string): string {
    // Try to get the first non-heading, non-empty paragraph
    const lines = body.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith("#")) continue;
      if (trimmed.startsWith("---")) continue;
      if (trimmed.startsWith("![")) continue;
      // Take first sentence
      const sentence = trimmed.match(/^(.+?[.!?])\s/);
      return (sentence?.[1] ?? trimmed).slice(0, 200);
    }
    return "";
  }

  private extractExcerpt(body: string, terms: string[]): string {
    const bodyLower = body.toLowerCase();
    let bestPos = -1;

    // Find earliest match
    for (const term of terms) {
      const pos = bodyLower.indexOf(term);
      if (pos >= 0 && (bestPos === -1 || pos < bestPos)) {
        bestPos = pos;
      }
    }

    if (bestPos === -1) return body.slice(0, 200);

    // Extract ~200 chars around the match
    const start = Math.max(0, bestPos - 80);
    const end = Math.min(body.length, bestPos + 120);
    let excerpt = body.slice(start, end).trim();

    if (start > 0) excerpt = "…" + excerpt;
    if (end < body.length) excerpt += "…";

    return excerpt;
  }
}
