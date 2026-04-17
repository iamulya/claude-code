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
 * Estimate token count from text using a character-ratio heuristic.
 *
 * Heuristic: ~4 characters per token for English + code.
 * Overestimates by ~10-15% for code, ~5-10% for prose.
 * This is intentionally conservative to prevent context overflow.
 *
 * @param text - The text to estimate tokens for
 * @returns Estimated token count (always rounds up)
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
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
