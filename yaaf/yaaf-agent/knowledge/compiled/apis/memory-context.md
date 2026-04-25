---
summary: A type representing the context provided to a memory extraction strategy.
export_name: MemoryContext
source_file: src/memory/strategies.js
category: type
title: MemoryContext
entity_type: api
search_terms:
 - memory extraction context
 - what is MemoryContext
 - data for memory strategy
 - memory strategy parameters
 - conversation history for memory
 - auto memory extraction input
 - durable memory context
 - information for knowledge extraction
 - passing data to MemoryExtractionStrategy
 - context for saving memories
 - extraction prompt
 - messages for memory
stub: false
compiled_at: 2026-04-24T17:21:36.385Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/autoExtract.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

`[[[[[[[[Memory]]]]]]]]Context` is a TypeScript type that encapsulates the information required by a `MemoryExtractionStrategy` to perform its function. [when](./when.md) a system like the `AutoMemoryExtractor` needs to extract durable memories from a conversation, it packages the relevant conversational history and guiding prompts into a `MemoryContext` object and passes it to the configured strategy [Source 1].

This type serves as a standardized contract, ensuring that any Memory extraction strategy receives a consistent set of data to work with, such as the list of recent messages and the specific question or prompt that guides the extraction process.

## Signature

The exact type definition for `MemoryContext` is not available in the provided source material. It is imported from `src/memory/strategies.js` [Source 1]. However, its structure can be inferred from the parameters of methods that use it, such as `AutoMemoryExtractor.onTurnComplete`.

Based on its usage, the `MemoryContext` object likely contains the recent conversation messages and a prompt to guide the [LLM](../concepts/llm.md)-based extraction.

```typescript
// File: src/memory/strategies.js
// The MemoryContext type is exported from this file.

// The following is an inferred structure based on usage in AutoMemoryExtractor [Source 1].
export type MemoryContext = {
  /**
   * The list of recent messages to scan for potential memories.
   */
  messages: {
    role: string;
    content: string;
    id?: string;
  }[];

  /**
   * The prompt or question that guides the extraction process,
   * e.g., "What is the user doing?".
   */
  extractionPrompt: string;

  // Other contextual properties may also be included.
};
```

## Examples

While you do not typically construct a `MemoryContext` object directly, it is created and used internally by components that manage memory extraction. The following example shows how `AutoMemoryExtractor` implicitly creates a `MemoryContext` and passes it to its configured strategy after a conversation turn is complete [Source 1].

```typescript
import { AutoMemoryExtractor, MessageLike } from 'yaaf';
import type { MemoryExtractionStrategy, ExtractionResult } from 'yaaf';

// A custom memory extraction strategy that receives the MemoryContext.
const myStrategy: MemoryExtractionStrategy = {
  async extract(context) {
    console.log('Extraction strategy received context:');
    console.log(`- Prompt: ${context.extractionPrompt}`);
    console.log(`- Messages: ${context.messages.length}`);
    
    // In a real implementation, this would call an LLM
    // with the context to extract memories.
    const extractedMemories: ExtractionResult = {
      memories: [{ content: "User is planning a trip to Hawaii." }],
      usage: { totalTokens: 100 },
    };
    return extractedMemories;
  }
};

const extractor = new AutoMemoryExtractor({
  extractionStrategy: myStrategy,
});

// After an agent turn, this method is called.
// Internally, it will bundle `messages` and the prompt
// into a MemoryContext object for the strategy.
const messages: MessageLike[] = [
  { role: 'user', content: 'I want to book a flight.' },
  { role: 'assistant', content: 'Sure, where to?' },
  { role: 'user', content: 'To Hawaii, please.' },
];

extractor.onTurnComplete(messages, 'What is the user planning?');
```

## Sources

[Source 1]: src/memory/autoExtract.ts