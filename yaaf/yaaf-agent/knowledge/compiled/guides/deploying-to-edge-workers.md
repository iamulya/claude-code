---
title: Deploying to Edge Workers
entity_type: guide
summary: How to deploy YAAF agents to Cloudflare Workers, Vercel Edge Functions, and Deno Deploy using the Worker Runtime.
difficulty: intermediate
stub: false
compiled_at: 2026-04-16T14:12:25.816Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/worker-runtime.md
confidence: 1
---

## Overview
YAAF provides a specialized Worker Runtime designed for edge computing environments. By utilizing the standard Web Fetch API, agents can be deployed to platforms like Cloudflare Workers, Vercel Edge Functions, Deno Deploy, and Bun. This guide demonstrates how to wrap a YAAF agent in a worker handler and configure it for production edge environments.

## Prerequisites
* YAAF core package installed.
* An initialized `Agent` instance.
* A target edge platform account (Cloudflare, Vercel, or Deno).

## Step-by-Step

### 1. Basic Worker Implementation
To deploy an agent, use the `createWorker` utility from the `yaaf/worker` module. It is recommended to wrap the agent with `toStreamableAgent` to support Server-Sent Events (SSE).

#### Cloudflare Workers
Cloudflare Workers require an exported `fetch` handler. Note that Cloudflare has a default execution limit of 30 seconds, so the agent timeout should be set slightly lower.

```typescript
import { Agent, toStreamableAgent } from 'yaaf';
import { createWorker } from 'yaaf/worker';

const agent = new Agent({
  systemPrompt: 'You are a helpful API assistant.',
  tools: [searchTool],
});

const handler = createWorker(toStreamableAgent(agent), {
  name: 'my-edge-agent',
  cors: true,
  timeout: 25_000,  // CF limit: 30s
});

export default { fetch: handler };
```

#### Vercel Edge Functions
Vercel requires an explicit runtime configuration and an exported default function.

```typescript
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
Deno uses the `Deno.serve` method to handle incoming requests.

```typescript
import { Agent, toStreamableAgent } from 'yaaf';
import { createWorker } from 'yaaf/worker';

const agent = new Agent({ systemPrompt: '...', tools: [...] });
const handler = createWorker(toStreamableAgent(agent));

Deno.serve(handler);
```

### 2. Implementing Authorization
You can secure your edge agent by providing an `authorize` callback in the configuration. This function receives the raw `Request` object.

```typescript
const handler = createWorker(agent, {
  authorize: async (req) => {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return false;

    // Validate JWT, API key, etc.
    return await validateToken(token);
  },
});
```

### 3. Using Hooks for Context
Edge platforms often provide metadata in headers (like geographic location). Use the `beforeRun` hook to inject this data into the agent's input.

```typescript
const handler = createWorker(agent, {
  beforeRun: async (input, req) => {
    const geo = req.headers.get('cf-ipcountry');
    return `[Region: ${geo}] ${input}`;
  },
});
```

## Endpoints
The worker handler exposes the following standard endpoints:

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/chat` | Standard JSON request/response |
| `POST` | `/chat/stream` | SSE (Server-Sent Events) streaming |
| `GET` | `/health` | Health check endpoint |
| `GET` | `/info` | Returns agent metadata |
| `OPTIONS` | `*` | Handles CORS preflight requests |

## Configuration Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | `'yaaf-agent'` | Identifier for the agent |
| `cors` | `boolean` | `true` | Whether to enable CORS headers |
| `corsOrigin` | `string` | `'*'` | Allowed origin for CORS |
| `maxBodySize` | `number` | `1MB` | Maximum allowed request body size |
| `timeout` | `number` | `30000` | Request timeout in milliseconds |
| `beforeRun` | `Function` | — | Hook to modify input before agent execution |
| `afterRun` | `Function` | — | Hook to process results after execution |
| `authorize` | `Function` | — | Async function to validate requests |

## Common Mistakes
* **Timeout Mismatch**: Setting the YAAF `timeout` higher than the platform's hard limit (e.g., setting 60s on Cloudflare Workers) will result in the platform killing the process before YAAF can return an error.
* **Body Size Limits**: Edge functions often have smaller request body limits than traditional servers. Ensure `maxBodySize` is tuned to your platform's constraints.
* **Missing `toStreamableAgent`**: If you intend to use the `/chat/stream` endpoint, you must wrap your agent with `toStreamableAgent` or the stream will not initialize correctly.

## Next Steps
* Learn how to consume the SSE stream in your frontend application.
* Explore adding custom tools to your edge-deployed agent.