---
summary: A memory strategy that extracts structured notes from conversations based on token and tool-call thresholds, mirroring Claude Code's memory architecture.
export_name: sessionMemoryStrategy
source_file: src/memory/strategies/session.ts
category: function
title: Session Memory Extractor
entity_type: api
stub: false
compiled_at: 2026-04-16T14:09:12.926Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/memory.md
confidence: 0.9
---

## Overview
The `sessionMemoryStrategy` is a built-in memory implementation designed for long-running agentic sessions. It mirrors the `SessionMemory` system found in Claude Code, focusing on maintaining a structured markdown document of "notes" that evolves as the conversation progresses.

This strategy is used to synthesize conversation history into a persistent, structured format. It triggers an extraction process—typically involving an LLM call—only when specific thresholds (token counts or tool-call frequency) are met. This ensures that critical context, such as task specifications and learned behaviors, survives context window compaction without requiring an LLM call on every turn.

## Signature / Constructor
The strategy is instantiated via a factory function that accepts a configuration object.

```typescript
function sessionMemoryStrategy(config: SessionMemoryConfig): MemoryStrategy;

interface SessionMemoryConfig {
  /** Function to perform the LLM-based extraction */
  extractFn: (ctx: {
    messages: ReadonlyArray<{ role: string; content: string }>;
    currentNotes: string;
    systemPrompt: string;
    signal?: AbortSignal;
  }) => Promise<string>;
  /** Filesystem path where the markdown notes are persisted */
  storagePath: string;
  /** Threshold to trigger the first extraction (cold-start) */
  minimumTokensToInit?: number;
  /** Threshold of new tokens required to trigger a subsequent update */
  minimumTokensBetweenUpdate?: number;
  /** Number of tool calls required to trigger an update */
  toolCallsBetweenUpdates?: number;
  /** Custom markdown template for the notes */
  template?: string;
}
```

## Methods & Properties
The factory returns an object implementing the `MemoryStrategy` interface. Key internal behaviors include:

- **shouldExtract**: Evaluates the `MemoryContext`. It returns `true` if the `totalTokens` exceeds the initialization threshold, or if the `totalTokens` or `toolCallsSinceExtraction` exceed their respective "between update" thresholds.
- **extract**: Invokes the provided `extractFn`. The resulting markdown is written to the `storagePath`.
- **retrieve**: Reads the notes from the `storagePath` and formats them into a system prompt section for the agent.

### Default Template
If no template is provided, the strategy uses `DEFAULT_SESSION_MEMORY_TEMPLATE`, which organizes information into nine sections:
1. **Current State**: High-level status of the session.
2. **Task Specification**: The primary goals defined by the user.
3. **Files and Functions**: Relevant technical context discovered.
4. **Workflow**: Established patterns for the current task.
5. **Errors & Corrections**: Previous mistakes and how they were resolved.
6. **Codebase Documentation**: Insights into the project structure.
7. **Learnings**: General knowledge acquired during the session.
8. **Key Results**: Completed milestones.
9. **Worklog**: A chronological history of actions taken.

## Examples
The following example demonstrates how to configure the strategy with a custom LLM call and specific thresholds.

```typescript
import { sessionMemoryStrategy, DEFAULT_SESSION_MEMORY_TEMPLATE, Agent } from 'yaaf';

const agent = new Agent({
  memoryStrategy: sessionMemoryStrategy({
    // Define how the LLM should process the notes
    extractFn: async ({ messages, currentNotes, systemPrompt, signal }) => {
      const response = await myModel.complete({
        messages: [
          ...messages, 
          { role: 'user', content: systemPrompt }
        ],
        signal,
      });
      return response.content ?? '';
    },
    storagePath: './.memory/session-notes.md',
    minimumTokensToInit: 10_000,       // Wait for 10k tokens before first extraction
    minimumTokensBetweenUpdate: 5_000, // Update every 5k new tokens
    toolCallsBetweenUpdates: 3,        // Or every 3 tool calls
    template: DEFAULT_SESSION_MEMORY_TEMPLATE,
  }),
});
```

## See Also
- `DEFAULT_SESSION_MEMORY_TEMPLATE`
- `MemoryStrategy`
- `MemoryContext`