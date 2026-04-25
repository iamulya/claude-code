---
summary: Configuration options for the SummarizeStrategy, allowing customization of prompts and fact extraction.
export_name: SummarizeStrategyConfig
source_file: src/context/strategies.ts
category: type
title: SummarizeStrategyConfig
entity_type: api
search_terms:
 - summarize strategy options
 - custom summarization prompt
 - LLM compaction configuration
 - how to change summary prompt
 - extract facts during compaction
 - context summarization settings
 - SummarizeStrategy constructor
 - conversation summary prompt
 - suppress follow-up questions
 - additional instructions for summarizer
 - context management strategy
 - YAAF compaction
stub: false
compiled_at: 2026-04-24T17:42:28.658Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/context/strategies.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

`SummarizeStrategyConfig` is a TypeScript type that defines the configuration options for the `SummarizeStrategy` class. This strategy performs a full [LLM](../concepts/llm.md)-based summarization of the conversation history to compact the [Context Window](../concepts/context-window.md) [Source 1].

This configuration object allows developers to customize the summarization process by providing custom prompts, adding specific instructions, defining a hook for extracting structured facts before messages are summarized, and controlling the inclusion of follow-up questions in the generated summary [Source 1].

## Signature

The `SummarizeStrategyConfig` type is an object with the following optional properties [Source 1]:

```typescript
export type SummarizeStrategyConfig = {
  /**
   * Custom summarization prompt. If not provided, uses the built-in
   * structured prompt that covers: intent, concepts, files, errors,
   * problem solving, user messages, pending tasks, current work, next steps.
   */
  customPrompt?: string;
  /**
   * Additional instructions appended to the prompt (e.g., "focus on
   * TypeScript changes"). Merged with the default prompt [[[[[[[[when]]]]]]]] no
   * customPrompt is set.
   */
  additionalInstructions?: string;
  /**
   * Hook to extract facts before messages are replaced.
   * Extracted facts are included in the result for persistence.
   */
  onExtractFacts?: (messages: Message[]) => Promise<string[]> | string[];
  /**
   * If true, suppress follow-up questions in the summary message.
   * Default: true
   */
  suppressFollowUp?: boolean;
};
```

### Properties

*   **`customPrompt`** `string` (optional)
    A complete replacement for the default summarization prompt. If provided, the built-in structured prompt is ignored. The default prompt is designed to extract key information across nine sections, including user intent, core concepts, and pending tasks [Source 1].

*   **`additionalInstructions`** `string` (optional)
    Extra instructions to be appended to the summarization prompt. If `customPrompt` is not set, these instructions are merged with the default prompt. This is useful for guiding the LLM's focus without rewriting the entire prompt [Source 1].

*   **`onExtractFacts`** `(messages: Message[]) => Promise<string[]> | string[]` (optional)
    A synchronous or asynchronous function that is executed before the messages are summarized and replaced. It receives the current message history and should return an array of strings representing key facts. These extracted facts are included in the `StrategyResult` for potential persistence in a [Memory System](../subsystems/memory-system.md) [Source 1].

*   **`suppressFollowUp`** `boolean` (optional)
    when `true`, the strategy instructs the LLM to avoid asking follow-up questions in its summary. This helps keep the summary message concise and focused. The default value is `true` [Source 1].

## Examples

### Basic Configuration

This example shows how to instantiate a `SummarizeStrategy` with a custom prompt and additional instructions.

```typescript
import { SummarizeStrategy, SummarizeStrategyConfig } from 'yaaf';

const config: SummarizeStrategyConfig = {
  additionalInstructions: 'Focus on decisions related to the database schema.',
  suppressFollowUp: true,
};

const summarizeStrategy = new SummarizeStrategy(config);

// This strategy can now be passed to a ContextManager or CompositeStrategy.
```

### Extracting Facts During Compaction

This example demonstrates using the `onExtractFacts` hook to pull specific information from the conversation history before it is summarized.

```typescript
import { SummarizeStrategy, SummarizeStrategyConfig, Message } from 'yaaf';

const config: SummarizeStrategyConfig = {
  async onExtractFacts(messages: Message[]): Promise<string[]> {
    const facts: string[] = [];
    for (const message of messages) {
      if (message.content?.includes('API_KEY:')) {
        facts.push('An API key was mentioned.');
      }
      if (message.content?.includes('USER_ID:')) {
        facts.push('A user ID was mentioned.');
      }
    }
    return facts;
  },
};

const factExtractingStrategy = new SummarizeStrategy(config);
```

## Sources

[Source 1]: src/context/strategies.ts