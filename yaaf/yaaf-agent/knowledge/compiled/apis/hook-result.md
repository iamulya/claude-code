---
title: HookResult
entity_type: api
summary: Defines the possible return actions for agent lifecycle hook functions.
export_name: HookResult
source_file: src/hooks.ts
category: type
search_terms:
 - agent lifecycle hooks
 - hook return value
 - continue execution
 - block tool call
 - short-circuit agent
 - hook actions
 - beforeToolCall return
 - afterToolCall return
 - control agent flow
 - intercept tool calls
 - agent control object
 - hook action types
stub: false
compiled_at: 2026-04-24T17:12:29.811Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/hooks.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `HookResult` type is a discriminated union that represents the set of possible actions a YAAF agent hook can return to control the agent's execution flow [Source 1]. Hooks, such as `beforeToolCall`, intercept operations and must return a `HookResult` object. This object instructs the agent runner whether to continue the operation, block it, or modify it [Source 1].

This mechanism allows for implementing cross-cutting concerns like security checks, user confirmation steps, or dynamic modifications to the agent's behavior without altering the core agent logic [Source 1].

## Signature

`HookResult` is a union of objects, each with an `action` property that determines the agent's next step. The known actions based on the source material are `continue` and `block` [Source 1].

```typescript
export type HookResult =
  | { action: "continue" }
  | { action: "block", reason: string };
```

### Actions

*   **`{ action: 'continue' }`**: Instructs the agent to proceed with the current operation without interruption. For a `beforeToolCall` hook, this means the tool will be executed as planned [Source 1].
*   **`{ action: 'block', reason: string }`**: Halts the current operation. The `reason` property provides a human-readable explanation for why the action was blocked. This can be used to stop a tool call pending user confirmation or for security reasons [Source 1].

While the high-level documentation for hooks mentions the ability to "modify" execution, the specific shape of a modify action object is not defined in the provided source material [Source 1].

## Examples

The following example demonstrates using `HookResult` within a `beforeToolCall` hook to implement a user confirmation step before executing a sensitive tool [Source 1].

```typescript
const userConfirmed = false; // Example state

const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
  hooks: {
    beforeToolCall: async ({ toolName, arguments: args }) => {
      // Block the 'book_trip' tool if the user has not confirmed.
      if (toolName === 'book_trip' && !userConfirmed) {
        return { action: 'block', reason: 'Awaiting user confirmation' };
      }
      // Allow all other tool calls to proceed.
      return { action: 'continue' };
    },
    afterToolCall: async ({ toolName }, result) => {
      // This hook also returns a HookResult, typically 'continue'.
      await auditLog.record({ tool: toolName, result });
      return { action: 'continue' };
    },
  },
});
```

In this example, if the `book_trip` tool is about to be called, the hook checks the `userConfirmed` flag. If it's false, the hook returns a `block` action, preventing the tool from running. Otherwise, it returns a `continue` action, allowing the execution to proceed [Source 1].

## Sources

[Source 1]: src/hooks.ts