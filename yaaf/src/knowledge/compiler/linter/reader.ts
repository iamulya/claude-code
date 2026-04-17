/**
 * Compiled article reader
 *
 * Reads compiled markdown files from disk, parses their frontmatter,
 * and returns a normalized representation for the lint checks.
 * This module is the I/O layer for the linter — all other modules are pure.
 */

import { readFile } from "fs/promises";
import { join } from "path";
import type { ConceptRegistry } from "../../ontology/index.js";

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
  const results = await Promise.allSettled(
    Array.from(registry.keys()).map(async (docId) => {
      const filePath = join(compiledDir, `${docId}.md`);
      const raw = await readFile(filePath, "utf-8");
      return parseCompiledArticle(docId, filePath, raw);
    }),
  );

  const articles: ParsedCompiledArticle[] = [];

  for (const [i, result] of results.entries()) {
    const docId = Array.from(registry.keys())[i]!;
    if (result.status === "fulfilled") {
      articles.push(result.value);
    } else {
      const err = result.reason instanceof Error ? result.reason : new Error(String(result.reason));
      onSkip?.(docId, `Could not read: ${err.message}`);
    }
  }

  return articles;
}

/**
 * Parse one compiled markdown file into frontmatter + body.
 * Reuses the same minimal YAML parser used by the synthesizer.
 */
export function parseCompiledArticle(
  docId: string,
  filePath: string,
  raw: string,
): ParsedCompiledArticle {
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  if (!fmMatch) {
    return { docId, filePath, frontmatter: {}, body: raw.trim() };
  }

  const frontmatter = parseSimpleYaml(fmMatch[1]!);
  const body = fmMatch[2]?.trim() ?? "";

  return { docId, filePath, frontmatter, body };
}

// ── Simple YAML parser (same impl as synthesizer/frontmatter.ts parseFrontmatterYaml) ──

function parseSimpleYaml(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = yaml.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;
    const colonIdx = line.indexOf(":");
    if (colonIdx <= 0) {
      i++;
      continue;
    }

    const key = line.slice(0, colonIdx).trim();
    const rest = line.slice(colonIdx + 1).trim();

    if (!key) {
      i++;
      continue;
    }

    if (rest === "" || rest === "|") {
      const listItems: string[] = [];
      i++;
      while (i < lines.length && /^\s+-\s+/.test(lines[i]!)) {
        const item = lines[i]!.replace(/^\s+-\s+/, "").trim();
        listItems.push(stripQuotes(item));
        i++;
      }
      result[key] = listItems.length > 0 ? listItems : null;
      continue;
    }

    if (rest.startsWith("[") && rest.endsWith("]")) {
      try {
        result[key] = JSON.parse(rest.replace(/'/g, '"'));
      } catch {
        result[key] = rest
          .slice(1, -1)
          .split(",")
          .map((s) => stripQuotes(s.trim()));
      }
      i++;
      continue;
    }

    result[key] = parseScalar(rest);
    i++;
  }

  return result;
}

function parseScalar(raw: string): unknown {
  const s = stripQuotes(raw);
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw === "null" || raw === "~" || raw === "") return null;
  const n = Number(raw);
  if (!Number.isNaN(n) && raw !== "") return n;
  return s;
}

function stripQuotes(s: string): string {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}
