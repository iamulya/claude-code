---
title: HookContext
entity_type: api
summary: Provides contextual information to agent lifecycle hook functions related to tool calls.
export_name: HookContext
source_file: src/hooks.ts
category: type
search_terms:
 - agent lifecycle context
 - hook function parameters
 - beforeToolCall context
 - accessing tool arguments in hooks
 - getting conversation history in a hook
 - hook execution state
 - tool call interception data
 - what is in the hook context object
 - agent iteration count
 - hook callback arguments
 - tool call information for hooks
 - context for tool execution
stub: false
compiled_at: 2026-04-24T17:12:10.658Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/hooks.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

`HookContext` is a TypeScript type that defines the shape of the context object passed to tool-related agent [Lifecycle Hooks](../concepts/lifecycle-hooks.md), such as `beforeToolCall` and `afterToolCall` [Source 1].

This object provides the hook function with a snapshot of the agent's state at the moment a tool is about to be called or has just been called. It includes the name of the tool, the arguments provided by the [LLM](../concepts/llm.md), the complete conversation history, and the current iteration number. Hooks use this information to implement cross-cutting concerns like logging, validation, security checks, or short-circuiting the agent's execution loop [Source 1].

## Signature

`HookContext` is a type alias for an object with the following properties [Source 1]:

```typescript
export type HookContext = {
  /** Name of the tool being called */
  toolName: string;

  /** Parsed arguments the LLM passed to the tool */
  arguments: Record<string, unknown>;

  /** Full conversation history at time of hook */
  messages: readonly ChatMessage[];

  /** Current iteration (LLM call count) in this agent run */
  iteration: number;
};
```

### Properties

- **`toolName`**: `string`
  The name of the tool that the agent is attempting to execute [Source 1].

- **`arguments`**: `Record<string, unknown>`
  An object containing the arguments for the tool call, as parsed from the LLM's response [Source 1].

- **`messages`**: `readonly ChatMessage[]`
  A read-only array representing the entire conversation history up to the point of the hook's invocation [Source 1].

- **`iteration`**: `number`
  The current turn count in the agent's execution loop. This corresponds to the number of LLM calls made so far in the current run [Source 1].

## Examples

The following example demonstrates how to use the `HookContext` object within a `beforeToolCall` hook to conditionally block a tool's execution [Source 1].

```typescript
import { Agent, HookContext } from 'yaaf';

// A variable to simulate external state, like user confirmation
let userConfirmed = false;

const agent = new Agent({
  systemPrompt: 'You are a helpful travel booking assistant.',
  tools: [/* ... your tools ... */],
  hooks: {
    // The first argument to this hook is of type HookContext
    beforeToolCall: async ({ toolName, arguments: args }: HookContext) => {
      console.log(`Hook: beforeToolCall for tool "${toolName}"`);

      // Use context to implement a confirmation step
      if (toolName === 'book_trip' && !userConfirmed) {
        console.log('Blocking tool call to await user confirmation.');
        return { action: 'block', reason: 'Awaiting user confirmation' };
      }

      // Allow all other tool calls to proceed
      return { action: 'continue' };
    },
  },
});
```

## Sources

[Source 1]: src/hooks.ts