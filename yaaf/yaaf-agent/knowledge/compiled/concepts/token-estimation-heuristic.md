---
summary: A method used to approximate the token count of text, often employing character-ratio rules, to predict LLM input size.
title: Token Estimation Heuristic
entity_type: concept
search_terms:
 - approximate token count
 - how to guess number of tokens
 - character to token ratio
 - predicting context window usage
 - token counting without tokenizer
 - fast token estimation
 - LLM input size prediction
 - context overflow prevention
 - CJK token estimation
 - code token counting
 - conservative token approximation
 - YAAF token utils
stub: false
compiled_at: 2026-04-24T18:03:58.945Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/tokens.ts
compiled_from_quality: unknown
confidence: 0.85
---

## What It Is

A [Token Estimation](./token-estimation.md) Heuristic is a lightweight, computational method used to approximate the number of tokens a given piece of text will consume [when](../apis/when.md) processed by a Large Language Model ([LLM](./llm.md)). Instead of using a model-specific tokenizer, which can be slow or require loading large files, a heuristic relies on simple rules, such as character-to-token ratios, to provide a quick estimate.

This technique is essential in YAAF for managing an agent's [Context Window](./context-window.md). By rapidly predicting the token count of potential inputs, the framework can prevent [Context Overflow](./context-overflow.md) errors, which occur when the input exceeds the LLM's maximum capacity. The heuristic provides a fast check, particularly useful in functions like `exceedsBudget`, where only a boolean confirmation is needed [Source 1].

## How It Works in YAAF

YAAF's token estimation is based on a character-ratio heuristic that is intentionally conservative to avoid underestimation [Source 1]. The core logic is implemented in utility functions like `estimateTokens`.

The specific rules are as follows:
- For text primarily in English or containing source code, the heuristic assumes approximately 4 characters per token [Source 1].
- For text with a significant portion of CJK (Chinese, Japanese, Korean) characters (defined as >30%), the ratio is adjusted to approximately 1.5 characters per token to account for the denser information content of these scripts [Source 1].

This estimation is designed to consistently overestimate the actual token count. For code, the overestimation is around 10-15%, and for prose, it is about 5-10%. This conservative approach acts as a safety margin to prevent context overflow errors [Source 1]. All calculations are rounded up to the nearest whole number [Source 1].

YAAF provides several utility functions that apply this heuristic:
- `estimateTokens(text)`: Estimates the token count for a raw string.
- `estimateMessageTokens(message)`: Estimates tokens for a structured message object, accounting for JSON overhead associated with [Tool Use](./tool-use.md) and structured formats.
- `estimateConversationTokens(messages)`: Aggregates the token count for an array of message objects.
- `exceedsBudget(text, budgetTokens)`: A more efficient check that returns a boolean indicating if a text is over a specified [Token Budget](./token-budget.md), avoiding a full count when unnecessary.

[Source 1]

## Sources

[Source 1]: src/utils/tokens.ts