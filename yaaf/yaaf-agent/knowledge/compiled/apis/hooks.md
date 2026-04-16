---
title: Hooks
entity_type: api
summary: Interface defining lifecycle interception points for agent execution, allowing for monitoring, modification, or blocking of actions.
export_name: Hooks
source_file: src/types.ts
category: interface
stub: false
compiled_at: 2026-04-16T14:09:51.879Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/permissions.md
confidence: 0.95
---

## Overview
The `Hooks` interface defines a set of optional callback functions that intercept an agent's execution at specific lifecycle stages. These interception points allow developers to monitor agent behavior, enforce safety constraints, log activity, or modify the flow of execution by blocking or retrying operations.

Hooks are typically used for cross-cutting concerns such as:
*   **Rate Limiting:** Restricting the frequency of tool calls.
*   **Cost Management:** Monitoring token usage and stopping execution if budgets are exceeded.
*   **Audit Logging:** Recording detailed traces of LLM interactions and tool executions.
*   **Safety Enforcement:** Inspecting tool arguments to block potentially dangerous commands.

## Signature / Constructor

```typescript
interface Hooks {
  beforeLLM?: (ctx: BeforeLLMContext) => Promise<HookAction>;
  afterLLM?: (ctx: AfterLLMContext, result: LLMResult) => Promise<HookAction>;
  beforeToolCall?: (ctx: BeforeToolContext) => Promise<HookAction>;
  afterToolCall?: (ctx: AfterToolContext, result: any, error?: Error) => Promise<HookAction>;
}

type HookAction = 
  | { action: 'continue' }              // Proceed normally
  | { action: 'block', reason: string }  // Stop and inject reason into conversation
  | { action: 'inject', message: string} // Add a message and continue
  | { action: 'retry' };                 // Retry the current operation
```

## Methods & Properties

### beforeLLM
Invoked immediately before the agent calls the Language Model.
*   **Context (`ctx`)**: Contains `messages` (full conversation history), `tools` (available tool schemas), and `turnNumber` (the current iteration count).

### afterLLM
Invoked after the LLM returns a response but before any tool calls are processed.
*   **Context (`ctx`)**: Contains metadata about the turn.
*   **Result (`result`)**: Contains `content` (text response), `toolCalls` (requested tool executions), and `usage` (token counts).

### beforeToolCall
Invoked before a specific tool is executed.
*   **Context (`ctx`)**: Contains `toolName` and `arguments` (the inputs provided by the LLM).

### afterToolCall
Invoked after a tool execution completes or fails.
*   **Context (`ctx`)**: Contains `toolName`, `arguments`, `durationMs` (execution time), and `agentName`.
*   **Result**: The value returned by the tool.
*   **Error**: Any error thrown during tool execution.

## Examples

### Rate Limiting
This example tracks tool usage and blocks execution if a specific tool is called more than 10 times.

```typescript
const callCounts = new Map<string, number>();

const hooks: Hooks = {
  beforeToolCall: async (ctx) => {
    const count = (callCounts.get(ctx.toolName) ?? 0) + 1;
    callCounts.set(ctx.toolName, count);

    if (count > 10) {
      return {
        action: 'block',
        reason: `${ctx.toolName} called too many times (${count})`,
      };
    }
    return { action: 'continue' };
  }
};
```

### Cost Guard
This example monitors token usage and blocks the agent if it exceeds a predefined budget.

```typescript
let totalTokens = 0;

const hooks: Hooks = {
  afterLLM: async (_ctx, result) => {
    totalTokens += result.usage?.totalTokens ?? 0;
    if (totalTokens > 100_000) {
      return {
        action: 'block',
        reason: 'Token budget exceeded (100k)',
      };
    }
    return { action: 'continue' };
  }
};
```

### Audit Logging
This example logs the results of every tool execution for auditing purposes.

```typescript
const hooks: Hooks = {
  afterToolCall: async (ctx, result, error) => {
    await auditLog.append({
      timestamp: new Date(),
      tool: ctx.toolName,
      args: ctx.arguments,
      success: !error,
      durationMs: ctx.durationMs,
      agent: ctx.agentName,
    });
    return { action: 'continue' };
  }
};
```

## See Also
*   **PermissionPolicy**: A specialized system for governing tool access that works alongside hooks.
*   **Sandbox**: Environment restrictions for file system and network access.