---
summary: The ability for an agent to maintain context and engage in extended dialogues over multiple user interactions.
title: Multi-turn Conversation
entity_type: concept
related_subsystems:
 - runtime
see_also:
 - concept:Agent Session
 - concept:Context Window Management
 - concept:Memory
 - concept:Agent Turn
search_terms:
 - conversation history
 - how to handle multiple questions
 - maintaining context between turns
 - dialogue management
 - chat history
 - stateful agent
 - extended dialogue
 - passing history to agent
 - multi-turn context
 - YAAF server chat history
 - request body history array
stub: false
compiled_at: 2026-04-25T00:21:46.483Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/runtime/server.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

A Multi-turn Conversation is a dialogue between a user and a YAAF agent that spans multiple interactions, where the agent retains knowledge of previous exchanges to inform its current response. This capability allows an agent to understand follow-up questions, references to earlier parts of the conversation, and the overall context of the user's intent as it evolves.

Without this concept, each user request would be treated as a standalone, stateless interaction, making natural, evolving dialogues impossible. Multi-turn conversation support is fundamental for building sophisticated applications like chatbots, virtual assistants, and interactive problem-solving agents.

## How It Works in YAAF

In YAAF, multi-turn conversation is primarily a feature of the built-in HTTP server provided by the `runtime` subsystem. It is implemented as a client-managed context mechanism, where the client application is responsible for tracking the conversation history and sending it with each new request [Source 1].

The `createServer` function includes a `multiTurn` configuration option. When this option is enabled, the server's `/chat` and `/chat/stream` endpoints are configured to accept a `history` array in the JSON request body. This array contains a sequence of objects, each with a `role` (`user` or `assistant`) and `content` [Source 1].

Upon receiving a request, the YAAF server prepends the contents of the `history` array to the user's latest message. This combined text is then passed as the input to the agent for the current [Agent Turn](./agent-turn.md). By including the past dialogue in the prompt, the LLM has the necessary context to generate a relevant and coherent response.

This approach is distinct from server-side [Agent Session](./agent-session.md) management, where the server persists and manages the session state automatically. With the `multiTurn` flag, the state management responsibility lies with the client.

## Configuration

To enable multi-turn conversation support, the `multiTurn` property must be set to `true` in the `ServerConfig` object passed to `createServer`.

```typescript
// Source: src/runtime/server.ts [Source 1]
import { Agent } from 'yaaf';
import { createServer } from 'yaaf/server';

const agent = new Agent({
  systemPrompt: 'You are a helpful assistant that remembers our conversation.',
});

// Enable multi-turn conversation support on the server
const server = createServer(agent, {
  port: 3000,
  multiTurn: true,
});
```

When this is enabled, a client application would send a `POST` request to the `/chat` endpoint with a body structured like the following:

```json
{
  "message": "And what about for a family of four?",
  "history": [
    { "role": "user", "content": "What are some good vacation spots in Italy?" },
    { "role": "assistant", "content": "For a couple, I'd recommend the Amalfi Coast or Florence." }
  ]
}
```

The server will process this by effectively prepending the history to the new message before sending it to the agent.

## See Also

- [Agent Session](./agent-session.md): For server-side management of conversation state.
- [Context Window Management](./context-window-management.md): The mechanism that handles the finite context available to the LLM, which is consumed by conversation history.
- [Memory](./memory.md): The broader concept of how an agent retains information over time.
- [Agent Turn](./agent-turn.md): The fundamental unit of interaction within a conversation.

## Sources

[Source 1] Source: `src/runtime/server.ts`