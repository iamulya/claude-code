---
title: toStreamableAgent
entity_type: api
summary: Wraps a YAAF Agent into a StreamableAgent compatible with runtime harnesses.
export_name: toStreamableAgent
source_file: src/runtime/adapter.ts
category: function
search_terms:
 - adapt agent for CLI
 - use agent with createServer
 - connect agent to worker runtime
 - StreamableAgent interface
 - runtime harness adapter
 - convert agent stream
 - RunnerStreamEvent to RuntimeStreamEvent
 - how to stream agent responses
 - YAAF runtime compatibility
 - createCLI agent parameter
 - createServer agent parameter
 - createWorker agent parameter
 - bridge agent to runtime
stub: false
compiled_at: 2026-04-24T17:44:25.703Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/cli-runtime.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/server-runtime.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/worker-runtime.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/runtime/adapter.ts
compiled_from_quality: unknown
confidence: 0.99
---

## Overview

The `toStreamableAgent` function is an adapter that makes a standard YAAF `Agent` compatible with the various runtime harnesses provided by the framework, such as `create[[CLI]]`, `createServer`, and `createWorker` [Source 4].

Internally, a YAAF `Agent`'s `runStream` method yields a detailed stream of `RunnerStreamEvent` types, which include internal state information like `llm_request` and `iteration`. The runtime harnesses, however, are designed to consume a simplified, public-facing stream of `RuntimeStreamEvent` types, which only include events like `text_delta`, `tool_call_start`, and `tool_call_end` [Source 1, Source 4].

`toStreamableAgent` bridges this gap by wrapping the agent. The returned object, which conforms to the `StreamableAgent` interface, exposes a `runStream` method that automatically filters and maps the internal events to the simplified runtime event format. This is a required step [when](./when.md) passing a YAAF `Agent` to any of the built-in runtime environments [Source 1, Source 2, Source 3].

## Signature

The function takes a YAAF `Agent` instance and returns an object that conforms to the `StreamableAgent` interface [Source 4].

```typescript
import type { Agent } from 'yaaf';
import type { StreamableAgent } from 'yaaf';

export function toStreamableAgent(agent: Agent): StreamableAgent;
```

The returned `StreamableAgent` object has the following type definition [Source 4]:

```typescript
export type StreamableAgent = {
  run(input: string, signal?: AbortSignal): Promise<string>;
  runStream(input: string, signal?: AbortSignal): AsyncIterable<RuntimeStreamEvent>;
};
```

- **`run(input, signal?)`**: A pass-through to the original agent's `run` method, which executes the agent and returns the final string response [Source 1].
- **`runStream(input, signal?)`**: Returns an async iterable that yields simplified `RuntimeStreamEvent` objects, suitable for consumption by a runtime harness [Source 1, Source 4].

## Examples

`toStreamableAgent` is used to prepare an `Agent` for any of the standard YAAF runtimes.

### With the [CLI Runtime](../subsystems/cli-runtime.md)

This example shows how to adapt an agent to be used with `createCLI` to build a command-line interface [Source 1].

```typescript
import { Agent, toStreamableAgent } from 'yaaf';
import { createCLI } from 'yaaf/[[CLI]]-runtime';

const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
  // ... tools, provider, etc.
});

// Adapt the agent for the CLI runtime
const streamableAgent = toStreamableAgent(agent);

createCLI(streamableAgent, {
  name: 'my-assistant',
  greeting: '👋 Hello! How can I help?',
  streaming: true,
});
```

### With the [Server Runtime](../subsystems/server-runtime.md)

This example adapts an agent to be served via HTTP using `createServer` [Source 2].

```typescript
import { Agent, toStreamableAgent } from 'yaaf';
import { createServer } from 'yaaf/server';

const agent = new Agent({
  systemPrompt: 'You are an API assistant.',
  // ... tools, provider, etc.
});

// Adapt the agent for the server runtime
const streamableAgent = toStreamableAgent(agent);

const server = createServer(streamableAgent, {
  port: 3000,
});
```

### With the [Worker Runtime](../subsystems/worker-runtime.md)

This example adapts an agent for deployment to an edge environment like Cloudflare Workers using `createWorker` [Source 3].

```typescript
import { Agent, toStreamableAgent } from 'yaaf';
import { createWorker } from 'yaaf/worker';

const agent = new Agent({
  systemPrompt: 'You are a helpful API assistant.',
  // ... tools, provider, etc.
});

// Adapt the agent for the worker runtime
const streamableAgent = toStreamableAgent(agent);

const handler = createWorker(streamableAgent, {
  name: 'my-edge-agent',
});

export default { fetch: handler };
```

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/[CLI](../subsystems/cli.md)-runtime.md
[Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/server-runtime.md
[Source 3]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/worker-runtime.md
[Source 4]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/runtime/adapter.ts