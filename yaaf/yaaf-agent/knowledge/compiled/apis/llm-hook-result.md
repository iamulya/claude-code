---
title: LLMHookResult
entity_type: api
summary: Defines the possible return actions for LLM-specific agent lifecycle hook functions.
export_name: LLMHookResult
source_file: src/hooks.ts
category: type
search_terms:
 - afterLLM hook return value
 - agent hook actions
 - control agent after LLM call
 - continue agent execution
 - LLM hook return type
 - agent lifecycle control
 - what to return from afterLLM
 - modify LLM response flow
 - hook result types
 - agent execution loop control
stub: false
compiled_at: 2026-04-24T17:18:20.537Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/hooks.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

`[[[[[[[[LLM]]]]]]]]HookResult` is a TypeScript union type that defines the set of possible actions an `afterLLM` hook can return to control the agent's execution flow [Source 1]. After an [LLM Call](../concepts/llm-call.md) completes and generates a response, the `afterLLM` hook is invoked. The `LLMHookResult` object returned by this hook dictates whether the agent should proceed with processing the LLM's response or take another action.

Based on the provided source material, the only available action is `'continue'`, which instructs the agent to proceed with its normal execution loop [Source 1].

This type is used as the return value for the `afterLLM` hook and the `dispatchAfterLLM` internal function [Source 1].

## Signature

The type is defined as an object with a single `action` property.

```typescript
export type LLMHookResult =
  | { action: "continue" };
```
[Source 1]

## Examples

The following example shows the structure of an `afterLLM` hook that logs the LLM's response and then returns an `LLMHookResult` to allow the agent to continue its operation.

```typescript
import type { Agent, Hooks, LLMHookResult, ChatResult } from 'yaaf';

const agentHooks: Hooks = {
  afterLLM: async (response: ChatResult, iteration: number): Promise<LLMHookResult> => {
    // This hook could be used for logging, monitoring, or output validation.
    console.log(`[Iteration ${iteration}] Received LLM response:`, response.message.content);

    // Instruct the agent to continue its execution loop with the received response.
    return { action: 'continue' };
  },
};

// This `agentHooks` object would then be provided to the Agent constructor.
// const agent = new Agent({
//   ...,
//   hooks: agentHooks,
// });
```

## Sources

[Source 1]: src/hooks.ts