/**
 * Tool Result Budget — Aggregate size limiting for tool results in context
 *
 * Inspired by the main repo's `applyToolResultBudget()`. Prevents context
 * blowout when many tools return large results by enforcing a total-size
 * cap on tool result content within the conversation.
 *
 * When total tool result content exceeds the budget, older results are
 * replaced with size placeholders (preserving the tool call structure
 * so the LLM knows *which* tools were called).
 *
 * @module utils/toolResultBudget
 */

import type { ChatMessage } from '../agents/runner.js'

// ── Types ────────────────────────────────────────────────────────────────────

export type ToolResultBudgetConfig = {
  /**
   * Maximum total characters of tool result content.
   * Default: 500_000 (~125K tokens at 4 chars/token)
   */
  maxTotalChars?: number

  /**
   * Number of most-recent tool results to always keep intact.
   * Default: 10
   */
  keepRecent?: number

  /**
   * Placeholder text for budget-cleared results.
   * Default: '[Tool result cleared to save context — see tool call above for what was executed]'
   */
  clearedMessage?: string

  /**
   * Set of tool names that are exempt from budget enforcement
   * (their results are always kept). Default: none.
   */
  exemptTools?: Set<string>
}

export type ToolResultBudgetResult = {
  /** The messages with budget applied */
  messages: ChatMessage[]
  /** Number of tool results cleared */
  cleared: number
  /** Estimated characters freed */
  charsFreed: number
}

// ── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_MAX_TOTAL_CHARS = 500_000
const DEFAULT_KEEP_RECENT = 10
const DEFAULT_CLEARED_MESSAGE =
  '[Tool result cleared to save context — see tool call above for what was executed]'

// ── Apply Budget ─────────────────────────────────────────────────────────────

/**
 * Apply aggregate tool result budget to a message array.
 *
 * Scans for `role: 'tool'` messages, measures total content size,
 * and replaces the oldest results with placeholders when the budget
 * is exceeded. Always keeps the most recent N results intact.
 *
 * Runs in O(n) and returns a new array (does not mutate the input).
 */
export function applyToolResultBudget(
  messages: ChatMessage[],
  config: ToolResultBudgetConfig = {},
): ToolResultBudgetResult {
  const maxChars = config.maxTotalChars ?? DEFAULT_MAX_TOTAL_CHARS
  const keepRecent = config.keepRecent ?? DEFAULT_KEEP_RECENT
  const clearedMessage = config.clearedMessage ?? DEFAULT_CLEARED_MESSAGE
  const exempt = config.exemptTools ?? new Set()

  // Collect indices and sizes of all tool result messages
  type ToolResultInfo = { index: number; size: number; name: string }
  const toolResults: ToolResultInfo[] = []

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]!
    if (msg.role === 'tool') {
      toolResults.push({
        index: i,
        size: msg.content.length,
        name: msg.name,
      })
    }
  }

  // If within budget or too few results, return unchanged
  const totalChars = toolResults.reduce((sum, tr) => sum + tr.size, 0)
  if (totalChars <= maxChars || toolResults.length <= keepRecent) {
    return { messages, cleared: 0, charsFreed: 0 }
  }

  // Find which results to clear — oldest first, skip exempt and recent
  const clearableCount = Math.max(0, toolResults.length - keepRecent)
  const clearableResults = toolResults.slice(0, clearableCount)

  // Clear enough to get under budget
  const clearIndices = new Set<number>()
  let currentTotal = totalChars
  let charsFreed = 0

  for (const tr of clearableResults) {
    if (currentTotal <= maxChars) break
    if (exempt.has(tr.name)) continue

    clearIndices.add(tr.index)
    const freed = tr.size - clearedMessage.length
    charsFreed += freed
    currentTotal -= freed
  }

  if (clearIndices.size === 0) {
    return { messages, cleared: 0, charsFreed: 0 }
  }

  // Build new message array with cleared results
  const result: ChatMessage[] = messages.map((msg, i) => {
    if (clearIndices.has(i) && msg.role === 'tool') {
      return { ...msg, content: clearedMessage }
    }
    return msg
  })

  return {
    messages: result,
    cleared: clearIndices.size,
    charsFreed,
  }
}
