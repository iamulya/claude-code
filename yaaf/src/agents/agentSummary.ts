/**
 * Agent Summary — periodic background progress summarization for sub-agents.
 *
 * Inspired by AgentSummary/agentSummary.ts from the main repo. When a
 * coordinator spawns workers, each worker periodically generates a 3-5 word
 * progress summary (e.g., "Reading config.json", "Fixing null check") for
 * UI display.
 *
 * @example
 * ```ts
 * const summaryHandle = startAgentSummarization({
 * agentId: 'worker-1',
 * model: smallFastModel,
 * getMessages: () => worker.messages,
 * onSummary: (text) => updateUI(`Worker 1: ${text}`),
 * });
 *
 * // Later, when agent is done:
 * summaryHandle.stop();
 * ```
 */

import type { ChatModel } from "./runner.js";

// ── Types ────────────────────────────────────────────────────────────────────

export type AgentSummarizationConfig = {
  /** Unique agent identifier */
  agentId: string;
  /** A small/fast model for generating summaries (not the main model) */
  model: ChatModel;
  /** Function that returns the agent's current message history */
  getMessages: () => Array<{ role: string; content: string }>;
  /** Called with the summary text when generated */
  onSummary: (summary: string) => void;
  /** Interval between summaries in ms. Default: 30_000 (30s). */
  intervalMs?: number;
  /** Minimum messages before generating a summary. Default: 3. */
  minMessages?: number;
};

export type SummarizationHandle = {
  /** Stop the periodic summarization loop. */
  stop: () => void;
  /** Get the most recent summary, or null if none generated yet. */
  lastSummary: () => string | null;
};

// ── Summary Prompt ───────────────────────────────────────────────────────────

function buildSummaryPrompt(previousSummary: string | null): string {
  const prevLine = previousSummary ? `\nPrevious: "${previousSummary}" — say something NEW.\n` : "";

  return `Describe your most recent action in 3-5 words using present tense (-ing). Name the file or function, not the branch. Do not use tools.
${prevLine}
Good: "Reading runAgent.ts"
Good: "Fixing null check in validate.ts"
Good: "Running auth module tests"
Good: "Adding retry logic to fetchUser"

Bad (past tense): "Analyzed the branch diff"
Bad (too vague): "Investigating the issue"
Bad (too long): "Reviewing full branch diff and integration"`;
}

// ── startAgentSummarization ──────────────────────────────────────────────────

/**
 * Start periodic background summarization of an agent's progress.
 *
 * Returns a handle with a `stop()` method. The summarization loop
 * is non-overlapping — each summary waits for the previous to finish
 * before scheduling the next.
 */
export function startAgentSummarization(config: AgentSummarizationConfig): SummarizationHandle {
  const { model, getMessages, onSummary, intervalMs = 30_000, minMessages = 3 } = config;

  let stopped = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let previousSummary: string | null = null;
  let abortController: AbortController | null = null;

  async function runSummary(): Promise<void> {
    if (stopped) return;

    try {
      const messages = getMessages();
      if (messages.length < minMessages) return;

      // Build request with the agent's messages + summary prompt
      const summaryMessages = [
        ...messages.slice(-20), // Last 20 messages for context
        { role: "user" as const, content: buildSummaryPrompt(previousSummary) },
      ];

      abortController = new AbortController();
      const result = await model.complete({
        messages: summaryMessages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        tools: [], // No tools for summary
        signal: abortController.signal,
      });

      if (stopped) return;

      const text = typeof result.content === "string" ? result.content.trim() : "";

      if (text) {
        previousSummary = text;
        onSummary(text);
      }
    } catch {
      // Summarization is best-effort — swallow errors
    } finally {
      abortController = null;
      // Schedule next only after this one completes (non-overlapping)
      if (!stopped) {
        timeoutId = setTimeout(runSummary, intervalMs);
      }
    }
  }

  // Start the first timer
  timeoutId = setTimeout(runSummary, intervalMs);

  return {
    stop: () => {
      stopped = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (abortController) {
        abortController.abort();
        abortController = null;
      }
    },
    lastSummary: () => previousSummary,
  };
}
