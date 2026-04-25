---
title: Hook
entity_type: concept
summary: An extension point in the YAAF framework that allows developers to inject custom logic at specific stages of an agent's lifecycle or a subsystem's operation.
related_subsystems:
 - Server Runtime
 - Security
search_terms:
 - custom logic injection
 - agent lifecycle events
 - intercept agent execution
 - middleware for agents
 - beforeRun hook
 - afterRun hook
 - afterLLM hook
 - how to add logging to agent
 - modify agent input
 - process agent output
 - YAAF extension points
 - callbacks in agent lifecycle
 - server runtime middleware
 - agent security hooks
stub: false
compiled_at: 2026-04-24T17:55:52.788Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/server-runtime.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/autoExtract.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/outputSanitizer.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

A Hook in YAAF is a mechanism that provides a formal extension point for developers to inject custom code at specific, predefined stages within an agent's or subsystem's execution flow. Hooks act as callbacks that are invoked by the framework [when](../apis/when.md) a particular event occurs, such as before an agent processes input, after an [LLM](./llm.md) generates a response, or after a request is completed.

This pattern allows for the separation of concerns, enabling functionality like logging, metrics, security scanning, authentication, and data transformation to be added declaratively without modifying the core logic of the agent or subsystem.

## How It Works in YAAF

Hooks are typically implemented as functions passed into the configuration object of a YAAF component, such as an `Agent` or the `[[[[[[[[Server Runtime]]]]]]]]`. The framework guarantees that it will invoke these functions at the appropriate point in the lifecycle, passing relevant context as arguments.

Different hooks exist at different levels of the framework:

*   **Agent-Level Hooks**: These are configured directly on the `Agent` instance and tie into its core processing loop. A key example is the `afterLLM` hook, which is executed immediately after the LLM returns a response. This allows for direct inspection, modification, or even rejection of the LLM's output before it is used for [Tool Calls](./tool-calls.md) or sent to the user [Source 3]. The `OutputSanitizer`, for instance, uses the `afterLLM` hook to scan for and remove malicious content. Hooks at this level can sometimes return values that alter the agent's control flow, such as an instruction to stop processing [Source 3].

*   **Subsystem-Level Hooks**: These are specific to a particular subsystem, like the `Server Runtime`. They provide access to context relevant to that subsystem. For example, the `Server Runtime` offers `beforeRun` and `afterRun` hooks [Source 1].
    *   The `beforeRun` hook receives the user input and the HTTP request object, and it can return a modified input string. This is useful for injecting context, such as a user ID from an authentication header, into the prompt [Source 1].
    *   The `afterRun` hook is executed after the agent has finished processing and has generated a final response. It receives the input, the final response, and the HTTP request object, making it suitable for logging the entire transaction to an analytics service [Source 1].

## Configuration

Hooks are configured by passing functions to the options object of the relevant YAAF component.

### Server Runtime Hooks

The `createServer` function accepts `beforeRun` and `afterRun` hooks for instrumenting the request/response lifecycle.

```typescript
import { createServer } from 'yaaf/server';
import { Agent } from 'yaaf';

const agent = new Agent({ /* ... */ });

const server = createServer(agent, {
  // ... other server config

  // ── Hooks ─────────────────────────────────────────
  beforeRun: async (input, req) => {
    // Inject user context from auth headers
    const userId = req.headers['x-user-id'];
    return `[User: ${userId}] ${input}`;
  },
  afterRun: async (input, response, req) => {
    // Log the interaction to an external service
    await analytics.log({ input, response, ip: req.socket.remoteAddress });
  },
});
```
[Source 1]

### [Agent Hooks](./agent-hooks.md)

The `Agent` constructor accepts a `hooks` object for instrumenting the core agent lifecycle. The `afterLLM` hook is a common extension point, often used for security.

```typescript
import { Agent, OutputSanitizer } from 'yaaf';

const sanitizer = new OutputSanitizer({
  detectPromptInjection: true,
  blockOnInjection: true,
});

const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
  hooks: {
    // This hook runs after every LLM call
    afterLLM: sanitizer.hook(),
  },
});
```
[Source 3]

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/server-runtime.md
[Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/[Memory](./memory.md)/autoExtract.ts
[Source 3]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/outputSanitizer.ts