/**
 * Bash Tool — Execute shell commands.
 *
 * Delegates to ToolContext.exec when available (sandbox-safe).
 * Enforces a configurable timeout (default: 30s).
 *
 * @module tools/code/bash
 */

import { execFile } from "child_process";
import { buildTool } from "../tool.js";
import type { Tool, ToolResult } from "../tool.js";

type BashInput = {
  /** Shell command to execute */
  command: string;
  /** Working directory (defaults to process.cwd()) */
  cwd?: string;
  /** Timeout in milliseconds (defaults to 30000) */
  timeout?: number;
};

/**
 * Create a bash tool with a configurable default timeout.
 *
 * @param defaultTimeoutMs Default command timeout in ms (default: 30_000)
 */
export function bashTool(defaultTimeoutMs = 30_000): Tool<BashInput, string> {
  return buildTool<BashInput, string>({
    name: "bash",
    inputSchema: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "Shell command to execute. Use PAGER=cat for commands that use paging.",
        },
        cwd: {
          type: "string",
          description: "Working directory for the command (defaults to current directory)",
        },
        timeout: {
          type: "number",
          description: `Timeout in milliseconds (default: ${defaultTimeoutMs})`,
        },
      },
      required: ["command"],
    },
    maxResultChars: 50_000,

    describe: (input) => `Run: ${input.command.slice(0, 80)}`,

    async call(input, ctx): Promise<ToolResult<string>> {
      const timeout = input.timeout ?? defaultTimeoutMs;

      if (ctx.exec) {
        // Sandbox-safe path — delegate to sandbox's executor
        const result = await ctx.exec(input.command);
        const output = [
          result.stdout ? `stdout:\n${result.stdout}` : "",
          result.stderr ? `stderr:\n${result.stderr}` : "",
          `exit code: ${result.exitCode}`,
        ]
          .filter(Boolean)
          .join("\n\n");
        return { data: output };
      }

      // Direct execution path (no sandbox)
      return new Promise<ToolResult<string>>((resolve) => {
        const child = execFile(
          "/bin/sh",
          ["-c", input.command],
          {
            cwd: input.cwd ?? process.cwd(),
            timeout,
            maxBuffer: 1024 * 1024, // 1MB
            env: { ...process.env, PAGER: "cat" },
            signal: ctx.signal,
          },
          (error, stdout, stderr) => {
            const exitCode = error && "code" in error ? (error as { code?: number }).code ?? 1 : 0;
            const output = [
              stdout ? `stdout:\n${stdout}` : "",
              stderr ? `stderr:\n${stderr}` : "",
              `exit code: ${exitCode}`,
            ]
              .filter(Boolean)
              .join("\n\n");
            resolve({ data: output });
          },
        );

        // Handle AbortSignal
        if (ctx.signal) {
          ctx.signal.addEventListener(
            "abort",
            () => {
              child.kill("SIGTERM");
            },
            { once: true },
          );
        }
      });
    },

    isReadOnly: () => false,
    isDestructive: () => true,
    isConcurrencySafe: () => false,
  });
}
