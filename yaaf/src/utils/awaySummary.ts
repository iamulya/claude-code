/**
 * Away Summary — "while you were away" session recap.
 *
 * Inspired by the main repo's awaySummary.ts. Generates a 1-3 sentence
 * recap when a user resumes a session, focusing on high-level task and
 * concrete next step.
 *
 * @example
 * ```ts
 * // On session resume:
 * const recap = await generateAwaySummary({
 * messages: session.messages,
 * model: smallModel,
 * });
 * if (recap) console.log(`Welcome back! ${recap}`);
 * ```
 */

import type { ChatModel } from "../agents/runner.js";

// ── Types ────────────────────────────────────────────────────────────────────

export type AwaySummaryConfig = {
  /** Session messages to summarize. */
  messages: ReadonlyArray<{ role: string; content: string }>;
  /** Model to use (small/fast recommended). */
  model: ChatModel;
  /** Abort signal. */
  signal?: AbortSignal;
  /** Maximum recent messages to include in context. Default: 30. */
  recentMessageWindow?: number;
  /** Optional session memory to include for broader context. */
  sessionMemory?: string;
};

// ── Prompt ───────────────────────────────────────────────────────────────────

function buildAwaySummaryPrompt(memory?: string): string {
  const memoryBlock = memory ? `Session memory (broader context):\n${memory}\n\n` : "";
  return `${memoryBlock}The user stepped away and is coming back. Write exactly 1-3 short sentences. Start by stating the high-level task — what they are building or debugging, not implementation details. Next: the concrete next step. Skip status reports and commit recaps.`;
}

// ── generateAwaySummary ──────────────────────────────────────────────────────

/**
 * Generate a short session recap for the "while you were away" experience.
 * Returns null on abort, empty transcript, or error.
 */
export async function generateAwaySummary(config: AwaySummaryConfig): Promise<string | null> {
  const { messages, model, signal, recentMessageWindow = 30, sessionMemory } = config;

  if (messages.length === 0) return null;

  try {
    const recent = messages.slice(-recentMessageWindow);
    const allMsgs = [
      ...recent.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      {
        role: "user" as const,
        content: buildAwaySummaryPrompt(sessionMemory),
      },
    ];

    const result = await model.complete({
      messages: allMsgs,
      tools: [],
      signal,
    });

    const text = typeof result.content === "string" ? result.content.trim() : "";
    return text || null;
  } catch {
    return null;
  }
}
