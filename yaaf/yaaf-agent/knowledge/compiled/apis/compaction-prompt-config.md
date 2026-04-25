---
title: CompactionPromptConfig
entity_type: api
summary: Configuration options for building structured compaction prompts.
export_name: CompactionPromptConfig
source_file: src/context/compactionPrompts.ts
category: type
search_terms:
 - context compaction prompt
 - summarization prompt configuration
 - partial summary prompt
 - full summary prompt
 - custom summary sections
 - buildCompactionPrompt options
 - how to configure conversation summary
 - prompt engineering for summarization
 - structured summarization
 - compaction prompt instructions
 - YAAF summarization
 - conversation history summary
stub: false
compiled_at: 2026-04-24T16:56:01.148Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/context/compactionPrompts.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`CompactionPromptConfig` is a TypeScript type that defines the configuration options for the `buildCompactionPrompt` function. It allows for customization of the structured summarization prompts used for [Context Compaction](../concepts/context-compaction.md) [Source 1].

This configuration is used to control aspects of the generated prompt, such as whether it should produce a full or partial summary of a conversation, which specific sections the summary should include, and any additional instructions for the language model [Source 1].

## Signature

The `CompactionPromptConfig` type is defined as follows [Source 1]:

```typescript
export type CompactionPromptConfig = {
  /**
   * If true, generates a "partial" prompt that only summarizes recent messages
   * (used [[[[[[[[when]]]]]]]] old messages are preserved and only the middle is compacted).
   * If false, generates a "full" prompt that summarizes the entire conversation.
   */
  partial?: boolean;
  /**
   * Custom sections to include in the summary. If omitted, uses all 9 defaults.
   */
  sections?: string[];
  /**
   * Extra instructions appended to the prompt.
   */
  additionalInstructions?: string;
};
```

## Examples

### Default (Full) Compaction

To generate a standard prompt for summarizing an entire conversation, the `buildCompactionPrompt` function can be called with an empty configuration object or no arguments.

```typescript
import { buildCompactionPrompt } from 'yaaf/context';

// An empty config generates a full compaction prompt by default.
const config: CompactionPromptConfig = {};
const prompt = buildCompactionPrompt(config);

// The prompt will instruct the model to summarize the entire conversation.
```

### Partial Compaction

To generate a prompt for summarizing only the most recent messages (e.g., when compacting the middle of a long conversation), set the `partial` property to `true`.

```typescript
import { buildCompactionPrompt } from 'yaaf/context';

const config: CompactionPromptConfig = {
  partial: true,
};

const prompt = buildCompactionPrompt(config);

// The prompt will instruct the model to summarize only the recent messages.
```

### Custom Sections and Instructions

To guide the model's output more precisely, you can specify custom summary sections and add extra instructions.

```typescript
import { buildCompactionPrompt } from 'yaaf/context';

const config: CompactionPromptConfig = {
  partial: false,
  sections: [
    'Key Decisions Made',
    'Open Questions',
    'Next Steps',
  ],
  additionalInstructions: 'The summary must be written in the style of a pirate.',
};

const prompt = buildCompactionPrompt(config);

// The prompt will ask for a full summary with only the three specified sections
// and include the additional stylistic instruction.
```

## See Also

- `buildCompactionPrompt`: The function that uses this configuration type to generate a compaction prompt.
- `stripAnalysisBlock`: A utility function to extract the final `<summary>` from the model's response.
- `extractAnalysisBlock`: A utility function to extract the model's reasoning `<analysis>` scratchpad from its response.

## Sources

[Source 1]: src/context/compactionPrompts.ts