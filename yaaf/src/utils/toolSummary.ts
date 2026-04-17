/**
 * Tool-Use Summary Generator — human-readable summaries of tool batches.
 *
 * Inspired by toolUseSummaryGenerator.ts from the main repo.
 * Generates concise one-line labels (e.g., "Fixed NPE in UserService",
 * "Read config.json") using a small/fast model.
 *
 * @example
 * ```ts
 * const summary = await generateToolUseSummary({
 * tools: [
 * { name: 'read_file', input: { path: 'src/auth.ts' }, output: '...' },
 * { name: 'edit_file', input: { path: 'src/auth.ts', ... }, output: 'OK' },
 * ],
 * model: smallModel,
 * });
 * // → "Fixed auth validation in auth.ts"
 * ```
 */

import type { ChatModel } from "../agents/runner.js";

// ── Types ────────────────────────────────────────────────────────────────────

export type ToolInfo = {
  name: string;
  input: unknown;
  output: unknown;
};

export type ToolSummaryConfig = {
  /** Tools executed in this batch. */
  tools: ToolInfo[];
  /** The model to use for summarization (small/fast recommended). */
  model: ChatModel;
  /** Abort signal. */
  signal?: AbortSignal;
  /** Most recent assistant text for context. */
  lastAssistantText?: string;
};

// ── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Write a short summary label describing what these tool calls accomplished. It appears as a single-line row in an app and truncates around 30 characters, so think git-commit-subject, not sentence.

Keep the verb in past tense and the most distinctive noun. Drop articles, connectors, and long location context first.

Examples:
- Searched in auth/
- Fixed NPE in UserService
- Created signup endpoint
- Read config.json
- Ran failing tests`;

// ── generateToolUseSummary ───────────────────────────────────────────────────

/**
 * Generate a human-readable one-line summary of completed tools.
 *
 * @returns A brief summary string, or null if generation fails.
 */
export async function generateToolUseSummary(config: ToolSummaryConfig): Promise<string | null> {
  const { tools, model, signal, lastAssistantText } = config;

  if (tools.length === 0) return null;

  try {
    const toolSummaries = tools
      .map((tool) => {
        const inputStr = truncateJson(tool.input, 300);
        const outputStr = truncateJson(tool.output, 300);
        return `Tool: ${tool.name}\nInput: ${inputStr}\nOutput: ${outputStr}`;
      })
      .join("\n\n");

    const contextPrefix = lastAssistantText
      ? `User's intent (from assistant's last message): ${lastAssistantText.slice(0, 200)}\n\n`
      : "";

    const result = await model.complete({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `${contextPrefix}Tools completed:\n\n${toolSummaries}\n\nLabel:` },
      ],
      tools: [],
      signal,
    });

    const text = typeof result.content === "string" ? result.content.trim() : "";
    return text || null;
  } catch {
    // Summaries are non-critical — swallow errors
    return null;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function truncateJson(value: unknown, maxLength: number): string {
  try {
    const str = JSON.stringify(value);
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - 3) + "...";
  } catch {
    return "[unable to serialize]";
  }
}
