/**
 * Write File Tool — Write or create a file with content.
 *
 * Auto-creates parent directories. Delegates to ToolContext.writeFile
 * when available (sandbox-safe).
 *
 * @module tools/code/writeFile
 */

import * as fsp from "fs/promises";
import * as path from "path";
import { buildTool } from "../tool.js";
import type { ToolResult } from "../tool.js";

type WriteFileInput = {
  /** File path to write (absolute or relative) */
  path: string;
  /** Content to write */
  content: string;
};

export const writeFileTool = buildTool<WriteFileInput, string>({
  name: "write_file",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "File path to write to (absolute or relative). Parent directories are created automatically.",
      },
      content: {
        type: "string",
        description: "Content to write to the file",
      },
    },
    required: ["path", "content"],
  },
  maxResultChars: 1_000,

  describe: (input) => `Write to ${input.path}`,

  async call(input, ctx): Promise<ToolResult<string>> {
    const filePath = path.resolve(input.path);

    if (ctx.writeFile) {
      await ctx.writeFile(filePath, input.content);
    } else {
      await fsp.mkdir(path.dirname(filePath), { recursive: true });
      await fsp.writeFile(filePath, input.content, "utf8");
    }

    const lines = input.content.split("\n").length;
    return { data: `Wrote ${lines} lines to ${filePath}` };
  },

  isReadOnly: () => false,
  isDestructive: () => false,
  isConcurrencySafe: () => false,
});
