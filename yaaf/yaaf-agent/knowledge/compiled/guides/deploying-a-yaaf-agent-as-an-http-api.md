---
summary: Learn how to set up, configure, and deploy a YAAF agent as a production-ready HTTP API with REST and Server-Sent Events (SSE) streaming endpoints.
title: Deploying a YAAF Agent as an HTTP API
entity_type: guide
difficulty: beginner
search_terms:
 - how to create a web server for an agent
 - expose agent as REST API
 - YAAF server runtime
 - HTTP API for LLM agent
 - streaming agent responses
 - Server-Sent Events SSE
 - createServer function
 - deploy YAAF to Docker
 - deploy YAAF to Cloud Run
 - agent API endpoints
 - production agent deployment
 - add custom routes to agent server
 - agent API health check
stub: false
compiled_at: 2026-04-25T00:26:49.424Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/server-runtime.md
compiled_from_quality: documentation
confidence: 0.9
---

## Overview

This guide walks through the process of exposing a YAAF [Agent](../apis/agent.md) as a production-ready HTTP server. By using the built-in [Server Runtime](../subsystems/server-runtime.md), a developer can quickly create an API with standard endpoints for chat, [Streaming](../concepts/streaming.md), health checks, and agent information. The guide covers initial setup, endpoint usage, advanced configuration, and common deployment patterns [Source 1].

## Prerequisites

Before starting, ensure you have a configured YAAF [Agent](../apis/agent.md) instance. This guide assumes you have a basic agent ready to be served, as shown in the [Getting Started with YAAF](./getting-started-with-yaaf.md) guide [Source 1].

## Step-by-Step

### Step 1: Create the Basic Server

The core of the YAAF [Server Runtime](../subsystems/server-runtime.md) is the [createServer](../apis/create-server.md) function. It takes an [Agent](../apis/agent.md) instance and a configuration object to launch an HTTP server [Source 1]. For streaming functionality, the agent must be wrapped with the [toStreamableAgent](../apis/to-streamable-agent.md) helper [Source 1].

Create a file, for example `server.ts`, and add the following code:

```typescript
import { Agent, toStreamableAgent } from 'yaaf';
import { createServer } from 'yaaf/server';

// Assume searchTool is an existing tool
// const searchTool = ...

const agent = new Agent({
  systemPrompt: 'You are an API assistant.',
  // tools: [searchTool],
});

const server = createServer(toStreamableAgent(agent), {
  port: 3000,
});

// The server will automatically start and log to the console:
// 🚀 yaaf-agent listening on http://0.0.0.0:3000
//    POST /chat         — Send a message
//    POST /chat/stream  — Stream response (SSE)
//    GET  /health       — Health check
//    GET  /info         — Agent info
```
[Source 1]

### Step 2: Interact with the Endpoints

Once the server is running, it exposes four default endpoints [Source 1].

#### POST /chat

This is a standard request/response JSON endpoint for interacting with the agent.

**Example Request:**
```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is quantum computing?"}'
```
[Source 1]

**Example Response:**
```json
{
  "response": "Quantum computing uses quantum bits (qubits) to perform calculations..."
}
```
[Source 1]

#### POST /chat/stream

This endpoint provides a Server-Sent Events (SSE) stream for real-time updates, including text deltas and tool usage events. This is ideal for building responsive user interfaces.

**Example Request:**
```bash
curl -X POST http://localhost:3000/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message": "Explain relativity"}'
```
[Source 1]

**Example SSE Stream Response:**
```
data: {"type":"text_delta","text":"Relativity "}
data: {"type":"text_delta","text":"is a theory "}
data: {"type":"tool_call_start","toolName":"search"}
data: {"type":"tool_call_end","toolName":"search","durationMs":230}
data: {"type":"text_delta","text":"developed by Einstein..."}
data: {"type":"done","text":"Relativity is a theory developed by Einstein..."}
```
[Source 1]

A JavaScript client can consume this stream as follows:
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
[Source 1]

#### GET /health

This endpoint provides a simple health check, useful for load balancers and monitoring systems.

**Example Request:**
```bash
curl http://localhost:3000/health
```
[Source 1]

**Example Response:**
```json
{
  "status": "ok",
  "uptime": 3600,
  "requests": 142
}
```
[Source 1]

#### GET /info

This endpoint returns metadata about the agent, including its name, version, and available endpoints.

