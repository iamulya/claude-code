/**
 * Read File Tool — Read file contents with optional line range support.
 *
 * Delegates to ToolContext.readFile when available (sandbox-safe) or
 * falls back to direct fs access when no sandbox is configured.
 *
 * @module tools/code/readFile
 */

import * as fsp from "fs/promises";
import * as path from "path";
import { buildTool } from "../tool.js";
import type { ToolResult } from "../tool.js";

type ReadFileInput = {
  /** Absolute or relative file path */
  path: string;
  /** Start line (1-indexed, inclusive) */
  startLine?: number;
  /** End line (1-indexed, inclusive) */
  endLine?: number;
};

function applyLineRange(
  content: string,
  startLine?: number,
  endLine?: number,
): string {
  if (startLine === undefined && endLine === undefined) return content;
  const lines = content.split("\n");
  const start = Math.max(1, startLine ?? 1) - 1;
  const end = Math.min(lines.length, endLine ?? lines.length);
  const selected = lines.slice(start, end);
  // Prepend line numbers for context
  return selected
    .map((line, i) => `${start + i + 1}: ${line}`)
    .join("\n");
}

export const readFileTool = buildTool<ReadFileInput, string>({
  name: "read_file",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Absolute or relative file path to read",
      },
      startLine: {
        type: "number",
        description: "Start line (1-indexed, inclusive). Omit to read from beginning.",
      },
      endLine: {
        type: "number",
        description: "End line (1-indexed, inclusive). Omit to read to end.",
      },
    },
    required: ["path"],
  },
  maxResultChars: 100_000,

  describe: (input) => `Read ${input.path}${input.startLine ? ` lines ${input.startLine}-${input.endLine ?? "end"}` : ""}`,

  async call(input, ctx): Promise<ToolResult<string>> {
    const filePath = path.resolve(input.path);

    let content: string;
    if (ctx.readFile) {
      // Sandbox-safe path — delegate to sandbox's file reader
      content = await ctx.readFile(filePath);
    } else {
      content = await fsp.readFile(filePath, "utf8");
    }

    // Check for binary content (null bytes)
    if (content.includes("\0")) {
      return { data: `[Binary file: ${filePath}]` };
    }

    const result = applyLineRange(content, input.startLine, input.endLine);
    return { data: result };
  },

  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  checkPermissions: () => Promise.resolve({ behavior: "allow" }),
});
