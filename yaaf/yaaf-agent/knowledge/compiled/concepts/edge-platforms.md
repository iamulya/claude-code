---
summary: Serverless environments like Cloudflare Workers, Vercel Edge Functions, Deno Deploy, and Bun that support the Web Fetch API, enabling deployment of YAAF agents.
title: Edge Platforms
entity_type: concept
related_subsystems:
 - "[Worker Runtime](../subsystems/worker-runtime.md)"
see_also:
 - "[createWorker](../apis/create-worker.md)"
search_terms:
 - serverless agent deployment
 - deploy YAAF to Cloudflare
 - Vercel Edge Functions agent
 - Deno Deploy LLM agent
 - Bun serverless
 - Web Fetch API runtime
 - edge computing for LLMs
 - low latency agent hosting
 - resource constrained environments
 - yaaf/worker module
 - how to deploy agent to edge
stub: false
compiled_at: 2026-04-25T00:18:53.474Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/worker-runtime.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/worker.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

Edge Platforms are serverless deployment environments for YAAF agents, typically characterized by resource constraints and proximity to end-users or data sources [Source 1]. YAAF supports any platform that implements the standard Web Fetch API, allowing agents to run in environments with low latency and reduced operational overhead [Source 1].

Supported platforms include [Source 1]:
*   Cloudflare Workers
*   Vercel Edge Functions
*   Deno Deploy
*   Bun

The core principle is to provide a lightweight, portable runtime that can execute in these restricted environments, which often have limitations on CPU time, memory, and request duration [Source 1].

## How It Works in YAAF

YAAF enables deployment to Edge Platforms through its [Worker Runtime](../subsystems/worker-runtime.md) subsystem [Source 1]. The primary entry point for this functionality is the `[[createWorker]]` function, available via the `yaaf/worker` module [Source 1, Source 2].

The `[[createWorker]]` function takes a YAAF agent instance and returns a request handler that conforms to the Web Fetch API standard. This handler exposes several endpoints for interacting with the agent [Source 1]:

| Method | Path           | Description              |
|--------|----------------|--------------------------|
| `POST` | `/chat`        | Standard JSON request/response |
| `POST` | `/chat/stream` | Server-Sent Events (SSE) streaming |
| `GET`  | `/health`      | Health check             |
| `GET`  | `/info`        | Agent metadata           |

Streaming responses from the `/chat/stream` endpoint use the native `ReadableStream` object, which is highly efficient and supported by all major edge platforms [Source 1].

## Configuration

Configuration for edge deployments is handled through the options object passed to `[[createWorker]]`. Developers must often adjust default settings to comply with the specific limits of their chosen platform [Source 1]. For example, most edge runtimes have a request timeout of around 30 seconds, and may have smaller request body size limits than traditional server environments [Source 1].

The following example demonstrates a full configuration for a Cloudflare Worker, highlighting common adjustments for an edge environment [Source 1]:

```typescript
import { Agent, toStreamableAgent } from 'yaaf';
import { createWorker } from 'yaaf/worker';

const agent = new Agent({
  systemPrompt: 'You are a helpful API assistant.',
  // ... tools, etc.
});

const handler = createWorker(toStreamableAgent(agent), {
  name: 'edge-bot',
  cors: true,
  corsOrigin: 'https://myapp.com',
  maxBodySize: 512_000,    // 512KB (edge functions have smaller limits)
  timeout: 25_000,         // 25s (most edge platforms cap at 30s)

  authorize: async (req) => {
    return req.headers.get('x-api-key') === 'secret';
  },
});

export default { fetch: handler };
```

## See Also

*   [Worker Runtime](../subsystems/worker-runtime.md)
*   [createWorker](../apis/create-worker.md)

## Sources

*   [Source 1] `/Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/worker-runtime.md`
*   [Source 2] `/Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/worker.ts`