/**
 * Grep Tool — Search file contents by pattern.
 *
 * Searches files recursively for a text or regex pattern.
 * Returns matching lines with file paths and line numbers.
 *
 * @module tools/code/grep
 */

import * as fsp from "fs/promises";
import * as path from "path";
import { buildTool } from "../tool.js";
import type { ToolResult } from "../tool.js";

type GrepInput = {
  /** Search pattern (string or regex) */
  pattern: string;
  /** Directory or file to search (defaults to cwd) */
  path?: string;
  /** Treat pattern as regex (default: false, literal string) */
  isRegex?: boolean;
  /** Case-insensitive search (default: false) */
  caseInsensitive?: boolean;
  /** File extension filter (e.g., '.ts', '.py') */
  include?: string;
  /** Maximum number of matches (default: 50) */
  limit?: number;
};

type GrepMatch = {
  file: string;
  line: number;
  content: string;
};

async function searchFile(
  filePath: string,
  regex: RegExp,
  baseDir: string,
  limit: number,
  results: GrepMatch[],
): Promise<void> {
  if (results.length >= limit) return;

  let content: string;
  try {
    // Skip binary files (read first 512 bytes to check)
    const stat = await fsp.stat(filePath);
    if (stat.size > 5 * 1024 * 1024) return; // Skip files > 5MB
    content = await fsp.readFile(filePath, "utf8");
    if (content.includes("\0")) return; // Skip binary
  } catch {
    return;
  }

  const relPath = path.relative(baseDir, filePath);
  const lines = content.split("\n");

  for (let i = 0; i < lines.length && results.length < limit; i++) {
    if (regex.test(lines[i]!)) {
      results.push({
        file: relPath,
        line: i + 1,
        content: lines[i]!,
      });
    }
  }
}

async function searchDir(
  dir: string,
  regex: RegExp,
  baseDir: string,
  includeExt: string | undefined,
  limit: number,
  results: GrepMatch[],
): Promise<void> {
  if (results.length >= limit) return;

  let entries;
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (results.length >= limit) return;

    if (
      entry.isDirectory() &&
      (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist")
    ) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await searchDir(fullPath, regex, baseDir, includeExt, limit, results);
    } else if (!includeExt || entry.name.endsWith(includeExt)) {
      await searchFile(fullPath, regex, baseDir, limit, results);
    }
  }
}

export const grepTool = buildTool<GrepInput, string>({
  name: "grep",
  inputSchema: {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description: "Search pattern (literal string by default, regex if isRegex is true)",
      },
      path: {
        type: "string",
        description: "Directory or file to search (defaults to current working directory)",
      },
      isRegex: {
        type: "boolean",
        description: "Treat pattern as a regular expression (default: false)",
      },
      caseInsensitive: {
        type: "boolean",
        description: "Case-insensitive search (default: false)",
      },
      include: {
        type: "string",
        description: "Filter by file extension (e.g., '.ts', '.py')",
      },
      limit: {
        type: "number",
        description: "Maximum number of matches (default: 50)",
      },
    },
    required: ["pattern"],
  },
  maxResultChars: 50_000,

  describe: (input) => `Search for "${input.pattern.slice(0, 40)}"`,

  async call(input): Promise<ToolResult<string>> {
    const searchPath = path.resolve(input.path ?? process.cwd());
    const limit = input.limit ?? 50;
    const flags = input.caseInsensitive ? "gi" : "g";

    let regex: RegExp;
    if (input.isRegex) {
      try {
        regex = new RegExp(input.pattern, flags);
      } catch (err) {
        return {
          data: `Invalid regex pattern: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    } else {
      // Escape special regex characters for literal search
      const escaped = input.pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      regex = new RegExp(escaped, flags);
    }

    const results: GrepMatch[] = [];
    const stat = await fsp.stat(searchPath);

    if (stat.isFile()) {
      await searchFile(searchPath, regex, path.dirname(searchPath), limit, results);
    } else {
      await searchDir(searchPath, regex, searchPath, input.include, limit, results);
    }

    if (results.length === 0) {
      return { data: `No matches found for pattern: ${input.pattern}` };
    }

    const output = results
      .map((m) => `${m.file}:${m.line}: ${m.content}`)
      .join("\n");

    const truncated = results.length >= limit ? `\n\n(results capped at ${limit} matches)` : "";
    return { data: output + truncated };
  },

  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  checkPermissions: () => Promise.resolve({ behavior: "allow" }),
});
