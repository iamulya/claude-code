---
title: dispatchBeforeLLM
entity_type: api
summary: Dispatches the `beforeLLM` hook, allowing modification or blocking of messages before an LLM call.
export_name: dispatchBeforeLLM
source_file: src/hooks.ts
category: function
search_terms:
 - before LLM call hook
 - intercept LLM request
 - modify prompt before sending
 - block LLM call
 - PII redaction hook
 - prompt guard integration
 - agent lifecycle callbacks
 - fail-closed security hook
 - pre-processing LLM messages
 - how to use agent hooks
 - agent security
 - validate messages before LLM
 - agent execution loop
stub: false
compiled_at: 2026-04-24T17:03:06.983Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/hooks.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `dispatchBefore[[[[[[[[LLM]]]]]]]]` function is an internal part of the YAAF agent execution loop responsible for invoking the `beforeLLM` lifecycle hook [Source 1]. This hook provides a critical interception point immediately before a list of messages is sent to the Large Language Model (LLM).

Developers can use the `beforeLLM` hook to implement custom logic that can inspect, modify, or even block the [LLM Call](../concepts/llm-call.md). Common use cases include redacting personally identifiable information (PII), implementing prompt security guards, or dynamically altering messages based on application state [Source 1].

A key security feature of this dispatcher is that it "fails closed." If any registered `beforeLLM` hook throws an error, `dispatchBeforeLLM` will re-throw that error, effectively blocking the LLM call. This design prevents potentially sensitive or unscanned messages from reaching the LLM if a security-critical hook (like a PII redactor) is malfunctioning [Source 1].

## Signature

The function has the following signature [Source 1]:

```typescript
export async function dispatchBeforeLLM(
  hooks: Hooks | undefined,
  messages: ChatMessage[],
  callbacks?: HookEventCallbacks,
): Promise<ChatMessage[]>;
```

### Parameters

-   **`hooks: Hooks | undefined`**: An object containing the registered [Lifecycle Hooks](../concepts/lifecycle-hooks.md) for the agent. The `dispatchBeforeLLM` function specifically looks for and executes the `beforeLLM` method if it exists on this object.
-   **`messages: ChatMessage[]`**: The array of `ChatMessage` objects that are about to be sent to the LLM. Hooks can modify the contents of this array.
-   **`callbacks?: HookEventCallbacks`**: Optional callbacks for hook-related events.

### Returns

-   **`Promise<ChatMessage[]>`**: A promise that resolves to the final array of `ChatMessage` objects that should be sent to the LLM. This may be the original array or a version modified by the hooks.

## Examples

While `dispatchBeforeLLM` is used internally by the agent runtime, developers interact with it by defining a `beforeLLM` hook [when](./when.md) creating an `Agent`.

### Defining a `beforeLLM` Hook

This example shows how to define a hook that redacts email addresses from user messages before they are sent to the LLM.

```typescript
import { Agent, ChatMessage } from 'yaaf';

// A simple redaction function
function redactEmails(text: string): string {
  return text.replace(/\S+@\S+\.\S+/g, '[REDACTED_EMAIL]');
}

const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
  hooks: {
    beforeLLM: async (messages: ChatMessage[]) => {
      console.log('beforeLLM hook triggered. Redacting messages...');
      const redactedMessages = messages.map(msg => {
        if (msg.role === 'user' && typeof msg.content === 'string') {
          return { ...msg, content: redactEmails(msg.content) };
        }
        return msg;
      });
      // The agent runtime will receive this modified list of messages.
      return { action: 'continue', messages: redactedMessages };
    },
  },
});

// When agent.run() is called, the internal call to dispatchBeforeLLM
// will execute the hook above before contacting the LLM provider.
```

### Fail-Closed Behavior

This example demonstrates how an error in a hook will block the LLM call.

```typescript
import { Agent } from 'yaaf';

const agentWithFailingHook = new Agent({
  systemPrompt: 'You are a helpful assistant.',
  hooks: {
    beforeLLM: async (messages) => {
      console.log('This hook will fail.');
      throw new Error('PII redaction service is down!');
      // Because this throws, dispatchBeforeLLM will re-throw,
      // and the LLM call will be aborted.
    },
  },
});

async function main() {
  try {
    await agentWithFailingHook.run('What is your name?');
  } catch (e) {
    console.error(e.message); // "PII redaction service is down!"
  }
}

main();
```

## See Also

-   `dispatchAfterLLM`: The corresponding hook dispatcher for processing LLM responses.

## Sources

[Source 1] src/hooks.ts