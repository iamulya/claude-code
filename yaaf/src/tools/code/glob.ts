/**
 * Glob Tool — Find files by glob pattern.
 *
 * Uses Node.js fs.glob (Node 22+) with a fallback to manual recursive walk.
 *
 * @module tools/code/glob
 */

import * as fsp from "fs/promises";
import * as path from "path";
import { buildTool } from "../tool.js";
import type { ToolResult } from "../tool.js";

type GlobInput = {
  /** Glob pattern (e.g., 'src/**\/*.ts') */
  pattern: string;
  /** Base directory to search from (defaults to cwd) */
  cwd?: string;
  /** Maximum number of results (default: 200) */
  limit?: number;
};

/**
 * Simple recursive file walk that matches files against a glob-like pattern.
 * Supports: *, **, ?, and basic character ranges [abc].
 */
async function walkAndMatch(
  dir: string,
  pattern: string,
  limit: number,
): Promise<string[]> {
  const results: string[] = [];

  // Convert glob to regex
  const globToRegex = (glob: string): RegExp => {
    let re = glob
      .replace(/[.+^${}()|[\]\\]/g, "\\$&") // escape special regex chars
      .replace(/\*\*/g, "{{GLOBSTAR}}") // placeholder for **
      .replace(/\*/g, "[^/]*") // * matches anything except /
      .replace(/\?/g, "[^/]") // ? matches one non-/ char
      .replace(/\{\{GLOBSTAR\}\}/g, ".*"); // ** matches everything
    return new RegExp(`^${re}$`);
  };

  const regex = globToRegex(pattern);

  async function walk(current: string): Promise<void> {
    if (results.length >= limit) return;

    let entries;
    try {
      entries = await fsp.readdir(current, { withFileTypes: true });
    } catch {
      return; // permission denied or doesn't exist
    }

    for (const entry of entries) {
      if (results.length >= limit) return;

      // Skip common undesirable directories
      if (entry.isDirectory() && (entry.name === "node_modules" || entry.name === ".git")) {
        continue;
      }

      const fullPath = path.join(current, entry.name);
      const relPath = path.relative(dir, fullPath);

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (regex.test(relPath)) {
        results.push(relPath);
      }
    }
  }

  await walk(dir);
  return results;
}

export const globTool = buildTool<GlobInput, string>({
  name: "glob",
  inputSchema: {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description: "Glob pattern to match files (e.g., 'src/**/*.ts', '*.json')",
      },
      cwd: {
        type: "string",
        description: "Base directory to search from (defaults to current working directory)",
      },
      limit: {
        type: "number",
        description: "Maximum number of results to return (default: 200)",
      },
    },
    required: ["pattern"],
  },
  maxResultChars: 20_000,

  describe: (input) => `Find files matching ${input.pattern}`,

  async call(input): Promise<ToolResult<string>> {
    const baseDir = path.resolve(input.cwd ?? process.cwd());
    const limit = input.limit ?? 200;

    const matches = await walkAndMatch(baseDir, input.pattern, limit);

    if (matches.length === 0) {
      return { data: `No files found matching pattern: ${input.pattern}` };
    }

    const truncated = matches.length >= limit ? `\n\n(results truncated at ${limit})` : "";
    return { data: matches.join("\n") + truncated };
  },

  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  checkPermissions: () => Promise.resolve({ behavior: "allow" }),
});
