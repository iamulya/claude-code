---
title: HookResult
entity_type: api
summary: The return type for agent hooks determining whether to continue or modify execution.
export_name: HookResult
source_file: src/hooks.ts
category: type
stub: false
compiled_at: 2026-04-16T14:18:43.136Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/hooks.ts
confidence: 1
---

## Overview
`HookResult` is a TypeScript type that defines the expected return value for agent lifecycle hooks. Unlike events, which are read-only notifications, hooks in YAAF are interceptors that can influence the execution flow of the agent. By returning a `HookResult`, a hook can signal the agent to proceed with its current task or halt execution based on custom logic, such as security policies or user confirmation requirements.

## Signature / Constructor

```typescript
export type HookResult =
  | { action: 'continue' }
  | { action: 'block'; reason: string };
```

## Methods & Properties

The `HookResult` is a discriminated union. The properties available depend on the value of the `action` field:

| Property | Type | Description |
| :--- | :--- | :--- |
| `action` | `'continue' \| 'block'` | Determines the next step in the execution loop. |
| `reason` | `string` | Required when `action` is set to `'block'`. Provides a description of why the execution was stopped. |

## Examples

### Blocking a Tool Call
This example demonstrates using `HookResult` to prevent a specific tool from executing unless a condition is met.

```typescript
const agent = new Agent({
  systemPrompt: '...',
  hooks: {
    beforeToolCall: async ({ toolName, arguments: args }) => {
      if (toolName === 'book_trip' && !userConfirmed) {
        // Returning a block action stops the tool execution
        return { 
          action: 'block', 
          reason: 'Awaiting user confirmation' 
        };
      }
      // Returning continue allows the agent to proceed
      return { action: 'continue' };
    },
  },
});
```

### Simple Continuation
Hooks that perform side effects (like logging) without interfering with the flow must return a `continue` action.

```typescript
afterToolCall: async ({ toolName }, result) => {
  await auditLog.record({ tool: toolName, result });
  return { action: 'continue' };
}
```

## See Also
* `HookContext`
* `LLMHookResult`