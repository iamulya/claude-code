---
title: Deploying YAAF Agents to Edge Runtimes
summary: A step-by-step guide to deploying YAAF agents to platforms like Cloudflare Workers, Vercel Edge Functions, Deno Deploy, and Bun.
entity_type: guide
difficulty: intermediate
search_terms:
 - edge function deployment
 - serverless agent hosting
 - Cloudflare Workers agent
 - Vercel Edge Functions LLM
 - Deno Deploy YAAF
 - Bun serverless
 - Web Fetch API handler
 - how to deploy YAAF
 - yaaf worker runtime
 - createWorker function
 - serverless streaming LLM
 - edge agent authorization
 - CORS on edge functions
 - deploy agent to vercel
 - deploy agent to cloudflare
stub: false
compiled_at: 2026-04-24T18:07:00.489Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/worker-runtime.md
compiled_from_quality: documentation
confidence: 0.98
---

## Overview

This guide provides instructions for deploying a YAAF agent to various edge computing platforms. By using the `createWorker` helper function, an agent can be exposed as a standard Web Fetch API handler, making it compatible with numerous serverless environments [Source 1].

The supported platforms include:
- Cloudflare Workers
- Vercel Edge Functions
- Deno Deploy
- Bun
- Any other platform that implements the Web Fetch API [Source 1].

The resulting deployment exposes several endpoints for interacting with the agent, including JSON request/response, Server-Sent Events (SSE) [Streaming](../concepts/streaming.md), and health checks [Source 1].

## Prerequisites

Before starting, you should have a YAAF `Agent` instance initialized with a [System Prompt](../concepts/system-prompt.md) and any necessary [Tools](../subsystems/tools.md). This guide assumes you have a basic agent object ready to be deployed.

Example agent setup:
```typescript
import { Agent } from 'yaaf';

// Assume searchTool is defined elsewhere
const agent = new Agent({
  systemPrompt: 'You are a helpful API assistant.',
  tools: [searchTool],
});
```

## Step-by-Step

### Step 1: Create the Worker Handler

The core of the deployment is the `createWorker` function from the `yaaf/worker` module. This function takes a streamable agent and an optional configuration object and returns a request handler compatible with the Fetch API [Source 1].

The `toStreamableAgent` function is used to wrap the base `Agent` instance to enable streaming capabilities [Source 1].

```typescript
import { Agent, toStreamableAgent } from 'yaaf';
import { createWorker } from 'yaaf/worker';

// 1. Initialize your agent
const agent = new Agent({
  systemPrompt: 'You are a helpful API assistant.',
  tools: [/* your tools */],
});

// 2. Create the worker handler
const handler = createWorker(toStreamableAgent(agent), {
  name: 'my-edge-agent',
  cors: true,
  timeout: 25_000, // Set timeout based on platform limits
});
```

### Step 2: Deploy to a Platform

The created `handler` can be exported or served according to the specific requirements of your chosen edge platform.

#### Cloudflare Workers

For Cloudflare Workers, export the handler as the default `fetch` property [Source 1].

```typescript
// src/index.ts
import { Agent, toStreamableAgent } from 'yaaf';
import { createWorker } from 'yaaf/worker';

const agent = new Agent({
  systemPrompt: 'You are a helpful API assistant.',
  tools: [/* your tools */],
});

const handler = createWorker(toStreamableAgent(agent), {
  name: 'my-edge-agent',
  cors: true,
  timeout: 25_000,  // Cloudflare's general limit is 30s
});

export default { fetch: handler };
```

#### Vercel Edge Functions

For Vercel, export a default function that calls the handler and include the `runtime: 'edge'` configuration [Source 1].

```typescript
// api/agent.ts
import { Agent, toStreamableAgent } from 'yaaf';
import { createWorker } from 'yaaf/worker';

const agent = new Agent({ systemPrompt: '...', tools: [...] });
const handler = createWorker(toStreamableAgent(agent));

export const config = { runtime: 'edge' };

export default async function(req: Request) {
  return handler(req);
}
```

#### Deno Deploy

For Deno Deploy, use `Deno.serve` to start the server with the handler [Source 1].

```typescript
// main.ts
import { Agent, toStreamableAgent } from 'yaaf';
import { createWorker } from 'yaaf/worker';

const agent = new Agent({ systemPrompt: '...', tools: [...] });
const handler = createWorker(toStreamableAgent(agent));

Deno.serve(handler);
```

