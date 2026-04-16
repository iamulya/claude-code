---
title: Deploying YAAF Agents
entity_type: guide
summary: How to containerize and deploy YAAF agents to production environments like Docker and Cloud Run.
difficulty: intermediate
stub: false
compiled_at: 2026-04-16T14:11:22.910Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/server-runtime.md
confidence: 0.88
---

## Overview
YAAF agents can be deployed as production-grade HTTP services using the built-in server runtime. This guide covers how to wrap an agent in a RESTful API, configure security and lifecycle hooks, and package the application for containerized environments like Docker and Google Cloud Run.

## Prerequisites
* A YAAF agent instance defined using the `Agent` class.
* Node.js environment (version 22+ recommended for the provided Docker configuration).
* Basic familiarity with TypeScript and containerization.

## Step-by-Step

### 1. Create the Server Entry Point
To expose an agent via HTTP, use the `createServer` function from the `yaaf/server` module. If streaming support is required, wrap the agent instance with `toStreamableAgent`.

```typescript
import { Agent, toStreamableAgent } from 'yaaf';
import { createServer } from 'yaaf/server';

const agent = new Agent({
  systemPrompt: 'You are an API assistant.',
  tools: [searchTool],
});

const server = createServer(toStreamableAgent(agent), {
  port: 3000,
});
```

### 2. Configure Production Settings
For production environments, configure CORS, rate limiting, and security headers. You can also use hooks to inject context (like User IDs) into the agent's input.

```typescript
const server = createServer(toStreamableAgent(agent), {
  port: 3000,
  host: '0.0.0.0',
  cors: true,
  corsOrigin: 'https://myapp.com',
  rateLimit: 60, // requests per minute per IP
  
  // Inject user context from auth headers
  beforeRun: async (input, req) => {
    const userId = req.headers['x-user-id'];
    return `[User: ${userId}] ${input}`;
  },
  
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

### 3. Containerize with Docker
Create a `Dockerfile` to package the agent. Ensure the application is built before copying it into the image.

```dockerfile
FROM node:22-alpine
COPY dist/ ./dist/
COPY package.json ./
RUN npm install --production
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### 4. Deploy to Cloud Run
Once containerized, the agent can be deployed to cloud providers. For Google Cloud Run, use the following command:

```bash
gcloud run deploy my-agent --source . --port 3000
```

## Configuration Reference

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

## Common Mistakes

*   **Incorrect Host Binding**: In Docker and Cloud Run environments, the server must bind to `0.0.0.0` rather than `localhost` or `127.0.0.1` to be reachable from outside the container.
*   **Missing Streaming Wrapper**: Forgetting to use `toStreamableAgent(agent)` when calling `createServer` will prevent the `/chat/stream` endpoint from functioning correctly.
*   **Ignoring SIGTERM**: Failing to handle `SIGTERM` prevents the server from closing connections gracefully, which can lead to dropped requests during deployments or scaling events.
*   **CORS Misconfiguration**: Leaving `corsOrigin` as the default `'*'` in production may pose security risks; it should be restricted to authorized domains.

## Next Steps
*   Learn how to consume the streaming API in a frontend application using the `/chat/stream` endpoint.
*   Implement custom routes for specialized agent management tasks like resetting state or retrieving tool metadata.