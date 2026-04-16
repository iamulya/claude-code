---
title: Token Estimation
entity_type: concept
summary: The heuristic-based approach YAAF uses to estimate token counts and manage context windows without heavy tokenizer dependencies.
stub: false
compiled_at: 2026-04-16T14:40:14.096Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/utils/tokens.ts
confidence: 0.95
---

## What It Is
Token Estimation is a heuristic-based mechanism used by YAAF to approximate the number of tokens in a given string or structured message. This approach allows the framework to manage context windows and token budgets without requiring heavy, model-specific tokenizer dependencies (such as `tiktoken`) in the production runtime. By using a conservative estimation strategy, YAAF ensures that agents can stay within the maximum context length of an LLM provider while remaining provider-agnostic and performant.

## How It Works in YAAF
YAAF implements token estimation primarily through a character-ratio heuristic. The framework assumes an average of **4 characters per token** for both English prose and source code.

The estimation logic is designed to be intentionally conservative to prevent context overflow errors. According to the implementation details:
*   **Prose**: Typically overestimates by 5–10%.
*   **Code**: Typically overestimates by 10–15%.

### Implementation Details
The framework provides several specialized functions in `src/utils/tokens.ts` to handle different estimation scenarios:

*   **`estimateTokens(text: string)`**: The core utility that applies the character-ratio heuristic to raw text and always rounds the result up.
*   **`estimateMessageTokens(message)`**: Calculates tokens for a structured message object (containing roles and content). This function specifically accounts for the JSON overhead required for tool-use and structured LLM communication.
*   **`estimateConversationTokens(messages)`**: Aggregates the estimates for an array of messages to determine the total weight of a conversation history.
*   **`exceedsBudget(text, budgetTokens)`**: A performance-optimized utility that returns a boolean indicating if a string exceeds a specific limit. This is more efficient than `estimateTokens` when a precise count is not required.

```typescript
/**
 * Estimate token count from text using a character-ratio heuristic.
 *
 * Heuristic: ~4 characters per token for English + code.
 * Overestimates by ~10-15% for code, ~5-10% for prose.
 */
export function estimateTokens(text: string): number;

/**
 * Estimate token count for a structured message.
 * Accounts for JSON overhead in tool-use and structured messages.
 */
export function estimateMessageTokens(message: { role: string; content: string }): number;

/**
 * Check if text exceeds a token budget.
 * More efficient than estimateTokens when you only need a boolean.
 */
export function exceedsBudget(text: string, budgetTokens: number): boolean;
```

## Sources
* `src/utils/tokens.ts`