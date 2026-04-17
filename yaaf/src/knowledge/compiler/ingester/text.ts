/**
 * Plain Text Ingester
 *
 * Handles: .txt, .csv, .tsv
 * Zero optional dependencies.
 */

import { readFile } from "fs/promises";
import type { Ingester, IngestedContent, IngesterOptions } from "./types.js";

export const plainTextIngester: Ingester = {
  supportedMimeTypes: ["text/plain", "text/csv"],
  supportedExtensions: ["txt", "csv", "tsv"],
  requiresOptionalDeps: false,

  async ingest(filePath: string, options: IngesterOptions = {}): Promise<IngestedContent> {
    const text = await readFile(filePath, "utf-8");

    // Extract title from first non-empty line
    const firstLine = text
      .split("\n")
      .find((l) => l.trim().length > 0)
      ?.trim();

    return {
      text,
      images: [],
      mimeType: "text/plain",
      sourceFile: filePath,
      title: firstLine?.slice(0, 80),
      metadata: {},
      lossy: false,
      sourceUrl: options.sourceUrl,
    };
  },
};

// ── JSON / YAML Ingester ─────────────────────────────────────────────────────

/**
 * JSON / YAML Ingester
 *
 * Handles: .json, .yaml, .yml
 *
 * Converts structured data to a human-readable text representation
 * that the Knowledge Synthesizer can process. JSON is pretty-printed
 * and prefixed with a summary of the top-level structure.
 */
import { join, dirname } from "path";

export const jsonIngester: Ingester = {
  supportedMimeTypes: ["application/json", "application/yaml"],
  supportedExtensions: ["json", "yaml", "yml"],
  requiresOptionalDeps: false,

  async ingest(filePath: string, options: IngesterOptions = {}): Promise<IngestedContent> {
    const raw = await readFile(filePath, "utf-8");

    let parsed: unknown;
    let title: string | undefined;
    let text: string;

    try {
      parsed = JSON.parse(raw);

      // Extract title from common fields
      if (typeof parsed === "object" && parsed !== null) {
        const obj = parsed as Record<string, unknown>;
        title = String(obj["title"] ?? obj["name"] ?? obj["id"] ?? "").slice(0, 80) || undefined;
      }

      // Pretty-print with structural summary
      const keys = typeof parsed === "object" && parsed !== null ? Object.keys(parsed) : [];

      const summary =
        keys.length > 0
          ? `# ${title ?? "JSON Document"}\n\nTop-level fields: ${keys.join(", ")}\n\n`
          : "";

      text = summary + "```json\n" + JSON.stringify(parsed, null, 2) + "\n```";
    } catch {
      // Not valid JSON — treat as plain text (may be YAML or malformed JSON)
      text = raw;
    }

    return {
      text,
      images: [],
      mimeType: "application/json",
      sourceFile: filePath,
      title,
      metadata: {},
      lossy: false,
      sourceUrl: options.sourceUrl,
    };
  },
};

// ── Source Code Ingester ─────────────────────────────────────────────────────

/**
 * Source Code Ingester
 *
 * Handles: .ts, .tsx, .js, .jsx, .py, .go, .rs, .java, .cpp, .c, .sh
 *
 * Wraps the source code in a fenced code block with language detection
 * and extracts the file-level docstring/JSDoc comment as the title/summary.
 */
export const codeIngester: Ingester = {
  supportedMimeTypes: [
    "text/typescript",
    "text/javascript",
    "text/x-python",
    "text/x-go",
    "text/x-rust",
    "text/x-java",
    "text/x-c++",
    "text/x-c",
    "text/x-sh",
  ],
  supportedExtensions: ["ts", "tsx", "js", "jsx", "py", "go", "rs", "java", "cpp", "c", "sh"],
  requiresOptionalDeps: false,

  async ingest(filePath: string, options: IngesterOptions = {}): Promise<IngestedContent> {
    const raw = await readFile(filePath, "utf-8");
    const ext = filePath.split(".").pop()?.toLowerCase() ?? "txt";

    const langMap: Record<string, string> = {
      ts: "typescript",
      tsx: "tsx",
      js: "javascript",
      jsx: "jsx",
      py: "python",
      go: "go",
      rs: "rust",
      java: "java",
      cpp: "cpp",
      c: "c",
      sh: "bash",
    };
    const lang = langMap[ext] ?? ext;

    // Extract file-level docstring as title/summary
    let title: string | undefined;
    let docstring: string | undefined;

    // JSDoc / block comment at file top
    const jsdocMatch = raw.match(/^\/\*\*([\s\S]+?)\*\//);
    if (jsdocMatch) {
      docstring = jsdocMatch[1]!
        .split("\n")
        .map((l) => l.replace(/^\s*\*\s?/, ""))
        .join("\n")
        .trim();
      title = docstring.split("\n")[0]?.trim().slice(0, 80);
    }

    // Python docstring
    if (!docstring && ext === "py") {
      const pyDoc = raw.match(/^"""([\s\S]+?)"""/);
      if (pyDoc) {
        docstring = pyDoc[1]!.trim();
        title = docstring.split("\n")[0]?.trim().slice(0, 80);
      }
    }

    // Single-line comment at top
    if (!title) {
      const commentMatch = raw.match(/^(?:\/\/|#)\s*(.+)/);
      if (commentMatch) title = commentMatch[1]!.trim().slice(0, 80);
    }

    const summaryBlock = docstring ? `${docstring}\n\n` : "";
    const text = `${summaryBlock}\`\`\`${lang}\n${raw}\n\`\`\``;

    return {
      text,
      images: [],
      mimeType: `text/${lang}`,
      sourceFile: filePath,
      title,
      metadata: { language: lang },
      lossy: false,
      sourceUrl: options.sourceUrl,
    };
  },
};
