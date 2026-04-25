---
summary: The condition where the input to an LLM exceeds its maximum token budget, leading to truncation or API errors.
title: Context Overflow
entity_type: concept
search_terms:
 - LLM token limit
 - context window exceeded
 - preventing API errors from long input
 - token budget management
 - how to handle too much text for LLM
 - YAAF token estimation
 - context length error
 - input truncation
 - managing conversation history
 - token counting
 - conservative token estimation
 - exceeds token budget
stub: false
compiled_at: 2026-04-24T17:53:35.356Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/tokens.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

Context Overflow is a state that occurs [when](../apis/when.md) the total number of tokens in the input provided to a Large Language Model ([LLM](./llm.md)) surpasses the model's maximum [Context Window](./context-window.md). Every LLM has a fixed limit on the amount of text (measured in tokens) it can process in a single request. When this limit is exceeded, the LLM provider may reject the API call with an error or, in some cases, silently truncate the input.

This silent truncation is particularly problematic for agent-based systems, as the model may lose critical information from the beginning or end of the context, such as user instructions, conversation history, or tool outputs. This can lead to incorrect, irrelevant, or incomplete responses, undermining the agent's reliability. YAAF provides mechanisms to proactively manage the [Token Budget](./token-budget.md) to prevent this condition and ensure robust agent behavior.

## How It Works in YAAF

YAAF addresses the risk of Context Overflow by performing client-side [Token Estimation](./token-estimation.md) before making an API call to an LLM. The framework includes utility functions designed to approximate the token count of various inputs, allowing an agent to manage its context window effectively.

The core of this mechanism is a conservative, heuristic-based estimation strategy [Source 1]. The `estimateTokens` function calculates the token count of a string based on a character-to-token ratio. This heuristic is intentionally designed to overestimate slightly to create a safety margin against overflow. The specific ratios are:
- Approximately 4 characters per token for English text and source code.
- Approximately 1.5 characters per token for text with a high concentration of CJK (Chinese, Japanese, Korean) characters.

For more complex data structures common in agent interactions, YAAF provides specialized estimators:
- `estimateMessageTokens`: Calculates the token count for a structured message object, accounting for the JSON overhead inherent in tool-use schemas and structured prompts.
- `estimateConversationTokens`: Aggregates the token count for an entire array of messages.

YAAF also provides a more performant utility, `exceedsBudget`, which returns a boolean indicating if a given text exceeds a specified token budget. This is more efficient than a full token count when the agent only needs to check if the limit has been reached [Source 1]. By using these [Utilities](../subsystems/utilities.md), a YAAF agent can check the size of its intended payload, and if it exceeds the model's limit, it can employ strategies like summarizing conversation history or truncating non-essential data before sending the request.

## Sources
[Source 1]: src/utils/tokens.ts