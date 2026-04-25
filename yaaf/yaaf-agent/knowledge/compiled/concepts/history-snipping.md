---
title: History Snipping
entity_type: concept
summary: A cheap pre-compaction optimization that removes known-low-value content from conversation history before full LLM-based compaction.
related_subsystems:
 - Context Management
search_terms:
 - pre-compaction optimization
 - reduce context size
 - remove old tool results
 - conversation history cleanup
 - token saving strategy
 - micro-compaction
 - deduplicate tool outputs
 - how to make compaction cheaper
 - managing large tool outputs
 - context window management
 - YAAF history optimization
 - snipHistory function
stub: false
compiled_at: 2026-04-24T17:55:41.872Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/context/historySnip.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

History Snipping is a performance optimization technique in YAAF that serves as a pre-pass before a full, [LLM](./llm.md)-based [Context Compaction](./context-compaction.md) [Source 1]. It is a computationally inexpensive process designed to remove "obvious noise" and known low-value content from an agent's conversation history. The primary goal is to make the subsequent, more expensive compaction step cheaper and faster by reducing the amount of data the LLM needs to process [Source 1].

This technique is not a replacement for full context compaction but rather a preparatory step. It targets specific types of content for removal, such as old [tool results](./tool-results.md), duplicate file reads, large tool outputs that have already been summarized, and empty or no-op tool results [Source 1].

## How It Works in YAAF

History Snipping is implemented primarily through the `snipHistory` function, which performs a single, linear-time (O(n)) pass over the message history without making any LLM calls [Source 1].

The `snipHistory` function identifies and removes tool results based on a set of configurable criteria:
1.  **Age**: The tool result must be older than a specified number of turns (`maxToolResultAge`) from the end of the conversation.
2.  **Size**: The result's content must exceed a minimum token count (`minSnipTokens`).
3.  **Recency**: The result must not be one of the most recent tool results, a number defined by `keepRecent`.
4.  **Exemption**: The tool that produced the result must not be on an exemption list (`exemptTools`) [Source 1].

[when](../apis/when.md) a tool result is snipped, its content is replaced with a short placeholder string. The function returns the modified message list, an estimate of the tokens saved, and a count of the items removed [Source 1].

A related function, `deduplicateToolResults`, specifically targets consecutive, identical tool results (e.g., repeated calls to `cat file.ts`). It keeps only the last occurrence and replaces the earlier, duplicate ones with a placeholder [Source 1].

## Configuration

History Snipping is configured by passing a `SnipConfig` object to the `snipHistory` function. The available options allow developers to tune the snipping behavior [Source 1].

```typescript
const result = snipHistory(messages, { 
  maxOldToolResults: 10, 
  maxToolResultAge: 20 
});

// result.snipped — cleaned messages
// result.tokensFreed — estimated tokens saved
// result.itemsRemoved — number of items removed
```

The `SnipConfig` object includes the following parameters:

*   `maxOldToolResults`: The maximum number of old tool results to retain. Default is 15.
*   `maxToolResultAge`: Tool results older than this many turns are eligible for snipping. Default is 20.
*   `placeholderText`: The string used to replace snipped content. Default is `"[Old tool result cleared]"`.
*   `minSnipTokens`: A tool result must have at least this many tokens to be considered for snipping. Default is 100.
*   `keepRecent`: The number of most recent tool results to always keep, regardless of other criteria. Default is 5.
*   `exemptTools`: An array of tool names whose results will never be snipped [Source 1].

## Sources

[Source 1]: src/context/historySnip.ts