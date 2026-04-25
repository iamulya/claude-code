---
title: Lifecycle Hooks
summary: A mechanism to intercept and modify agent execution at key points.
entity_type: concept
search_terms:
 - agent execution interception
 - modify agent behavior
 - YAAF hooks
 - beforeLLM hook
 - afterLLM hook
 - beforeToolCall hook
 - afterToolCall hook
 - how to add audit logging to agent
 - implement rate limiting for tools
 - agent cost control
 - stop agent execution programmatically
 - inject message into agent context
 - agent lifecycle events
 - custom agent logic
stub: false
compiled_at: 2026-04-24T17:57:20.159Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/permissions.md
compiled_from_quality: documentation
confidence: 0.95
---

## What It Is

Lifecycle Hooks in YAAF are a mechanism for developers to intercept the agent execution process at specific, well-defined points [Source 1]. They provide a way to run custom code before or after critical operations, such as calls to an [LLM](./llm.md) or the execution of a tool. This allows for the implementation of cross-cutting concerns like logging, metrics collection, security checks, [Rate Limiting](../subsystems/rate-limiting.md), and [Cost Management](../subsystems/cost-management.md) without altering the core agent logic [Source 1].

## How It Works in YAAF

Hooks are implemented as asynchronous functions that are passed to the agent's configuration. Each hook receives a context object with relevant information about the current state of the execution loop and must return an action object that dictates how the agent should proceed [Source 1].

The four possible actions a hook can return are [Source 1]:
*   `{ action: 'continue' }`: Allows the agent's execution to proceed normally.
*   `{ action: 'block', reason: '...' }`: Halts the current operation and injects the provided reason into the agent's context.
*   `{ action: 'inject', message: '...'}`: Adds a specified message to the conversation history and then continues execution.
*   `{ action: 'retry' }`: Instructs the agent to retry the most recent operation.

YAAF defines four distinct hooks that correspond to key stages in the agent's request-response cycle [Source 1]:

1.  **`beforeLLM`**: Triggered just before the agent makes a call to the LLM. The context includes the full conversation history, available tool schemas, and the current turn number.
2.  **`afterLLM`**: Triggered after the agent receives a response from the LLM. The context includes the LLM's response content, any requested [Tool Calls](./tool-calls.md), and token usage statistics.
3.  **`beforeToolCall`**: Triggered before the agent executes a tool. The context includes the name of the tool and the arguments it will be called with. This is a common place to implement security policies, such as blocking dangerous commands.
4.  **`afterToolCall`**: Triggered after a tool has finished executing. The context includes the tool's name, execution duration, and the result or error. This is often used for logging and metrics.

Common patterns for using hooks include [Source 1]:
*   **Rate Limiting**: Using `beforeToolCall` to track and limit the number of times a specific tool can be invoked.
*   **Audit Logging**: Using `afterToolCall` to record detailed information about every [Tool Execution](./tool-execution.md) for security and compliance purposes.
*   **Cost Guard**: Using `afterLLM` to monitor cumulative token usage and stop the agent if a predefined budget is exceeded.

## Configuration

Lifecycle Hooks are configured by providing a `hooks` object during the instantiation of an `Agent`. This object maps hook names to their corresponding asynchronous function implementations [Source 1].

```typescript
const hooks: Hooks = {
  // Runs before the agent calls the LLM
  beforeLLM: async (ctx) => {
    // ctx.messages — full conversation history
    // ctx.tools — available tool schemas
    // ctx.turnNumber — which iteration
    console.log(`Turn ${ctx.turnNumber}: ${ctx.messages.length} messages`);
    return { action: 'continue' };
  },

  // Runs after the agent receives a response from the LLM
  afterLLM: async (ctx, result) => {
    // result.content — LLM text
    // result.toolCalls — requested tool calls
    // result.usage — token counts
    if ((result.usage?.totalTokens ?? 0) > 10000) {
        return { action: 'block', reason: 'Token usage for this turn is too high.' };
    }
    return { action: 'continue' };
  },

  // Runs before a tool is executed
  beforeToolCall: async (ctx) => {
    // ctx.toolName — which tool
    // ctx.arguments — tool inputs
    if (ctx.toolName === 'exec' && ctx.arguments.cmd?.includes('rm')) {
      return { action: 'block', reason: 'rm commands are blocked by a hook' };
    }
    return { action: 'continue' };
  },

  // Runs after a tool has been executed
  afterToolCall: async (ctx, result, error) => {
    // Example: log metrics
    metrics.histogram('tool_duration_ms', ctx.durationMs, {
      tool: ctx.toolName,
      success: !error,
    });
    return { action: 'continue' };
  },
};

const agent = new Agent({ hooks, ... });
```

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/permissions.md