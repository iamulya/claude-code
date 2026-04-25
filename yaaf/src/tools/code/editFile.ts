/**
 * Edit File Tool — Search-and-replace within a file.
 *
 * Uses a search-and-replace model (not line-based) for LLM-friendliness.
 * Delegates to ToolContext.readFile/writeFile when available (sandbox-safe).
 *
 * @module tools/code/editFile
 */

import * as fsp from "fs/promises";
import * as path from "path";
import { buildTool } from "../tool.js";
import type { ToolResult } from "../tool.js";

type EditFileInput = {
  /** File path to edit */
  path: string;
  /** The exact text to search for */
  search: string;
  /** The replacement text */
  replace: string;
  /** If true, replace all occurrences. Default: first only. */
  replaceAll?: boolean;
};

export const editFileTool = buildTool<EditFileInput, string>({
  name: "edit_file",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "File path to edit",
      },
      search: {
        type: "string",
        description: "Exact text to search for in the file. Must match exactly (whitespace-sensitive).",
      },
      replace: {
        type: "string",
        description: "Replacement text",
      },
      replaceAll: {
        type: "boolean",
        description: "If true, replace all occurrences. Default: replace first occurrence only.",
      },
    },
    required: ["path", "search", "replace"],
  },
  maxResultChars: 2_000,

  describe: (input) => `Edit ${input.path}`,

  async call(input, ctx): Promise<ToolResult<string>> {
    const filePath = path.resolve(input.path);

    // Read current content
    let content: string;
    if (ctx.readFile) {
      content = await ctx.readFile(filePath);
    } else {
      content = await fsp.readFile(filePath, "utf8");
    }

    // Validate that search text exists
    if (!content.includes(input.search)) {
      return {
        data: `Error: Search text not found in ${filePath}. The search string must match exactly (whitespace-sensitive).`,
      };
    }

    // Count occurrences
    const occurrences = content.split(input.search).length - 1;

    // Perform replacement
    let newContent: string;
    if (input.replaceAll) {
      newContent = content.split(input.search).join(input.replace);
    } else {
      // Use function replacement to avoid $ special character handling.
      // String.replace treats $&, $1, $', $` etc. as special in replacement strings.
      newContent = content.replace(input.search, () => input.replace);
    }

    // Write back
    if (ctx.writeFile) {
      await ctx.writeFile(filePath, newContent);
    } else {
      await fsp.writeFile(filePath, newContent, "utf8");
    }

    const replacedCount = input.replaceAll ? occurrences : 1;
    return {
      data: `Replaced ${replacedCount} occurrence${replacedCount > 1 ? "s" : ""} in ${filePath}`,
    };
  },

  isReadOnly: () => false,
  isDestructive: () => false,
  isConcurrencySafe: () => false,
});
