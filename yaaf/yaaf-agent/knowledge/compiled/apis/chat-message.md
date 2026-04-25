---
summary: Represents a single message in a chat conversation, with a role and content, used for interactions with an LLM.
title: ChatMessage
entity_type: api
export_name: ChatMessage
source_file: src/agents/runner.ts
category: type
search_terms:
 - conversation message format
 - LLM message structure
 - user message
 - assistant response
 - system prompt message
 - tool call message
 - chat history format
 - message role and content
 - agent conversation turn
 - what is a chat message
 - tool use message format
 - conversation history
 - message object
stub: false
compiled_at: 2026-04-25T00:05:41.804Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/structuredOutput.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/hooks.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/router.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/groundingValidator.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `ChatMessage` type is the fundamental data structure for representing a single turn in a conversation between a user, an agent, and its tools. An ordered array of `ChatMessage` objects, often called `messages`, constitutes the complete conversation history that is passed to the Large Language Model (LLM) on each turn.

This type is used extensively throughout the YAAF framework, appearing in hooks, model routers, and agent runners. Each message has a `role` indicating its origin (e.g., `user`, `assistant`, `tool`) and `content` containing the message text. For tool-using agents, `ChatMessage` also includes properties to represent tool call requests from the model and the corresponding tool results.

## Signature

While the exact definition resides in `src/agents/runner.ts`, a `ChatMessage` object conforms to the following structure, which is standard across most LLM providers.

```typescript
export type ChatMessage = {
  /**
   * The role of the message author.
   * - `system`: Instructions for the model's behavior.
   * - `user`: Input from the end-user.
   * - `assistant`: A response from the model, which may include tool calls.
   * - `tool`: The result of a tool execution.
   */
  role: 'system' | 'user' | 'assistant' | 'tool';

  /**
   * The text content of the message.
   */
  content: string;

  /**
   * For 'assistant' messages, a list of tool calls requested by the model.
   * This property is present only when the model decides to use one or more tools.
   * @optional
   */
  tool_calls?: ToolCall[];

  /**
   * For 'tool' messages, this is the ID of the tool call this message is a result for.
   * It correlates this tool's output with the assistant's request.
   * @optional
   */
  tool_call_id?: string;
};

/**
 * Represents a single tool call requested by the assistant.
 */
export type ToolCall = {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // A JSON string of the arguments
  };
};
```

## Properties

- **`role`**: (`'system' | 'user' | 'assistant' | 'tool'`) - A required string that identifies the source of the message. This is critical for the LLM to understand the conversational context.
- **`content`**: (`string`) - The textual content of the message. For a `tool` role, this is typically the JSON-serialized output of the tool.
- **`tool_calls`**: (`ToolCall[]`, optional) - An array of tool call objects. This property only appears on messages with the `assistant` role when the LLM requests to execute one or more tools.
- **`tool_call_id`**: (`string`, optional) - A unique identifier that links a `tool` message back to a specific `tool_calls` request from an `assistant` message.

## Examples

### Basic Conversation

A simple conversation history between a user and an assistant.

```typescript
import type { ChatMessage } from 'yaaf';

const conversation: ChatMessage[] = [
  {
    role: 'user',
    content: 'What is the capital of France?',
  },
  {
    role: 'assistant',
    content: 'The capital of France is Paris.',
  },
];
```

### Conversation with a Tool Call

A more complex example where the agent uses a tool to answer a question.

```typescript
import type { ChatMessage } from 'yaaf';

const conversationWithTool: ChatMessage[] = [
  // 1. User asks a question that requires a tool
  {
    role: 'user',
    content: "What's the weather like in San Francisco?",
  },
  // 2. The assistant responds with a request to call a tool
  {
    role: 'assistant',
    content: '', // Content can be empty when tool_calls is present
    tool_calls: [
      {
        id: 'call_12345',
        type: 'function',
        function: {
          name: 'get_weather',
          arguments: '{"city": "San Francisco"}',
        },
      },
    ],
  },
  // 3. The framework executes the tool and adds the result to the history
  {
    role: 'tool',
    tool_call_id: 'call_12345',
    content: '{"temperature": "65F", "conditions": "foggy"}',
  },
  // 4. The final history is sent back to the LLM, which generates a user-facing response
  // The next message from the assistant would be:
  // {
  //   role: 'assistant',
  //   content: 'The weather in San Francisco is currently 65°F and foggy.'
  // }
];
```

## See Also

- [HookContext](./hook-context.md): Provides the `messages` history to lifecycle hooks.
- [RouterContext](./router-context.md): Used by the `RouterChatModel` to decide which LLM to use based on the conversation history.
- [dispatchBeforeLLM](./dispatch-before-llm.md): A hook dispatcher that can modify the `ChatMessage` array before it's sent to the LLM.
- [ChatModel](./chat-model.md): The interface for LLM providers, which takes an array of `ChatMessage` as input.
- [AgentRunner](./agent-runner.md): The core class that manages the conversation loop using `ChatMessage` objects.

## Sources
[Source 1] Source: src/agents/structuredOutput.ts
[Source 2] Source: src/hooks.ts
[Source 3] Source: src/models/router.ts
[Source 4] Source: src/security/groundingValidator.ts