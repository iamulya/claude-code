/**
 * Token Estimation Utility
 *
 * fast, approximate token counts without requiring a tokenizer.
 *
 * YAAF uses this for:
 * - Auto-compact threshold checks (needs to be fast, ~0.1ms)
 * - Context budget calculations
 * - File size heuristics (should this file be loaded?)
 *
 * The heuristic is intentionally conservative (overestimates) to avoid
 * exceeding context windows. For precise counts, use a model-specific
 * tokenizer (tiktoken, sentencepiece, etc.).
 */

/**
 * CJK Unicode character ranges for detection:
 * - CJK Unified Ideographs (Chinese/Japanese Kanji): U+4E00–U+9FFF
 * - Hiragana (Japanese): U+3040–U+309F
 * - Katakana (Japanese): U+30A0–U+30FF
 * - Hangul Syllables (Korean): U+AC00–U+D7AF
 *
 * Sprint 0a: Added for H5 fix — CJK text uses ~1.5 chars/token vs ~4 for English.
 */
const CJK_RE = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g;

/**
 * Estimate token count from text using a character-ratio heuristic.
 *
 * Heuristic:
 * - ~4 characters per token for English + code
 * - ~1.5 characters per token for CJK-heavy text (>30% CJK chars)
 *
 * Overestimates by ~10-15% for code, ~5-10% for prose.
 * This is intentionally conservative to prevent context overflow.
 *
 * @param text - The text to estimate tokens for
 * @returns Estimated token count (always rounds up)
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  const cjkMatches = text.match(CJK_RE);
  const cjkChars = cjkMatches ? cjkMatches.length : 0;
  const ratio = text.length > 0 ? cjkChars / text.length : 0;
  return Math.ceil(text.length / (ratio > 0.3 ? 1.5 : 4));
}

/**
 * Estimate token count for a structured message.
 * Accounts for JSON overhead in tool-use and structured messages.
 *
 * @param message - Object with role and content fields
 * @returns Estimated token count
 */
export function estimateMessageTokens(message: {
  role: string;
  content: string | Array<{ type: string; [key: string]: unknown }>;
}): number {
  // Base overhead for message envelope (~4 tokens for role, separators)
  const overhead = 4;

  if (typeof message.content === "string") {
    return overhead + estimateTokens(message.content);
  }

  // Structured content (tool_use blocks, images, etc.)
  let total = overhead;
  for (const block of message.content) {
    if (block.type === "text" && typeof block["text"] === "string") {
      total += estimateTokens(block["text"] as string);
    } else if (block.type === "image") {
      // Images are typically 1-2K tokens depending on resolution
      total += 1500;
    } else {
      // Tool use, tool result, etc. — estimate from JSON
      total += estimateTokens(JSON.stringify(block));
    }
  }
  return total;
}

/**
 * Estimate tokens for an array of messages.
 */
export function estimateConversationTokens(
  messages: Array<{
    role: string;
    content: string | Array<{ type: string; [key: string]: unknown }>;
  }>,
): number {
  let total = 0;
  for (const msg of messages) {
    total += estimateMessageTokens(msg);
  }
  return total;
}

/**
 * Check if text exceeds a token budget.
 * More efficient than estimateTokens when you only need a boolean.
 */
export function exceedsBudget(text: string, budgetTokens: number): boolean {
  // Early exit: if char count / 4 can't possibly exceed budget, skip
  return text.length > budgetTokens * 4 ? estimateTokens(text) > budgetTokens : false;
}
