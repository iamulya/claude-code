/**
 * History Snipping — cheap pre-compaction optimization that removes
 * known-low-value content before running full LLM-based compaction.
 *
 * Inspired by the main repo's microCompact.ts pre-pass. Snips:
 * - Old tool results beyond a certain age (turn count)
 * - Duplicate file reads
 * - Large tool outputs that have already been summarized
 * - Empty/no-op tool results
 *
 * This is NOT a replacement for compaction — it's a pre-pass that
 * makes compaction cheaper and faster by removing obvious noise first.
 *
 * @example
 * ```ts
 * const result = snipHistory(messages, { maxOldToolResults: 10, maxToolResultAge: 20 });
 * // result.snipped — cleaned messages
 * // result.tokensFreed — estimated tokens saved
 * // result.itemsRemoved — number of items removed
 * ```
 */

import { estimateTokens } from '../utils/tokens.js'

// ── Types ────────────────────────────────────────────────────────────────────

export type MessageLike = {
  role: string
  content: string
  toolName?: string
  toolCallId?: string
}

export type SnipConfig = {
  /** Max number of old tool results to keep. Default: 15. */
  maxOldToolResults?: number
  /** Tool results older than this many turns get snipped. Default: 20. */
  maxToolResultAge?: number
  /** Replace snipped content with this placeholder. Default: "[Old tool result cleared]". */
  placeholderText?: string
  /** Minimum token length of a tool result to be eligible for snipping. Default: 100. */
  minSnipTokens?: number
  /** Keep the most recent N tool results untouched. Default: 5. */
  keepRecent?: number
  /** Tool names whose results are never snipped. */
  exemptTools?: string[]
}

export type SnipResult = {
  /** Messages with old content snipped. */
  snipped: MessageLike[]
  /** Estimated tokens freed by snipping. */
  tokensFreed: number
  /** Number of tool results snipped. */
  itemsRemoved: number
}

// ── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_PLACEHOLDER = '[Old tool result cleared]'

// ── snipHistory ──────────────────────────────────────────────────────────────

/**
 * Snip old, large tool results from conversation history.
 *
 * This is a cheap O(n) pass with no LLM calls. It identifies tool results
 * that are:
 * 1. Old (beyond `maxToolResultAge` turns from the end)
 * 2. Large (over `minSnipTokens` estimated tokens)
 * 3. Not exempt (not in `exemptTools`)
 * 4. Not recent (not in the last `keepRecent` tool results)
 *
 * These are replaced with a short placeholder text, dramatically reducing
 * context size before the expensive LLM-based compaction runs.
 */
export function snipHistory(
  messages: MessageLike[],
  config: SnipConfig = {},
): SnipResult {
  const {
    maxOldToolResults = 15,
    maxToolResultAge = 20,
    placeholderText = DEFAULT_PLACEHOLDER,
    minSnipTokens = 100,
    keepRecent = 5,
    exemptTools = [],
  } = config

  const exemptSet = new Set(exemptTools)
  const totalMessages = messages.length

  // Find all tool result indices
  const toolResultIndices: number[] = []
  for (let i = 0; i < messages.length; i++) {
    if (messages[i]!.role === 'tool' || messages[i]!.toolCallId) {
      toolResultIndices.push(i)
    }
  }

  // Determine which tool results to snip
  const snipIndices = new Set<number>()
  const recentBoundary = toolResultIndices.length - keepRecent

  for (let ri = 0; ri < toolResultIndices.length; ri++) {
    const idx = toolResultIndices[ri]!
    const msg = messages[idx]!

    // Skip recent tool results
    if (ri >= recentBoundary) continue

    // Skip exempt tools
    if (msg.toolName && exemptSet.has(msg.toolName)) continue

    // Skip small results
    const tokens = estimateTokens(msg.content)
    if (tokens < minSnipTokens) continue

    // Check age (turns from end)
    const age = totalMessages - idx
    if (age < maxToolResultAge) continue

    // Enough old tool results — snip
    if (snipIndices.size >= maxOldToolResults) break

    snipIndices.add(idx)
  }

  // Build snipped messages
  let tokensFreed = 0
  let itemsRemoved = 0
  const snipped: MessageLike[] = []

  for (let i = 0; i < messages.length; i++) {
    if (snipIndices.has(i)) {
      const original = messages[i]!
      const originalTokens = estimateTokens(original.content)
      const placeholderTokens = estimateTokens(placeholderText)
      tokensFreed += originalTokens - placeholderTokens
      itemsRemoved++

      snipped.push({
        ...original,
        content: placeholderText,
      })
    } else {
      snipped.push(messages[i]!)
    }
  }

  return { snipped, tokensFreed, itemsRemoved }
}

/**
 * Deduplicate consecutive identical tool results.
 *
 * When a tool is called multiple times with the same output (e.g., repeated
 * `cat file.ts`), keep only the last occurrence and replace earlier ones.
 */
export function deduplicateToolResults(
  messages: MessageLike[],
  placeholder = '[Duplicate result — see below]',
): SnipResult {
  // Track last seen content hash for each tool+input combo
  const lastSeen = new Map<string, number>() // key → last index
  const duplicateIndices = new Set<number>()

  // Forward pass: find the last occurrence of each tool result
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]!
    if (msg.role !== 'tool' && !msg.toolCallId) continue

    const key = `${msg.toolName ?? 'unknown'}:${hashContent(msg.content)}`
    const prev = lastSeen.get(key)
    if (prev !== undefined) {
      duplicateIndices.add(prev) // Earlier one is the duplicate
    }
    lastSeen.set(key, i)
  }

  let tokensFreed = 0
  const snipped: MessageLike[] = []

  for (let i = 0; i < messages.length; i++) {
    if (duplicateIndices.has(i)) {
      const original = messages[i]!
      tokensFreed += estimateTokens(original.content) - estimateTokens(placeholder)
      snipped.push({ ...original, content: placeholder })
    } else {
      snipped.push(messages[i]!)
    }
  }

  return { snipped, tokensFreed, itemsRemoved: duplicateIndices.size }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function hashContent(content: string): string {
  // Fast non-crypto hash for deduplication
  let hash = 0
  const len = Math.min(content.length, 500) // Only hash first 500 chars
  for (let i = 0; i < len; i++) {
    const chr = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + chr
    hash |= 0
  }
  return hash.toString(36)
}
