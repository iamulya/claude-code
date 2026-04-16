# Server Runtime

Ship your YAAF agent as an HTTP API with REST and SSE streaming endpoints.

## Quick Start

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

// 🚀 yaaf-agent listening on http://0.0.0.0:3000
//    POST /chat         — Send a message
//    POST /chat/stream  — Stream response (SSE)
//    GET  /health       — Health check
//    GET  /info         — Agent info
```

## Endpoints

### POST /chat

Request/response JSON endpoint.

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is quantum computing?"}'
```

Response:

```json
{
  "response": "Quantum computing uses quantum bits (qubits) to perform calculations..."
}
```

### POST /chat/stream

Server-Sent Events (SSE) streaming endpoint.

```bash
curl -X POST http://localhost:3000/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message": "Explain relativity"}'
```

Response (SSE stream):

```
data: {"type":"text_delta","text":"Relativity "}
data: {"type":"text_delta","text":"is a theory "}
data: {"type":"tool_call_start","toolName":"search"}
data: {"type":"tool_call_end","toolName":"search","durationMs":230}
data: {"type":"text_delta","text":"developed by Einstein..."}
data: {"type":"done","text":"Relativity is a theory developed by Einstein..."}
```

**JavaScript client:**

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

### GET /health

```bash
curl http://localhost:3000/health
```

```json
{
  "status": "ok",
  "uptime": 3600,
  "requests": 142
}
```

### GET /info

```bash
curl http://localhost:3000/info
```

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

## Full Configuration

```typescript
const server = createServer(agent, {
  // ── Network ───────────────────────────────────────
  port: 3000,
  host: '0.0.0.0',
  timeout: 120_000,

  // ── Identity ──────────────────────────────────────
  name: 'my-api-agent',
  version: '1.0.0',

  // ── CORS ──────────────────────────────────────────
  cors: true,
  corsOrigin: 'https://myapp.com',

  // ── Security ──────────────────────────────────────
  maxBodySize: 1_048_576,  // 1MB
  rateLimit: 60,           // requests per minute per IP

  // ── Hooks ─────────────────────────────────────────
  beforeRun: async (input, req) => {
    // Inject user context from auth headers
    const userId = req.headers['x-user-id'];
    return `[User: ${userId}] ${input}`;
  },
  afterRun: async (input, response, req) => {
    await analytics.log({ input, response, ip: req.socket.remoteAddress });
  },

  // ── Custom Routes ─────────────────────────────────
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

  // ── Lifecycle ─────────────────────────────────────
  onStart: (port) => {
    console.log(`Server ready on port ${port}`);
  },
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await server.close();
  process.exit(0);
});
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

## Deployment

```bash
# Production
npm run build
node dist/server.js

# Docker
FROM node:22-alpine
COPY dist/ ./dist/
COPY package.json ./
RUN npm install --production
EXPOSE 3000
CMD ["node", "dist/server.js"]

# Cloud Run
gcloud run deploy my-agent --source . --port 3000
```
