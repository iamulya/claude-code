# Worker Runtime

Ship your YAAF agent to edge platforms using the standard Web Fetch API.

Supports:
- **Cloudflare Workers**
- **Vercel Edge Functions**
- **Deno Deploy**
- **Bun**
- Any platform implementing the Web Fetch API

## Cloudflare Workers

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

## Vercel Edge Functions

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

## Deno Deploy

```typescript
import { Agent, toStreamableAgent } from 'yaaf';
import { createWorker } from 'yaaf/worker';

const agent = new Agent({ systemPrompt: '...', tools: [...] });
const handler = createWorker(toStreamableAgent(agent));

Deno.serve(handler);
```

## Endpoints

The worker handler provides the same endpoints as `createServer`:

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/chat` | Request/response (JSON) |
| `POST` | `/chat/stream` | SSE streaming |
| `GET` | `/health` | Health check |
| `GET` | `/info` | Agent metadata |
| `OPTIONS` | `*` | CORS preflight |

## Authorization

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

## Full Configuration

```typescript
const handler = createWorker(agent, {
  name: 'edge-bot',
  cors: true,
  corsOrigin: 'https://myapp.com',
  maxBodySize: 512_000,    // 512KB (edge functions have smaller limits)
  timeout: 25_000,         // 25s (most edge platforms cap at 30s)

  beforeRun: async (input, req) => {
    const geo = req.headers.get('cf-ipcountry');
    return `[Region: ${geo}] ${input}`;
  },

  afterRun: async (input, response) => {
    // Log to external analytics
  },

  authorize: async (req) => {
    return req.headers.get('x-api-key') === 'secret';
  },
});
```

## Configuration Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | `'yaaf-agent'` | Agent name |
| `cors` | `boolean` | `true` | Enable CORS |
| `corsOrigin` | `string` | `'*'` | Allowed origin |
| `maxBodySize` | `number` | `1MB` | Max request body |
| `timeout` | `number` | `30000` | Request timeout (ms) |
| `beforeRun` | `(input, req) => string` | — | Pre-processing hook |
| `afterRun` | `(input, response, req) => void` | — | Post-processing hook |
| `authorize` | `(req) => boolean` | — | Auth check |

## SSE Streaming from Edge

The `/chat/stream` endpoint returns a `ReadableStream` — native on all edge platforms:

```typescript
// Client-side consumption
const res = await fetch('https://my-worker.dev/chat/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Hello' }),
});

const reader = res.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const text = decoder.decode(value);
  for (const line of text.split('\n')) {
    if (line.startsWith('data: ')) {
      const event = JSON.parse(line.slice(6));
      console.log(event);
    }
  }
}
```
