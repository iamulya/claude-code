---
summary: A configurable maximum number of tokens used to manage the size of inputs like knowledge base articles or system prompts, preventing them from exceeding LLM context window limits.
title: Token Budget
entity_type: concept
related_subsystems:
 - Knowledge Compiler
 - Context Engine
search_terms:
 - LLM context window limit
 - how to manage prompt size
 - prevent context overflow
 - max tokens per article
 - system prompt size limit
 - token estimation
 - character to token ratio
 - droppable context sections
 - oversized article segmentation
 - YAAF token management
 - context length
 - token limit
stub: false
compiled_at: 2026-04-24T18:03:53.141Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/contextEngine.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/postprocess.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/tokens.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

A Token Budget is a configurable limit on the number of tokens an input can contain. In YAAF, this concept is applied in several areas to manage the size of text sent to a Large Language Model ([LLM](./llm.md)), primarily to prevent exceeding the model's [Context Window](./context-window.md). Exceeding the context window can lead to API errors, truncated inputs, or degraded model performance.

YAAF uses token budgets in two primary contexts:
1.  **Compile-Time:** During the knowledge base compilation process, a token budget is applied to each article to ensure it is a manageable size for retrieval and inclusion in an agent's context [Source 2].
2.  **Runtime:** [when](../apis/when.md) an agent constructs a [System Prompt](./system-prompt.md), a budget (often measured in characters as a proxy for tokens) is used to dynamically assemble context sections without overflowing the model's limit [Source 1].

## How It Works in YAAF

The enforcement of a token budget relies on a utility for estimating token counts and specific mechanisms within different subsystems.

### [Token Estimation](./token-estimation.md)

YAAF uses a conservative, heuristic-based approach to estimate token counts from text. The `estimateTokens` utility function approximates the token count based on character count, using a ratio of approximately 4 characters per token for English text and code. This estimation is intentionally conservative to create a safety margin and prevent [Context Overflow](./context-overflow.md) [Source 3]. For simple boolean checks, a more efficient `exceedsBudget` function is available [Source 3].

### Knowledge Base Compilation

During the post-processing phase of knowledge base compilation, the `segmentOversizedArticles` function scans all generated articles. Any article that exceeds the configured `tokenBudget` is automatically split into smaller, linked sub-articles. The splits occur at H2 (`##`) section boundaries, and navigation links (`[Next →]`, `[← Previous]`) are inserted to connect the parts [Source 2]. This ensures that even very long source documents are broken down into chunks that can be individually retrieved and used by an agent without overwhelming its context window. The default token budget for articles is 15,000 tokens [Source 2].

### System Prompt Construction

At runtime, the `ContextEngine` is responsible for assembling the final system prompt from various pieces of information, such as the base prompt and contextual data. The `ContextEngine` can be configured with a `maxChars` budget, which serves as a proxy for a token budget [Source 1].

Contextual information is provided in `ContextSection` objects, which can be marked as `droppable`. If the total character count of all sections exceeds the `maxChars` budget, the `ContextEngine` will omit `droppable` sections, starting with those that have the lowest priority, until the final prompt fits within the budget [Source 1]. This allows an agent to gracefully degrade the richness of its context under token pressure rather than failing completely.

## Configuration

The token budget is configured differently for the [Knowledge Compiler](../subsystems/knowledge-compiler.md) and the context engine.

### Knowledge Compiler

The token budget for [Article Segmentation](./article-segmentation.md) is set via `PostProcessOptions` during the compilation process.

```typescript
// Source: src/knowledge/compiler/postprocess.ts

export type PostProcessOptions = {
  /** Token budget per article. Default: 15000 */
  tokenBudget?: number;
  // ... other options
};
```

### Context Engine

The prompt budget for the `ContextEngine` is configured using the `maxChars` property in `ContextEngineConfig`.

```typescript
// Source: src/agents/contextEngine.ts

export type ContextEngineConfig = {
  /** Base task instructions (always included) */
  basePrompt: string;
  /**
   * Maximum total character budget for the system prompt.
   * If set, droppable sections are removed lowest-priority-first to fit.
   */
  maxChars?: number;
};
```

## Sources

[Source 1] `src/agents/contextEngine.ts`
[Source 2] `src/knowledge/compiler/postprocess.ts`
[Source 3] `src/utils/tokens.ts`