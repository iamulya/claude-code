/**
 * Reverse Citation Index
 *
 * Builds a bidirectional mapping between source files and compiled articles.
 * Enables operators to answer:
 * - "Which articles cite this source?" → sourceToArticles[sourcePath]
 * - "Which sources contribute to this article?" → articleToSources[docId]
 * - "Which sources contribute to the most articles?" → topSources
 *
 * Built from `compiled_from` frontmatter during compilation. The index is
 * persisted to `.kb-citation-index.json` for offline querying.
 *
 * Cost: One scan of compiled articles (piggybacks on existing lint/postprocess scan).
 */

import { readFile, readdir, stat } from "fs/promises";
import { join, relative } from "path";
import { atomicWriteFile } from "./atomicWrite.js";

// ── Types ────────────────────────────────────────────────────────────────────

export type CitationIndex = {
  /** Source file path → articles that were compiled from it */
  sourceToArticles: Record<string, string[]>;
  /** Article docId → source files it was compiled from */
  articleToSources: Record<string, string[]>;
  /** Top sources ordered by article count (descending) */
  topSources: Array<{ source: string; articleCount: number }>;
  /** ISO timestamp when this index was generated */
  generatedAt: string;
  /** Total number of unique source files referenced */
  totalSources: number;
  /** Total number of compiled articles indexed */
  totalArticles: number;
};

// ── Index builder ────────────────────────────────────────────────────────────

const CITATION_INDEX_FILENAME = ".kb-citation-index.json";

/**
 * Build the citation index by scanning all compiled articles' frontmatter.
 * Reads `compiled_from:` from each article to build bidirectional mappings.
 */
export async function buildCitationIndex(compiledDir: string): Promise<CitationIndex> {
  const sourceToArticles = new Map<string, Set<string>>();
  const articleToSources: Record<string, string[]> = {};

  // Recursively find all .md files
  const mdFiles = await walkMdFiles(compiledDir);

  for (const filePath of mdFiles) {
    try {
      const content = await readFile(filePath, "utf-8");
      const sources = parseCompiledFromFrontmatter(content);
      if (sources.length === 0) continue;

      const rel = relative(compiledDir, filePath);
      const docId = rel.replace(/\.md$/, "").replace(/\\/g, "/");

      articleToSources[docId] = sources;

      for (const source of sources) {
        if (!sourceToArticles.has(source)) {
          sourceToArticles.set(source, new Set());
        }
        sourceToArticles.get(source)!.add(docId);
      }
    } catch {
      /* skip unreadable files */
    }
  }

  // Convert sets to arrays and build topSources ranking
  const sourceToArticlesRecord: Record<string, string[]> = {};
  for (const [source, docs] of sourceToArticles) {
    sourceToArticlesRecord[source] = [...docs].sort();
  }

  const topSources = [...sourceToArticles.entries()]
    .map(([source, docs]) => ({ source, articleCount: docs.size }))
    .sort((a, b) => b.articleCount - a.articleCount)
    .slice(0, 20); // top 20 most-cited sources

  return {
    sourceToArticles: sourceToArticlesRecord,
    articleToSources,
    topSources,
    generatedAt: new Date().toISOString(),
    totalSources: sourceToArticles.size,
    totalArticles: Object.keys(articleToSources).length,
  };
}

/**
 * Build and persist the citation index to `.kb-citation-index.json`.
 */
export async function writeCitationIndex(
  kbDir: string,
  compiledDir: string,
): Promise<CitationIndex> {
  const index = await buildCitationIndex(compiledDir);
  const path = join(kbDir, CITATION_INDEX_FILENAME);
  await atomicWriteFile(path, JSON.stringify(index, null, 2));
  return index;
}

/**
 * Load a previously persisted citation index.
 * Returns null if the file doesn't exist.
 */
export async function loadCitationIndex(kbDir: string): Promise<CitationIndex | null> {
  const path = join(kbDir, CITATION_INDEX_FILENAME);
  try {
    const content = await readFile(path, "utf-8");
    return JSON.parse(content) as CitationIndex;
  } catch {
    return null;
  }
}

// ── Query helpers ────────────────────────────────────────────────────────────

/**
 * Find all articles affected by a source file becoming unreliable.
 * Answers: "If source X is wrong, which articles are contaminated?"
 */
export function articlesAffectedBySource(
  index: CitationIndex,
  sourcePath: string,
): string[] {
  return index.sourceToArticles[sourcePath] ?? [];
}

/**
 * Find articles that share sources with a given article.
 * Useful for finding related content or detecting potential contradiction chains.
 */
export function articlesWithSharedSources(
  index: CitationIndex,
  docId: string,
): Array<{ docId: string; sharedSourceCount: number }> {
  const mySources = new Set(index.articleToSources[docId] ?? []);
  if (mySources.size === 0) return [];

  const overlapCounts = new Map<string, number>();

  for (const source of mySources) {
    const sharedArticles = index.sourceToArticles[source] ?? [];
    for (const otherDocId of sharedArticles) {
      if (otherDocId === docId) continue;
      overlapCounts.set(otherDocId, (overlapCounts.get(otherDocId) ?? 0) + 1);
    }
  }

  return [...overlapCounts.entries()]
    .map(([docId, count]) => ({ docId, sharedSourceCount: count }))
    .sort((a, b) => b.sharedSourceCount - a.sharedSourceCount);
}

// ── Internal helpers ─────────────────────────────────────────────────────────

/** Parse compiled_from from frontmatter (simplified — no full YAML parse) */
function parseCompiledFromFrontmatter(content: string): string[] {
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) return [];
  const fm = fmMatch[1]!;

  // Block sequence
  const blockMatch = fm.match(/compiled_from:\s*\n((?:[ \t]*-[^\n]+\n?)+)/);
  if (blockMatch) {
    return blockMatch[1]!
      .split("\n")
      .map((l) => l.replace(/^\s*-\s*/, "").trim())
      .filter(Boolean);
  }

  // Inline list
  const inlineMatch = fm.match(/compiled_from:\s*\[([^\]]*)\]/);
  if (inlineMatch) {
    return inlineMatch[1]!
      .split(",")
      .map((s) => s.replace(/['"]/g, "").trim())
      .filter(Boolean);
  }

  return [];
}

/** Recursively find all .md files in a directory */
async function walkMdFiles(dir: string): Promise<string[]> {
  const out: string[] = [];

  async function recurse(d: string): Promise<void> {
    let entries: string[];
    try {
      entries = await readdir(d);
    } catch {
      return;
    }
    await Promise.all(
      entries.map(async (e) => {
        const full = join(d, e);
        try {
          const s = await stat(full);
          if (s.isDirectory()) {
            await recurse(full);
          } else if (full.endsWith(".md")) {
            out.push(full);
          }
        } catch {
          /* skip */
        }
      }),
    );
  }

  await recurse(dir);
  return out.sort();
}
