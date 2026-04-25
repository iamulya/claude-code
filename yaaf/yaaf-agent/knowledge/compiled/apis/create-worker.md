---
title: createWorker
summary: A factory function to create a Web Fetch API-compatible handler for deploying YAAF agents to edge runtimes.
export_name: createWorker
source_file: src/worker.ts
category: function
entity_type: api
search_terms:
 - edge function handler
 - deploy agent to cloudflare
 - vercel edge function agent
 - deno deploy yaaf
 - serverless llm agent
 - web fetch api handler
 - create http server for agent
 - worker runtime
 - edge deployment
 - how to authorize agent requests
 - CORS configuration for agent
 - streaming agent on edge
 - yaaf/worker
stub: false
compiled_at: 2026-04-24T17:00:11.237Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/worker-runtime.md
compiled_from_quality: documentation
confidence: 0.98
---

## Overview

The `createWorker` function is a factory that generates a request handler compatible with the standard Web Fetch API. This allows a YAAF agent to be deployed to various serverless and edge computing platforms [Source 1].

It is the primary mechanism for shipping agents to environments such as:
*   Cloudflare Workers
*   Vercel Edge Functions
*   Deno Deploy
*   Bun
*   Any other platform that implements the Web Fetch API [Source 1].

The returned handler exposes a set of HTTP endpoints for interacting with the agent, including endpoints for chat, [Streaming](../concepts/streaming.md), health checks, and metadata retrieval. These are the same endpoints provided by the `createServer` utility for Node.js environments [Source 1].

### Endpoints

The generated handler exposes the following HTTP endpoints [Source 1]:

| Method    | Path           | Description                               |
| :-------- | :------------- | :---------------------------------------- |
| `POST`    | `/chat`        | Standard request/response chat (JSON).    |
| `POST`    | `/chat/stream` | Server-Sent Events (SSE) streaming chat.  |
| `GET`     | `/health`      | Health check endpoint.                    |
| `GET`     | `/info`        | Returns agent metadata.                   |
| `OPTIONS` | `*`            | Handles CORS preflight requests.          |

## Signature

```typescript
import { StreamableAgent } from './agent';
import { AgentRunResponse } from './types';

export interface WorkerOptions {
  name?: string;
  cors?: boolean;
  corsOrigin?: string;
  maxBodySize?: number;
  timeout?: number;
  beforeRun?: (input: string, req: Request) => Promise<string> | string;
  afterRun?: (input: string, response: AgentRunResponse, req: Request) => Promise<void> | void;
  authorize?: (req: Request) => Promise<boolean> | boolean;
}

export function createWorker(
  agent: StreamableAgent,
  options?: WorkerOptions
): (req: Request) => Promise<Response>;
```

### Parameters

*   **`agent`**: A `StreamableAgent` instance. This is typically created by wrapping a standard `Agent` with the `toStreamableAgent` utility [Source 1].
*   **`options`** (optional): A configuration object to customize the worker's behavior [Source 1].

### Configuration Options (`WorkerOptions`)

| Option       | Type                                                                      | Default        | Description                                                              |
| :----------- | :------------------------------------------------------------------------ | :------------- | :----------------------------------------------------------------------- |
| `name`       | `string`                                                                  | `'yaaf-agent'` | The name of the agent, returned by the `/info` endpoint.                 |
| `cors`       | `boolean`                                                                 | `true`         | Enables or disables Cross-Origin Resource Sharing (CORS) headers.        |
| `corsOrigin` | `string`                                                                  | `'*'`          | Sets the `Access-Control-Allow-Origin` header value.                     |
| `maxBodySize`| `number`                                                                  | `1048576` (1MB)| The maximum allowed request body size in bytes.                          |
| `timeout`    | `number`                                                                  | `30000`        | The request timeout in milliseconds.                                     |
| `beforeRun`  | `(input: string, req: Request) => Promise<string> \| string`              | `undefined`    | A hook to modify the input string before it's passed to the agent.       |
| `afterRun`   | `(input: string, response: AgentRunResponse, req: Request) => Promise<void> \| void` | `undefined`    | A hook that runs after the agent completes, useful for logging.          |
| `authorize`  | `(req: Request) => Promise<boolean> \| boolean`                           | `undefined`    | A hook to implement request [Authorization](../concepts/authorization.md). Return `false` to deny access.|

[Source 1]

## Examples

### Basic Cloudflare Worker

This example shows a minimal setup for a Cloudflare Worker [Source 1].

```typescript
import { Agent, toStreamableAgent } from 'yaaf';
import { createWorker } from 'yaaf/worker';

const agent = new Agent({
  systemPrompt: 'You are a helpful API assistant.',
  tools: [/* ... your tools ... */],
});

// The agent must be streamable for the worker
const streamableAgent = toStreamableAgent(agent);

const handler = createWorker(streamableAgent, {
  name: 'my-edge-agent',
  cors: true,
  timeout: 25_000,  // Cloudflare's general limit is 30s
});

export default { fetch: handler };
```

### Vercel Edge Function

The same handler can be used in a Vercel Edge Function [Source 1].

```typescript
import { Agent, toStreamableAgent } from 'yaaf';
import { createWorker } from 'yaaf/worker';

const agent = new Agent({ systemPrompt: '...', tools: [/* ... */] });
const handler = createWorker(toStreamableAgent(agent));

export const config = { runtime: 'edge' };

export default async function(req: Request) {
  return handler(req);
}
```

### Deno Deploy

To use with Deno Deploy, pass the handler to `Deno.serve` [Source 1].

```typescript
import { Agent, toStreamableAgent } from 'yaaf';
import { createWorker } from 'yaaf/worker';

const agent = new Agent({ systemPrompt: '...', tools: [/* ... */] });
const handler = createWorker(toStreamableAgent(agent));

Deno.serve(handler);
```

### Custom Authorization

Implement the `authorize` hook to protect your agent's endpoints [Source 1].

```typescript
import { Agent, toStreamableAgent } from 'yaaf';
import { createWorker } from 'yaaf/worker';

const agent = toStreamableAgent(new Agent({ /* ... */ }));

const handler = createWorker(agent, {
  authorize: async (req) => {
    const apiKey = req.headers.get('x-api-key');
    return apiKey === 'my-secret-key';
  },
});

export default { fetch: handler };
```

### Full Configuration

This example demonstrates using multiple configuration options, including pre- and post-processing hooks [Source 1].

```typescript
import { Agent, toStreamableAgent } from 'yaaf';
import { createWorker } from 'yaaf/worker';

const agent = toStreamableAgent(new Agent({ /* ... */ }));

const handler = createWorker(agent, {
  name: 'edge-bot',
  cors: true,
  corsOrigin: 'https://myapp.com',
  maxBodySize: 512_000,    // 512KB (edge functions often have smaller limits)
  timeout: 25_000,         // 25s (most edge platforms cap at 30s)

  // Prepend geo-location data to the user's input
  beforeRun: async (input, req) => {
    const country = req.headers.get('cf-ipcountry') || 'unknown';
    return `[Region: ${country}] ${input}`;
  },

  // Log the interaction to an external service
  afterRun: async (input, response) => {
    // logToAnalytics({ input, response });
  },

  // Check for a secret API key
  authorize: async (req) => {
    return req.headers.get('x-api-key') === 'secret';
  },
});

export default { fetch: handler };
```

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/worker-runtime.md