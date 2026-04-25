---
title: Worker Runtime
summary: A YAAF subsystem for deploying agents to serverless edge platforms using the Web Fetch API.
primary_files:
 - src/worker.ts
entity_type: subsystem
exports:
 - createWorker
search_terms:
 - deploy agent to edge
 - Cloudflare Workers agent
 - Vercel Edge Functions agent
 - Deno Deploy agent
 - serverless LLM agent
 - Web Fetch API handler
 - yaaf edge runtime
 - how to deploy yaaf
 - agent authorization
 - CORS configuration for agent
 - streaming from edge
 - SSE from Cloudflare Worker
 - Bun agent deployment
stub: false
compiled_at: 2026-04-24T18:21:40.801Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/worker-runtime.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/worker.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Purpose

The Worker Runtime is an opt-in subsystem designed to deploy YAAF agents to serverless [Edge Platforms](../concepts/edge-platforms.md) that implement the standard Web Fetch API [Source 1, Source 2]. It provides a compatibility layer that allows a YAAF agent to be exposed as an HTTP service on platforms like Cloudflare Workers, Vercel Edge Functions, Deno Deploy, and Bun [Source 1].

## Architecture

The core of the subsystem is the `[[[[[[[[createWorker]]]]]]]]` function. This function accepts an agent instance and a configuration object, and returns a request handler function that conforms to the Fetch API signature (`(request: Request) => Response | Promise<Response>`) [Source 1].

This generated handler acts as a micro-server, routing incoming HTTP requests to predefined endpoints. The architecture is designed to be lightweight, suitable for the resource constraints of edge environments. The standard endpoints provided are identical to those from the `createServer` utility [Source 1]:

| Method | Path | Description |
|---|---|---|
| `POST` | `/chat` | Handles standard JSON request/response interactions with the agent. |
| `POST` | `/chat/stream` | Provides Server-Sent Events (SSE) for [Streaming](../concepts/streaming.md) agent responses. The response body is a `ReadableStream`, which is native to edge platforms. |
| `GET` | `/health` | A health check endpoint. |
| `GET` | `/info` | Returns metadata about the agent. |
| `OPTIONS` | `*` | Handles CORS preflight requests. |

The runtime manages the entire request lifecycle, including parsing the request body, invoking [Authorization](../concepts/authorization.md) hooks, running pre-processing logic, executing the agent, running post-processing logic, and formatting the HTTP response [Source 1].

## Key APIs

The primary public API for this subsystem is `createWorker`.

### createWorker

The `createWorker` function is the entry point for creating a Fetch API-compatible handler for a YAAF agent. It is imported from the `yaaf/worker` module [Source 1, Source 2].

```typescript
import { Agent, toStreamableAgent } from 'yaaf';
import { createWorker } from 'yaaf/worker';

const agent = new Agent({
  systemPrompt: 'You are a helpful API assistant.',
  tools: [/* ... */],
});

// The agent must be made streamable
const handler = createWorker(toStreamableAgent(agent), {
  name: 'my-edge-agent',
  cors: true,
  timeout: 25_000,
});

// This handler can now be exported for the edge platform
export default { fetch: handler };
```

The function takes a streamable agent and an optional configuration object as arguments and returns the handler function [Source 1].

## Configuration

The behavior of the worker handler is customized through a configuration object passed as the second argument to `createWorker`. This allows for setting timeouts, CORS policies, body size limits, and custom logic hooks [Source 1].

The following table details the available configuration options [Source 1]:

| Option | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | `'yaaf-agent'` | The name of the agent. |
| `cors` | `boolean` | `true` | Enables or disables CORS headers. |
| `corsOrigin` | `string` | `'*'` | Sets the `Access-Control-Allow-Origin` header. |
| `maxBodySize` | `number` | `1048576` (1MB) | The maximum allowed request body size in bytes. |
| `timeout` | `number` | `30000` | The request timeout in milliseconds. Edge platforms often have their own stricter limits (e.g., 30 seconds). |
| `beforeRun` | `(input, req) => string` | — | A hook to pre-process the input string before it's sent to the agent. |
| `afterRun` | `(input, response, req) => void` | — | A hook that runs after the agent has generated a response, useful for logging or analytics. |
| `authorize` | `(req) => boolean` | — | A hook to implement custom authorization logic. |

## Extension Points

The Worker Runtime provides several hooks via its configuration object that serve as extension points for developers to inject custom logic into the request/response lifecycle [Source 1].

### Authorization

The `authorize` hook allows for the implementation of custom authentication and authorization checks. It receives the `Request` object and should return a boolean indicating whether the request is permitted.

```typescript
const handler = createWorker(agent, {
  authorize: async (req) => {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return false;

    // Logic to validate a JWT, API key, etc.
    return await validateToken(token);
  },
});
```

### Request/Response Hooks

The `beforeRun` and `afterRun` hooks allow for observing and modifying data at the beginning and end of the agent execution process.

- **`beforeRun`**: This function receives the user input string and the `Request` object. It can modify the input before it is passed to the agent. For example, it could be used to prepend contextual information derived from request headers [Source 1].
- **`afterRun`**: This function is called after the agent completes its run. It receives the original input, the final agent response, and the `Request` object. It is suitable for tasks like logging metrics to an external analytics service [Source 1].

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/worker-runtime.md
[Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/worker.ts