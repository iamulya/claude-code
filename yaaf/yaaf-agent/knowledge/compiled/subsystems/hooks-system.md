---
summary: A core extensibility mechanism in YAAF, allowing developers to inject custom logic at various points in an agent's lifecycle, such as before or after LLM calls.
primary_files:
 - src/hooks.ts
title: Hooks System
entity_type: subsystem
exports:
 - HookContext
 - HookResult
 - LLMHookResult
 - dispatchBeforeLLM
 - dispatchAfterLLM
search_terms:
 - agent lifecycle callbacks
 - intercept LLM calls
 - modify agent behavior
 - short-circuit agent execution
 - beforeToolCall hook
 - afterToolCall hook
 - beforeLLM hook
 - afterLLM hook
 - YAAF extensibility
 - how to add custom logic to agent
 - block tool execution
 - validate LLM output
 - PII redaction hook
 - fail-closed security
stub: false
compiled_at: 2026-04-25T00:28:35.986Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/hooks.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/groundingValidator.ts
compiled_from_quality: unknown
confidence: 1
---

## Purpose

The Hooks System provides a mechanism for developers to inject custom logic into the core execution loop of a YAAF [Agent](../apis/agent.md) [Source 1]. Hooks serve as lifecycle callbacks that can intercept operations like tool calls and LLM interactions. Unlike a read-only event system, hooks are designed to be interactive; they can block, modify, or short-circuit the agent's execution flow. This allows for the implementation of cross-cutting concerns such as security validation, logging, and data transformation without altering the agent's core logic [Source 1].

## Architecture

The Hooks System is designed around a set of named callback functions that are registered with an [Agent](../apis/agent.md) during its initialization. The agent's internal execution logic, likely managed by a component like the [AgentRunner](../apis/agent-runner.md), is responsible for invoking these hooks at specific points in its lifecycle [Source 1].

The primary hooks intercept the agent's interactions with tools and LLMs:
- `beforeToolCall`
- `afterToolCall`
- `beforeLLM`
- `afterLLM`

When a hook is triggered, it receives a context object containing relevant information, such as the tool name, arguments, and conversation history for a `beforeToolCall` hook [Source 1]. The hook's return value, typically an object with an `action` property (e.g., `{ action: 'continue' }` or `{ action: 'block' }`), dictates how the agent should proceed [Source 1].

For security-sensitive operations, the system implements a "fail-closed" policy. If a `beforeLLM` or `afterLLM` hook throws an error (for instance, if a PII redaction service is unavailable), the operation is blocked. This prevents potentially sensitive or unvalidated data from being sent to the LLM or returned to the user [Source 1].

## Integration Points

The Hooks System integrates with several other parts of the YAAF framework:

- **[Agent Core](./agent-core.md)**: The primary integration point is the [Agent](../apis/agent.md) constructor, where a `hooks` object containing the desired callback functions is provided during configuration [Source 1].
- **[AgentRunner](../apis/agent-runner.md)**: This component is responsible for dispatching the hooks at the correct moments during the agent's execution cycle by calling functions like `dispatchBeforeLLM` and `dispatchAfterLLM` [Source 1].
- **Security Subsystems**: Components like the [GroundingValidator](../apis/grounding-validator.md) are designed to be integrated via the Hooks System. The [GroundingValidator](../apis/grounding-validator.md) exposes a `hook()` method that returns a pre-configured `afterLLM` hook, which can be directly passed to the [Agent](../apis/agent.md) configuration [Source 2].

## Key APIs

- **`Hooks`**: An object containing the set of lifecycle callback functions to be registered with an [Agent](../apis/agent.md). Key properties include `beforeToolCall`, `afterToolCall`, `beforeLLM`, and `afterLLM` [Source 1].
- **`HookContext`**: A data object passed to tool-related hooks, providing details like `toolName`, `arguments`, `messages`, and the current `iteration` number [Source 1].
- **[LLMHookResult](../apis/llm-hook-result.md)**: The return type for `afterLLM` hooks. It is an object that specifies the next `action` for the agent to take, such as `'continue'` [Source 1].
- **`dispatchBeforeLLM()`**: An internal framework function that executes all registered `beforeLLM` hooks, manages their results, and handles the fail-closed error policy [Source 1].
- **`dispatchAfterLLM()`**: An internal framework function that executes all registered `afterLLM` hooks on an LLM's response, aggregates their results, and enforces the fail-closed policy [Source 1].

## Configuration

Hooks are configured by passing a `hooks` object to the [Agent](../apis/agent.md) constructor. This can be done by defining inline functions or by using hooks provided by other modules or plugins.

**Example 1: Inline Hook Definition**
This example shows how to define `beforeToolCall` and `afterToolCall` hooks directly within the agent configuration to add conditional logic and auditing [Source 1].

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

**Example 2: Using a Pre-built Hook**
This example demonstrates integrating a complex validation mechanism by using the hook provided by the [GroundingValidator](../apis/grounding-validator.md) class [Source 2].

```typescript
import { GroundingValidator } from 'yaaf';

const validator = new GroundingValidator({
  mode: 'warn',
  minCoverage: 0.3,
});

const agent = new Agent({
  hooks: {
    afterLLM: validator.hook(),
  },
});
```

## Extension Points

The Hooks System is itself the primary extension point for customizing agent behavior. Developers can create their own reusable logic by encapsulating it within a class or factory function that returns a valid hook function. The [GroundingValidator](../apis/grounding-validator.md) serves as a canonical example of this pattern, providing a configurable and reusable component that extends agent functionality by plugging into the `afterLLM` lifecycle event [Source 2]. This pattern allows for the creation of a rich ecosystem of plugins for security, monitoring, and other cross-cutting concerns.

## Sources
[Source 1]: src/hooks.ts
[Source 2]: src/security/groundingValidator.ts