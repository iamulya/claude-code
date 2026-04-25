import { readFile } from "fs/promises";
import { join } from "path";
import type { ConceptRegistry } from "../../ontology/index.js";
import { parseYamlFrontmatter } from "../../utils/frontmatter.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ParsedCompiledArticle = {
  /** Relative docId (no .md extension), e.g. "concepts/attention-mechanism" */
  docId: string;
  /** Absolute path to the compiled file */
  filePath: string;
  /** Parsed frontmatter key-value pairs */
  frontmatter: Record<string, unknown>;
  /** Markdown body after the frontmatter block */
  body: string;
};

// ── Reader ────────────────────────────────────────────────────────────────────

/**
 * Read all compiled articles referenced by the registry.
 * Articles that fail to read (deleted, permissions, etc.) are skipped
 * with a warning logged via the optional reporter.
 */
export async function readCompiledArticles(
  registry: ConceptRegistry,
  compiledDir: string,
  onSkip?: (docId: string, reason: string) => void,
): Promise<ParsedCompiledArticle[]> {
  // Q2: Correct bounded concurrency via coroutine-worker pattern.
  const allDocIds = Array.from(registry.keys());
  const CONCURRENCY = 8;
  let nextIdx = 0;
  const results: Array<{ docId: string; result: PromiseSettledResult<ParsedCompiledArticle> }> =
    new Array(allDocIds.length);

  const runWorker = async (): Promise<void> => {
    while (nextIdx < allDocIds.length) {
      const idx = nextIdx++;
      const docId = allDocIds[idx]!;
      const filePath = join(compiledDir, `${docId}.md`);
      try {
        const raw = await readFile(filePath, "utf-8");
        results[idx] = { docId, result: { status: "fulfilled", value: parseCompiledArticle(docId, filePath, raw) } };
      } catch (e) {
        results[idx] = { docId, result: { status: "rejected", reason: e } };
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, allDocIds.length) }, runWorker),
  );

  const articles: ParsedCompiledArticle[] = [];
  for (const entry of results) {
    if (!entry) continue;
    if (entry.result.status === "fulfilled") {
      articles.push(entry.result.value);
    } else {
      const err = entry.result.reason instanceof Error
        ? entry.result.reason
        : new Error(String(entry.result.reason));
      onSkip?.(entry.docId, `Could not read: ${err.message}`);
    }
  }

  return articles;
}

/**
 * Parse one compiled markdown file into frontmatter + body.
 * Uses the shared yaml-library-based parser (utils/frontmatter.ts).
 */
export function parseCompiledArticle(
  docId: string,
  filePath: string,
  raw: string,
): ParsedCompiledArticle {
  // M4: CRLF-blind regex -- normalize before parsing
  const normalized = raw.replace(/\r\n/g, "\n");
  const fmMatch = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  if (!fmMatch) {
    return { docId, filePath, frontmatter: {}, body: raw.trim() };
  }

  // Use shared yaml-library-based parser instead of hand-rolled parseSimpleYaml
  const frontmatter = parseYamlFrontmatter(fmMatch[1]!);
  const body = fmMatch[2]?.trim() ?? "";

  return { docId, filePath, frontmatter, body };
}
