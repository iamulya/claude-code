/**
 * Code Tools — Built-in toolset for code-centric agents (Gap #4)
 *
 * Provides production-grade implementations of common tools:
 * - `read_file` — Read file contents with line range support
 * - `write_file` — Write/create files with auto-directory creation
 * - `edit_file` — Search-and-replace within files
 * - `bash` — Execute shell commands with timeout
 * - `glob` — Find files by glob pattern
 * - `grep` — Search file contents by pattern
 * - `web_fetch` — Fetch URL content with SSRF protection
 *
 * All tools respect YAAF's sandbox architecture:
 * - When a Sandbox is configured, tools delegate to ToolContext's
 *   readFile/writeFile/exec methods (sandbox-enforced).
 * - Without a sandbox, tools use direct fs/child_process access.
 *
 * @example
 * ```ts
 * import { Agent, codeToolset } from 'yaaf';
 *
 * const agent = new Agent({
 *   systemPrompt: 'You are a coding assistant.',
 *   tools: codeToolset(),
 *   sandbox: projectSandbox(),
 * });
 *
 * // Or disable specific tools:
 * const safeTools = codeToolset({ disabled: ['bash', 'write_file'] });
 * ```
 *
 * @module tools/code
 */

import type { Tool } from "../tool.js";
import { readFileTool } from "./readFile.js";
import { writeFileTool } from "./writeFile.js";
import { editFileTool } from "./editFile.js";
import { bashTool } from "./bash.js";
import { globTool } from "./glob.js";
import { grepTool } from "./grep.js";
import { webFetchTool } from "./webFetch.js";

export { readFileTool } from "./readFile.js";
export { writeFileTool } from "./writeFile.js";
export { editFileTool } from "./editFile.js";
export { bashTool } from "./bash.js";
export { globTool } from "./glob.js";
export { grepTool } from "./grep.js";
export { webFetchTool } from "./webFetch.js";

/** Options for the code toolset factory */
export type CodeToolsetOptions = {
  /** Disable specific tools by name (e.g., ['bash', 'write_file']) */
  disabled?: string[];
  /** Bash command timeout in ms (default: 30_000) */
  bashTimeout?: number;
  /** Allowed domains for web_fetch (default: all non-SSRF domains) */
  fetchAllowlist?: string[];
};

/**
 * Create a complete code toolset for code-centric agents.
 *
 * Returns an array of production-grade tools for file operations,
 * shell execution, and web fetching. All tools respect YAAF's
 * sandbox architecture.
 *
 * @param options Configuration options
 * @returns Array of Tool instances
 *
 * @example Default (all tools)
 * ```ts
 * const agent = new Agent({
 *   tools: codeToolset(),
 * });
 * ```
 *
 * @example Read-only tools only
 * ```ts
 * const agent = new Agent({
 *   tools: codeToolset({ disabled: ['write_file', 'edit_file', 'bash'] }),
 * });
 * ```
 *
 * @example With restricted web access
 * ```ts
 * const agent = new Agent({
 *   tools: codeToolset({
 *     fetchAllowlist: ['api.github.com', 'docs.python.org'],
 *   }),
 * });
 * ```
 */
export function codeToolset(options?: CodeToolsetOptions): Tool[] {
  const all: Tool[] = [
    readFileTool,
    writeFileTool,
    editFileTool,
    bashTool(options?.bashTimeout),
    globTool,
    grepTool,
    webFetchTool(options?.fetchAllowlist),
  ];

  const disabled = new Set(options?.disabled ?? []);
  return all.filter((t) => !disabled.has(t.name));
}
