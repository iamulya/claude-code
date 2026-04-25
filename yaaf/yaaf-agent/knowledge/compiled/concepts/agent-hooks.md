---
title: Agent Hooks
entity_type: concept
summary: A core mechanism in YAAF for intercepting and modifying agent execution lifecycle events.
primary_files:
 - src/hooks.ts
search_terms:
 - lifecycle callbacks
 - intercept agent execution
 - modify agent behavior
 - block tool calls
 - short-circuit agent loop
 - beforeToolCall hook
 - afterToolCall hook
 - beforeLLM hook
 - afterLLM hook
 - agent lifecycle events
 - agent middleware
 - security hooks for agents
 - PII redaction hook
 - agent auditing and logging
stub: false
compiled_at: 2026-04-24T17:51:22.184Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/hooks.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

Agent Hooks are a mechanism in YAAF that provides lifecycle callbacks for the agent execution loop [Source 1]. They allow developers to intercept, modify, block, or short-circuit the agent's execution at critical points, such as before and after [LLM](./llm.md) calls or [Tool Execution](./tool-execution.md)s. Unlike read-only events, hooks are interactive and can alter the flow of control, making them suitable for implementing security policies, logging, user confirmation steps, and other cross-cutting concerns [Source 1].

## How It Works in YAAF

Hooks are functions that are executed at specific points in the agent's lifecycle. They receive a context object with information about the current state of the execution and must return an action object indicating how the agent should proceed [Source 1].

The primary hookable events are:
*   **`beforeLLM`**: Executes before a message list is sent to the LLM.
*   **`afterLLM`**: Executes after the agent receives a response from the LLM.
*   **`beforeToolCall`**: Executes before a tool is called.
*   **`afterToolCall`**: Executes after a tool has been called and returned a result.

The `HookContext` object passed to tool-related hooks contains the `toolName`, the `arguments` for the tool, the full conversation `messages` history, and the current `iteration` number [Source 1].

A key design principle for LLM-related hooks is to "fail closed" for security. If a `beforeLLM` hook (e.g., a PII redactor) throws an error, the entire [LLM Call](./llm-call.md) is blocked to prevent potentially unscanned data from being sent. Similarly, if an `afterLLM` hook (e.g., an output sanitizer) fails, the LLM's response is blocked from reaching the user or subsequent steps [Source 1]. This behavior is managed by the `dispatchBeforeLLM` and `dispatchAfterLLM` functions [Source 1].

## Configuration

Hooks are configured by passing an object to the `hooks` property in the `Agent` constructor. Each key in the object corresponds to a lifecycle event [Source 1].

```typescript
const agent = new Agent({
  systemPrompt: '...',
  hooks: {
    beforeToolCall: async ({ toolName, arguments: args }) => {
      if (toolName === 'book_trip' && !userConfirmed) {
        return { action: 'block', reason: 'Awaiting user confirmation' };
      }
      return { action: 'continue' };
    },
    afterToolCall: async ({ toolName }, result) => {
      await auditLog.record({ tool: toolName, result });
      return { action: 'continue' };
    },
  },
});
```
In this example, the `beforeToolCall` hook prevents the `book_trip` tool from executing without confirmation, while the `afterToolCall` hook records an audit log of every successful Tool Execution [Source 1].

## Sources

[Source 1]: src/hooks.ts