**Example Request:**
```bash
curl http://localhost:3000/info
```
[Source 1]

**Example Response:**
```json
{
  "name": "my-api-agent",
  "version": "1.0.0",
  "endpoints": [
    { "method": "POST", "path": "/chat", "description": "Send a message" },
    { "method": "POST", "path": "/chat/stream", "description": "Stream a response (SSE)" },
    { "method": "GET", "path": "/health", "description": "Health check" },
    { "method": "GET", "path": "/info", "description": "Agent info" }
  ],
  "streaming": true
}
```
[Source 1]

### Step 3: Apply Advanced Configuration

The [createServer](../apis/create-server.md) function accepts a detailed configuration object to customize network settings, security, CORS, and behavior via hooks and custom routes [Source 1].

```typescript
const server = createServer(agent, {
  // Network settings
  port: 3000,
  host: '0.0.0.0',
  timeout: 120_000,

  // Agent identity for /info endpoint
  name: 'my-api-agent',
  version: '1.0.0',

  // CORS configuration
  cors: true,
  corsOrigin: 'https://myapp.com',

  // Security settings
  maxBodySize: 1_048_576,  // 1MB
  rateLimit: 60,           // requests per minute per IP

  // Hooks to modify behavior before and after an agent run
  beforeRun: async (input, req) => {
    // Example: Inject user context from auth headers
    const userId = req.headers['x-user-id'];
    return `[User: ${userId}] ${input}`;
  },
  afterRun: async (input, response, req) => {
    // Example: Log analytics
    // await analytics.log({ input, response, ip: req.socket.remoteAddress });
  },

  // Add custom HTTP routes to the server
  routes: {
    '/api/tools': (_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ tools: ['search', 'weather'] }));
    },
    '/api/reset': (_req, res) => {
      agent.reset();
      res.writeHead(200);
      res.end('OK');
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
[Source 1]

### Step 4: Deploy the Server

To deploy the agent API, first build the TypeScript project, then run the compiled JavaScript file. The server can be containerized with Docker or deployed to cloud platforms [Source 1].

**Production Build and Run:**
```bash
npm run build
node dist/server.js
```
[Source 1]

**Dockerfile Example:**
```dockerfile
FROM node:22-alpine
COPY dist/ ./dist/
COPY package.json ./
RUN npm install --production
EXPOSE 3000
CMD ["node", "dist/server.js"]
```
[Source 1]

**Google Cloud Run Deployment:**
```bash
gcloud run deploy my-agent --source . --port 3000
```
[Source 1]

## Configuration Reference

The following options can be passed to the [createServer](../apis/create-server.md) function [Source 1].

| Option | Type | Default | Description |
|---|---|---|---|
| `port` | `number` | `3000` | The port the server will listen on. |
| `host` | `string` | `'0.0.0.0'` | The network address to bind to. |
| `cors` | `boolean` | `true` | Toggles CORS headers on responses. |
| `corsOrigin` | `string` | `'*'` | Sets the `Access-Control-Allow-Origin` header. |
| `name` | `string` | `'yaaf-agent'` | The agent's name, returned by the `/info` endpoint. |
| `version` | `string` | `'0.1.0'` | The agent's version, returned by the `/info` endpoint. |
| `maxBodySize` | `number` | `1048576` | The maximum request body size in bytes (1MB). |
| `rateLimit` | `number` | `60` | The maximum number of requests per minute per IP address. |
| `timeout` | `number` | `120000` | The request timeout in milliseconds. |
| `beforeRun` | `(input, req) => string` | `undefined` | A hook to pre-process input before the agent runs. |
| `afterRun` | `(input, response, req) => void` | `undefined` | A hook to post-process the result after the agent runs. |
| `routes` | `Record<string, RouteHandler>` | `undefined` | A map of custom route handlers to add to the server. |
| `onStart` | `(port) => void` | `undefined` | A callback function executed when the server starts successfully. |

## Next Steps

*   To create a command-line interface for your agent, see [Building a CLI for Your YAAF Agent](./building-a-cli-for-your-yaaf-agent.md).
*   For deployments in serverless or edge environments, refer to the [Deploying YAAF Agents to Edge Runtimes](./deploying-yaaf-agents-to-edge-runtimes.md) guide.

## Sources

[Source 1] /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/server-runtime.md