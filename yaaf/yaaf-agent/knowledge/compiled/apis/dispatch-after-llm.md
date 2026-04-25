---
title: dispatchAfterLLM
entity_type: api
summary: Dispatches the `afterLLM` lifecycle hook to all registered listeners, handling errors by blocking the LLM response.
export_name: dispatchAfterLLM
source_file: src/hooks.ts
category: function
search_terms:
 - after LLM hook
 - LLM response interception
 - modify LLM output
 - sanitize LLM response
 - agent lifecycle hooks
 - post-processing LLM results
 - how to inspect LLM output
 - block LLM response on error
 - fail-closed LLM hook
 - output validation hook
 - PII redaction after LLM
 - agent security hooks
stub: false
compiled_at: 2026-04-24T17:03:03.278Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/hooks.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `dispatchAfter[[[[[[[[LLM]]]]]]]]` function is an internal part of the YAAF agent execution loop responsible for invoking the `afterLLM` hook [Source 1]. This hook allows developers to intercept, inspect, and potentially modify or block the response from a Large Language Model (LLM) before it is processed further or returned to the user [Source 1].

A key feature of this dispatcher is its "fail-closed" error handling strategy. If any registered `afterLLM` hook throws an error during its execution (for instance, a PII redactor or output sanitizer fails), `dispatchAfterLLM` catches the error and blocks the LLM's response. This is a security measure designed to prevent unsanitized, unvalidated, or potentially harmful output from reaching the user or subsequent agent steps [when](./when.md) a security-critical hook is not functioning correctly [Source 1].

Developers typically do not call this function directly. Instead, they provide `afterLLM` hook implementations when configuring an agent, and the framework's runtime calls `dispatchAfterLLM` at the appropriate point in the lifecycle [Source 1].

## Signature

The function has the following signature [Source 1]:

```typescript
export async function dispatchAfterLLM(
  hooks: Hooks | undefined,
  response: ChatResult,
  iteration: number,
  callbacks?: HookEventCallbacks,
): Promise<LLMHookResult>
```

### Parameters

-   `hooks` (`Hooks | undefined`): An object containing the hook implementations provided during agent configuration.
-   `response` (`ChatResult`): The response object received from the LLM. The `ChatResult` type is imported from `src/agents/runner.js` [Source 1].
-   `iteration` (`number`): The current iteration number ([LLM Call](../concepts/llm-call.md) count) within the agent's run.
-   `callbacks` (`HookEventCallbacks | undefined`): Optional callbacks for emitting hook-related events.

### Return Value

-   `Promise<LLMHookResult>`: A promise that resolves to an `LLMHookResult` object, indicating the next action for the agent loop to take.

### Related Types

The `LLMHookResult` type is defined as follows [Source 1]:

```typescript
export type LLMHookResult =
  | { action: "continue" }
```

## Examples

While `dispatchAfterLLM` is called internally by the framework, the following example shows how a developer would provide an `afterLLM` hook to an agent. The dispatcher would then be responsible for executing this logic.

This example demonstrates an `afterLLM` hook that logs the LLM's response for auditing purposes [Source 1].

```typescript
import { Agent } from 'yaaf';

// A hypothetical audit logging service
const auditLog = {
  record: async (data: any) => {
    console.log('AUDIT LOG:', data);
  }
};

const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
  hooks: {
    afterLLM: async ({ response, iteration }) => {
      // Log the raw response from the LLM
      await auditLog.record({
        type: 'LLM_RESPONSE',
        iteration: iteration,
        response: response.message.content,
      });

      // Allow the execution to continue
      return { action: 'continue' };
    },
  },
});

// When agent.run() is called and the LLM responds, the `afterLLM`
// hook above will be executed by the internal `dispatchAfterLLM` function.
```

## Sources

[Source 1]: src/hooks.ts