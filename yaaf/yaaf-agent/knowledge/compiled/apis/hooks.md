---
title: Hooks
summary: Defines the structure for lifecycle callback functions that intercept agent execution.
entity_type: api
export_name: Hooks
source_file: src/hooks.ts
category: type
search_terms:
 - agent lifecycle callbacks
 - intercept tool calls
 - modify agent behavior
 - beforeLLM hook
 - afterToolCall hook
 - agent middleware
 - rate limiting agent tools
 - audit logging for agents
 - how to block tool execution
 - agent execution control
 - custom agent logic
 - security hooks for LLM
 - cost guardrails
stub: false
compiled_at: 2026-04-24T17:12:43.007Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/doctor.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/permissions.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/hooks.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/worker-runtime.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/promptGuard.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `Hooks` type defines an object containing optional callback functions that intercept an agent's execution loop at key lifecycle points [Source 2, Source 3]. Unlike read-only events, hooks can actively influence the agent's behavior by blocking, modifying, or short-circuiting operations [Source 3].

Hooks can be implemented for four distinct stages: before and after an [LLM](../concepts/llm.md) call, and before and after a tool call. They are provided to an agent via the `hooks` property in the `Agent` constructor [Source 2].

Common use cases for hooks include:
*   **Security:** Implementing [Prompt Injection Detection](../concepts/prompt-injection-detection.md) or sanitizing LLM outputs [Source 5].
*   **Guardrails:** Enforcing rate limits, cost budgets, or other operational constraints [Source 2].
*   **Auditing:** Logging detailed information about [Tool Calls](../concepts/tool-calls.md) and LLM interactions for analysis [Source 2].
*   **Dynamic Control Flow:** Blocking a tool call until a condition is met, such as user confirmation [Source 3].

If a hook function throws an unhandled error, the framework has fail-safe behaviors. A `beforeLLM` hook error will block the LLM Call, and an `afterLLM` hook error will block the LLM response from being processed further. This "fail-closed" design prevents potentially sensitive data from being processed [when](./when.md) a security hook fails [Source 3]. The framework also emits `hook:error` and `hook:blocked` events, which can be monitored [Source 1].

## Signature

`Hooks` is a TypeScript type alias for an object that can contain any of the four hook functions.

```typescript
import type { ChatMessage, ChatResult } from "./agents/runner.js";

// The action a hook can return to control the agent's execution
export type HookAction =
  | { action: 'continue' }              // Proceed normally
  | { action: 'block', reason: string } // Stop and inject a reason into the context
  | { action: 'inject', message: any }  // Add a message and continue
  | { action: 'retry' };                // Retry the operation

// The main Hooks object passed to the Agent constructor
export type Hooks = {
  /**
   * Runs before the agent sends messages to the LLM.
   */
  beforeLLM?: (ctx: {
    messages: readonly ChatMessage[];
    tools: any[]; // Schemas of available tools
    turnNumber: number;
  }) => Promise<HookAction>;

  /**
   * Runs after the agent receives a response from the LLM.
   */
  afterLLM?: (
    ctx: { turnNumber: number },
    result: ChatResult
  ) => Promise<HookAction>;

  /**
   * Runs before the agent executes a tool call requested by the LLM.
   */
  beforeToolCall?: (ctx: {
    toolName: string;
    arguments: Record<string, unknown>;
  }) => Promise<HookAction>;

  /**
   * Runs after the agent has executed a tool call.
   */
  afterToolCall?: (
    ctx: {
      toolName: string;
      arguments: Record<string, unknown>;
      durationMs: number;
      agentName?: string;
    },
    result: any, // The data returned by the tool
    error?: Error // The error if the tool threw an exception
  ) => Promise<HookAction>;
};
```
[Source 2, Source 3]

## Hook Properties

The `Hooks` object accepts the following optional properties:

### `beforeLLM`
Runs immediately before the list of `ChatMessage` objects is sent to the LLM. It receives the full message history, available tool schemas, and the current turn number. This hook is ideal for [Prompt Injection Detection](../concepts/prompt-injection-detection.md), [PII Redaction](../concepts/pii-redaction.md), or adding contextual information to the prompt [Source 2, Source 5].

### `afterLLM`
Runs immediately after a response is received from the LLM. It receives the `ChatResult`, which includes the LLM's text content, any requested tool calls, and token usage statistics. This hook can be used for output sanitization, cost tracking, or parsing structured data from the response [Source 2].

### `beforeToolCall`
Runs before executing a tool that the LLM has requested. It receives the tool's name and the arguments provided by the LLM. This is the primary mechanism for implementing fine-grained permissions, [Rate Limiting](../subsystems/rate-limiting.md), or requiring user confirmation for sensitive operations [Source 2].

### `afterToolCall`
Runs after a tool has finished executing, whether it succeeded or failed. It receives the context of the call (name, arguments, duration), the result data if successful, and the `Error` object if it failed. This hook is typically used for audit logging, performance monitoring, and metrics collection [Source 2].

## Examples

### Basic Logging and Blocking

This example demonstrates logging the number of messages before an LLM Call and blocking potentially dangerous `rm` commands in a shell tool.

```typescript
import { Agent, Hooks } from 'yaaf';

const hooks: Hooks = {
  beforeLLM: async (ctx) => {
    console.log(`Turn ${ctx.turnNumber}: Sending ${ctx.messages.length} messages to LLM.`);
    return { action: 'continue' };
  },
  beforeToolCall: async (ctx) => {
    if (ctx.toolName === 'exec' && ctx.arguments.cmd?.toString().includes('rm')) {
      return { action: 'block', reason: 'rm commands are blocked by a hook' };
    }
    return { action: 'continue' };
  },
};

const agent = new Agent({
  model: 'gpt-4o',
  tools: [execTool],
  hooks,
});
```
[Source 2]

### Rate Limiting Tool Calls

This hook prevents a specific tool from being called more than 10 times during a single agent run.

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
[Source 2]

### Audit Logging

This hook logs every [Tool Execution](../concepts/tool-execution.md) to an external audit service after the call completes.

```typescript
import { auditLog } from './auditService';

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
[Source 2]

### Cost Guardrail

This hook tracks the cumulative token usage across all [LLM Call](../concepts/llm-call.md)s and stops the agent if a budget is exceeded.

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
[Source 2]

### Using a Security Middleware Hook

Hooks can be encapsulated within classes for more complex logic, such as security scanning. The `PromptGuard` class provides a `beforeLLM` hook.

```typescript
import { Agent, PromptGuard } from 'yaaf';

// PromptGuard is a class that implements a beforeLLM hook
const guard = new PromptGuard({ mode: 'block', sensitivity: 'high' });

const agent = new Agent({
  model: 'gpt-4o',
  hooks: {
    // The hook() method returns a function compatible with the Hooks type
    beforeLLM: guard.hook(),
  },
});
```
[Source 5]

## Sources
[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/doctor.md
[Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/permissions.md
[Source 3]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/hooks.ts
[Source 5]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/promptGuard.ts