---
summary: Options for retrieving context from the HonchoPlugin.
export_name: HonchoContextOpts
source_file: src/integrations/honcho.ts
category: type
title: HonchoContextOpts
entity_type: api
search_terms:
 - Honcho context options
 - how to get context from Honcho
 - context retrieval parameters
 - HonchoPlugin context
 - ContextProvider options
 - limit context tokens
 - summarize context
 - format context for OpenAI
 - raw context format
 - Honcho context summary
 - context token budget
stub: false
compiled_at: 2026-04-24T17:11:52.920Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/honcho.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`HonchoContextOpts` is a TypeScript type that defines the configuration options for retrieving context from the `HonchoPlugin`. [when](./when.md) an agent or service needs to fetch contextual information, this object allows the caller to specify constraints and formatting preferences for the returned data.

This is particularly useful for managing the size of the [Context Window](../concepts/context-window.md) sent to a Large Language Model ([LLM](../concepts/llm.md)). By requesting a summary or limiting the number of tokens, developers can control costs and ensure the context fits within the model's limits. The `format` option simplifies integration with specific model providers like OpenAI.

## Signature

`HonchoContextOpts` is a type alias for an object with the following properties:

```typescript
export type HonchoContextOpts = {
  /**
   * If true, requests a summary of the context instead of the raw messages.
   * @default false
   */
  summary?: boolean;

  /**
   * The maximum number of tokens to include in the context.
   */
  tokens?: number;

  /**
   * The output format for the context.
   * - `openai`: Formats the context as an array of messages suitable for the OpenAI Chat Completions API.
   * - `raw`: Returns the raw context data.
   * @default 'raw'
   */
  format?: "openai" | "raw";
};
```
[Source 1]

## Examples

The following examples demonstrate how to use `HonchoContextOpts` when fetching context from an instance of `HonchoPlugin`.

*Note: The `getContext` method used below is a hypothetical example to illustrate how these options would be consumed by a `ContextProvider` like `HonchoPlugin`.*

```typescript
import { HonchoPlugin, HonchoContextOpts } from 'yaaf';

// Assume honchoPlugin is an initialized instance of HonchoPlugin
// that implements the ContextProvider interface.
declare const honchoPlugin: HonchoPlugin & {
  getContext(query: string, opts?: HonchoContextOpts): Promise<any>;
};

async function main() {
  const query = "What was our last conversation about?";

  // Example 1: Get a summary of the context
  const summaryOptions: HonchoContextOpts = { summary: true };
  const contextSummary = await honchoPlugin.getContext(query, summaryOptions);
  console.log('Context Summary:', contextSummary);

  // Example 2: Get a token-limited context formatted for OpenAI
  const openAIOptions: HonchoContextOpts = {
    tokens: 4096,
    format: 'openai',
  };
  const openAIContext = await honchoPlugin.getContext(query, openAIOptions);
  console.log('OpenAI-formatted Context:', openAIContext);

  // Example 3: Get the default (raw) context
  const rawContext = await honchoPlugin.getContext(query);
  console.log('Raw Context:', rawContext);
}

main();
```

## See Also

*   `HonchoPlugin`: The primary integration class for Honcho, which acts as a `ContextProvider`.

## Sources

[Source 1]: src/[Integrations](../subsystems/integrations.md)/honcho.ts