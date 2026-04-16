---
title: createWorker
entity_type: api
summary: Factory function to create a Web Fetch API compatible request handler for a YAAF agent.
export_name: createWorker
source_file: src/worker.ts
category: function
stub: false
compiled_at: 2026-04-16T14:12:20.668Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/worker-runtime.md
confidence: 1
---

## Overview
`createWorker` is a factory function used to deploy YAAF agents to edge computing environments and runtimes that implement the standard Web Fetch API. It transforms an agent instance into a request handler capable of processing HTTP requests for chat, streaming, and metadata.

This function is the primary entry point for deploying agents to platforms such as Cloudflare Workers, Vercel Edge Functions, Deno Deploy, and Bun.

## Signature / Constructor

```typescript
function createWorker(
  agent: Agent | StreamableAgent,
  config?: WorkerConfig
): (request: Request) => Promise<Response>;
```

### WorkerConfig Properties

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | `'yaaf-agent'` | Identifier for the agent instance. |
| `cors` | `boolean` | `true` | Whether to enable Cross-Origin Resource Sharing. |
| `corsOrigin` | `string` | `'*'` | Specifies allowed origins for CORS. |
| `maxBodySize` | `number` | `1MB` | Maximum allowed size for the request body. |
| `timeout` | `number` | `30000` | Request timeout in milliseconds. |
| `beforeRun` | `(input: string, req: Request) => Promise<string> \| string` | — | Hook to modify input or perform logic before the agent runs. |
| `afterRun` | `(input: string, response: any, req: Request) => Promise<void> \| void` | — | Hook for post-processing or external logging. |
| `authorize` | `(req: Request) => Promise<boolean> \| boolean` | — | Function to validate requests (e.g., checking API keys or JWTs). |

## Methods & Properties
The function returns a standard Fetch API handler: `(request: Request) => Promise<Response>`. This handler automatically routes requests to the following endpoints:

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/chat` | Standard request/response processing returning JSON. |
| `POST` | `/chat/stream` | Server-Sent Events (SSE) streaming for real-time responses. |
| `GET` | `/health` | Returns the health status of the worker. |
| `GET` | `/info` | Returns agent metadata and configuration details. |
| `OPTIONS` | `*` | Handles CORS preflight requests. |

## Examples

### Cloudflare Workers
The handler can be exported as the default fetch handler for a Cloudflare Worker.

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
  timeout: 25_000, // Recommended for Cloudflare 30s limit
});

export default { fetch: handler };
```

### Vercel Edge Functions
Usage within a Vercel Edge runtime environment.

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

### Deno Deploy
Deploying an agent using `Deno.serve`.

```typescript
import { Agent, toStreamableAgent } from 'yaaf';
import { createWorker } from 'yaaf/worker';

const agent = new Agent({ systemPrompt: '...', tools: [...] });
const handler = createWorker(toStreamableAgent(agent));

Deno.serve(handler);
```

### Custom Authorization
Implementing a bearer token check using the `authorize` hook.

```typescript
const handler = createWorker(agent, {
  authorize: async (req) => {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return false;

    // Validate JWT or API key
    return await validateToken(token);
  },
});
```

### Pre-processing with beforeRun
Using request headers to augment the agent's input.

```typescript
const handler = createWorker(agent, {
  beforeRun: async (input, req) => {
    const geo = req.headers.get('cf-ipcountry');
    return `[Region: ${geo}] ${input}`;
  },
});
```