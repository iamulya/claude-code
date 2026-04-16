---
title: Lifecycle Hooks
entity_type: concept
summary: Interception points in the agent's execution loop that allow developers to observe or alter behavior before and after LLM calls and tool executions.
stub: false
compiled_at: 2026-04-16T14:09:55.363Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/permissions.md
confidence: 1
---

## What It Is
Lifecycle Hooks are interception points within the YAAF agent execution loop. They provide a structured mechanism for developers to monitor, modify, or halt an agent's workflow at critical stages of its operation. By using hooks, developers can implement cross-cutting concerns—such as security policies, rate limiting, audit logging, and cost management—without modifying the core logic of the agent or its tools.

## How It Works in YAAF
Hooks are defined as an object of type `Hooks` and are provided to the `Agent` during instantiation. The framework executes these hooks at four specific points in the execution cycle. Each hook receives a context object (`ctx`) containing relevant state information and must return an action object that determines how the agent should proceed.

### Hook Actions
Every hook must return one of the following actions:
*   `{ action: 'continue' }`: The agent proceeds with the execution normally.
*   `{ action: 'block', reason: string }`: The agent stops the current operation and injects the provided reason into the context.
*   `{ action: 'inject', message: string }`: The agent adds a specific message to the conversation history and continues.
*   `{ action: 'retry' }`: The agent re-attempts the current operation.

### Available Hooks
The framework supports the following interception points:

| Hook | Execution Point | Context Data Available |
| :--- | :--- | :--- |
| `beforeLLM` | Before the prompt is sent to the LLM. | Conversation history, tool schemas, turn number. |
| `afterLLM` | After the LLM returns a response. | LLM text content, requested tool calls, token usage. |
| `beforeToolCall` | Before a specific tool is executed. | Tool name, input arguments. |
| `afterToolCall` | After a tool has finished execution. | Execution result, error state, duration (ms). |

## Configuration
Hooks are configured by passing a `hooks` object to the `Agent` constructor.

```typescript
const agent = new Agent({
  hooks: {
    beforeLLM: async (ctx) => {
      console.log(`Turn ${ctx.turnNumber}: ${ctx.messages.length} messages`);
      return { action: 'continue' };
    },
    afterToolCall: async (ctx, result, error) => {
      // Logic for post-tool execution
      return { action: 'continue' };
    }
  },
  // ...other agent configuration
});
```

### Common Implementation Patterns

#### Rate Limiting
Developers can prevent tool overuse by tracking call counts within the `beforeToolCall` hook.

```typescript
const callCounts = new Map<string, number>();

const hooks = {
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

#### Cost Guard
The `afterLLM` hook can be used to monitor token usage and halt execution if a budget is exceeded.

```typescript
let totalTokens = 0;

const hooks = {
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

#### Audit Logging
The `afterToolCall` hook provides access to execution results and timing, making it suitable for telemetry and auditing.

```typescript
const hooks = {
  afterToolCall: async (ctx, result, error) => {
    await auditLog.append({
      timestamp: new Date(),
      tool: ctx.toolName,
      args: ctx.arguments,
      success: !error,
      durationMs: ctx.durationMs,
    });
    return { action: 'continue' };
  }
};
```

## See Also
* [[Permissions & Hooks]] (Source material)