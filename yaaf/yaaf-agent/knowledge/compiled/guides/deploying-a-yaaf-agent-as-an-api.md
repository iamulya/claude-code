---
title: Deploying a YAAF Agent as an API
entity_type: guide
summary: Learn how to package and deploy your YAAF agent as a standalone HTTP API with REST and Server-Sent Events (SSE) endpoints using the Server Runtime.
difficulty: beginner
search_terms:
 - YAAF server runtime
 - expose agent as API
 - create HTTP endpoint for agent
 - REST API for LLM agent
 - SSE streaming for agents
 - how to deploy YAAF
 - yaaf/server
 - createServer function
 - agent to API
 - production agent deployment
 - Dockerize YAAF agent
 - Cloud Run YAAF
 - agent HTTP server
 - agent as a service
stub: false
compiled_at: 2026-04-24T18:06:44.974Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/server-runtime.md
compiled_from_quality: documentation
confidence: 0.95
---

## Overview

This guide walks through the process of exposing a YAAF agent as a standalone HTTP service using the built-in [Server Runtime](../subsystems/server-runtime.md) [Source 1]. By following these steps, you will create a server that provides RESTful JSON endpoints for request/response interactions and Server-Sent Events (SSE) endpoints for real-time [Streaming](../concepts/streaming.md). The server also includes standard endpoints for health checks and agent information [Source 1].

## Prerequisites

Before starting, you should have:
1.  A working Node.js and TypeScript environment.
2.  The `yaaf` package installed.
3.  An instantiated YAAF `Agent` object ready to be served.

## Step-by-Step

### Step 1: Import Modules and Instantiate Agent

First, import the necessary components from the `yaaf` and `yaaf/server` packages. You will need your `Agent` instance and the `createServer` function. The agent must be wrapped with `toStreamableAgent` to be compatible with the server runtime [Source 1].

```typescript
import { Agent, toStreamableAgent } from 'yaaf';
import { createServer } from 'yaaf/server';

// Assume searchTool is a pre-defined tool
const agent = new Agent({
  systemPrompt: 'You are an API assistant.',
  [[[[[[[[Tools]]]]]]]]: [searchTool],
});
```

### Step 2: Create and Start the Server

Use the `createServer` function, passing your streamable agent and a configuration object. At a minimum, specify the `port` [Source 1].

```typescript
const server = createServer(toStreamableAgent(agent), {
  port: 3000,
});
```

[when](../apis/when.md) this code is run, the server will start and log its status to the console [Source 1]:
```
🚀 yaaf-agent listening on http://0.0.0.0:3000
   POST /chat         — Send a message
   POST /chat/stream  — Stream response (SSE)
   GET  /health       — Health check
   GET  /info         — Agent info
```

### Step 3: Interact with the Endpoints

The server automatically creates several endpoints for interacting with the agent and monitoring the service [Source 1].

#### POST /chat (Request/Response)

This endpoint accepts a JSON payload and returns a complete JSON response after the agent finishes processing.

**Example Request:**
```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is quantum computing?"}'
```

**Example Response:**
```json
{
  "response": "Quantum computing uses quantum bits (qubits) to perform calculations..."
}
```

#### POST /chat/stream (SSE Streaming)

This endpoint streams the agent's output as Server-Sent Events, allowing for real-time updates as tokens are generated and Tools are called.

**Example Request:**
```bash
curl -X POST http://localhost:3000/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message": "Explain relativity"}'
```

**Example SSE Stream Response:**
```
data: {"type":"text_delta","text":"Relativity "}
data: {"type":"text_delta","text":"is a theory "}
data: {"type":"tool_call_start","toolName":"search"}
data: {"type":"tool_call_end","toolName":"search","durationMs":230}
data: {"type":"text_delta","text":"developed by Einstein..."}
data: {"type":"done","text":"Relativity is a theory developed by Einstein..."}
```

A JavaScript client can consume this stream using the Fetch API [Source 1]:
```javascript
const response = await fetch('http://localhost:3000/chat/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Hello' }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const lines = decoder.decode(value).split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const event = JSON.parse(line.slice(6));
      if (event.type === 'text_delta') {
        process.stdout.write(event.text);
      }
    }
  }
}
```

#### GET /health and GET /info

The server includes built-in endpoints for monitoring.

*   **`GET /health`**: Returns the server's status, uptime, and request count.
*   **`GET /info`**: Returns metadata about the agent, such as its name, version, and available endpoints.

### Step 4: Apply Advanced Configuration (Optional)

The `createServer` function accepts a detailed configuration object to customize network settings, security, CORS, and behavior with hooks and custom routes [Source 1].

```typescript
const server = createServer(agent, {
  // Network and Identity
  port: 3000,
  host: '0.0.0.0',
  name: 'my-api-agent',
  version: '1.0.0',

  // Security and CORS
  cors: true,
  corsOrigin: 'https://myapp.com',
  maxBodySize: 1_048_576,  // 1MB
  rateLimit: 60,           // requests per minute per IP

  // Hooks for pre/post processing
  beforeRun: async (input, req) => {
    const userId = req.headers['x-user-id'];
    return `[User: ${userId}] ${input}`;
  },
  afterRun: async (input, response, req) => {
    await analytics.log({ input, response, ip: req.socket.remoteAddress });
  },

  // Custom API routes
  routes: {
    '/api/tools': (_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ tools: ['search', 'weather'] }));
    },
  },

  // Lifecycle callback
  onStart: (port) => {
    console.log(`Server ready on port ${port}`);
  },
});

// Implement graceful shutdown
process.on('SIGTERM', async () => {
  await server.close();
  process.exit(0);
});
```

### Step 5: Deploy to Production

Once your server script is complete, you can deploy it using standard Node.js practices.

**Build and Run Locally:**
```bash
npm run build
node dist/server.js
```

**Deploy with Docker:**
Create a `Dockerfile` to containerize your application [Source 1].
```dockerfile
FROM node:22-alpine
COPY dist/ ./dist/
COPY package.json ./
RUN npm install --production
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

**Deploy to a Cloud Provider (e.g., Google Cloud Run):**
Use the provider's [CLI](../subsystems/cli.md) to deploy from source [Source 1].
```bash
gcloud run deploy my-agent --source . --port 3000
```

## Configuration Reference

The following options can be passed to the `createServer` function [Source 1].

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `port` | `number` | `3000` | Listen port |
| `host` | `string` | `'0.0.0.0'` | Bind address |
| `cors` | `boolean` | `true` | Enable CORS headers |
| `corsOrigin` | `string` | `'*'` | Allowed origin |
| `name` | `string` | `'yaaf-agent'` | Agent name (shown in /info) |
| `version` | `string` | `'0.1.0'` | Agent version |
| `maxBodySize` | `number` | `1MB` | Max request body bytes |
| `rateLimit` | `number` | `60` | Max requests/min/IP |
| `timeout` | `number` | `120000` | Request timeout (ms) |
| `beforeRun` | `(input, req) => string` | — | Pre-processing hook |
| `afterRun` | `(input, response, req) => void` | — | Post-processing hook |
| `routes` | `Record<string, RouteHandler>` | — | Custom route handlers |
| `onStart` | `(port) => void` | — | Startup callback |

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/server-runtime.md