### Step 3: Add [Authorization](../concepts/authorization.md)

You can protect your agent's endpoints by providing an `authorize` function in the configuration. This function receives the `Request` object and should return a boolean or a promise resolving to a boolean indicating if the request is permitted [Source 1].

```typescript
const handler = createWorker(agent, {
  authorize: async (req) => {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return false;
    }

    // Your logic to validate a JWT, API key, etc.
    return await validateToken(token);
  },
});
```

### Step 4: Understand the API Endpoints

The `createWorker` handler automatically creates several HTTP endpoints to interact with the agent [Source 1].

| Method  | Path           | Description                               |
|---------|----------------|-------------------------------------------|
| `POST`  | `/chat`        | Standard JSON request/response endpoint.  |
| `POST`  | `/chat/stream` | Server-Sent Events (SSE) streaming endpoint. |
| `GET`   | `/health`      | Health check endpoint.                    |
| `GET`   | `/info`        | Returns agent metadata.                   |
| `OPTIONS`| `*`            | Handles CORS preflight requests.          |

### Step 5: Consume the Streaming Endpoint

The `/chat/stream` endpoint returns a `ReadableStream`, which is natively supported on [Edge Platforms](../concepts/edge-platforms.md). The following is an example of how to consume this stream on the client side [Source 1].

```typescript
// Client-side JavaScript
async function streamAgentResponse() {
  const res = await fetch('https://my-worker.dev/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Hello, agent!' }),
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value);
    // SSE events are newline-separated
    for (const line of text.split('\n')) {
      if (line.startsWith('data: ')) {
        const eventData = JSON.parse(line.slice(6));
        console.log('Received event:', eventData);
      }
    }
  }
}

streamAgentResponse();
```

## Configuration Reference

The `createWorker` function accepts an optional second argument for configuration [Source 1].

*   **`name`**:
    *   **Type**: `string`
    *   **Default**: `'yaaf-agent'`
    *   **Description**: The name of the agent, often used in logging or metadata.

*   **`cors`**:
    *   **Type**: `boolean`
    *   **Default**: `true`
    *   **Description**: Enables or disables Cross-Origin Resource Sharing (CORS) headers.

*   **`corsOrigin`**:
    *   **Type**: `string`
    *   **Default**: `'*'`
    *   **Description**: Sets the `Access-Control-Allow-Origin` header value.

*   **`maxBodySize`**:
    *   **Type**: `number`
    *   **Default**: `1048576` (1MB)
    *   **Description**: The maximum allowed size of the request body in bytes. Edge platforms often have smaller limits than traditional servers.

*   **`timeout`**:
    *   **Type**: `number`
    *   **Default**: `30000` (30s)
    *   **Description**: Request timeout in milliseconds. This should be set below the execution limit of the target edge platform.

*   **`beforeRun`**:
    *   **Type**: `(input: string, req: Request) => string | Promise<string>`
    *   **Default**: `undefined`
    *   **Description**: A hook that runs before the agent processes the input. It can be used to modify the input string, for example, by adding context from request headers.

*   **`afterRun`**:
    *   **Type**: `(input: string, response: any, req: Request) => void | Promise<void>`
    *   **Default**: `undefined`
    *   **Description**: A hook that runs after the agent has generated a response. Useful for logging or analytics.

*   **`authorize`**:
    *   **Type**: `(req: Request) => boolean | Promise<boolean>`
    *   **Default**: `undefined`
    *   **Description**: A function to authorize incoming requests. If it returns `false`, the request is rejected with a `401 Unauthorized` status.

A full configuration example:
```typescript
const handler = createWorker(agent, {
  name: 'edge-bot',
  cors: true,
  corsOrigin: 'https://myapp.com',
  maxBodySize: 512_000,    // 512KB
  timeout: 25_000,         // 25s

  beforeRun: async (input, req) => {
    const country = req.headers.get('cf-ipcountry');
    return `[Region: ${country}] ${input}`;
  },

  afterRun: async (input, response) => {
    // Log to an external analytics service
  },

  authorize: async (req) => {
    return req.headers.get('x-api-key') === 'secret-key';
  },
});
```

## Sources
[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/worker-runtime.md