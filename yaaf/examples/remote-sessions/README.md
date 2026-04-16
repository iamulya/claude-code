# Remote Sessions

WebSocket-based agent server with persistent, bidirectional sessions.

## Run

```bash
# All-in-one demo (server + client in one process)
GEMINI_API_KEY=... npm start

# Or separate processes
GEMINI_API_KEY=... npx tsx src/server.ts   # Terminal 1
npx tsx src/client.ts                      # Terminal 2
```

## What It Demonstrates

- **HTTP REST** endpoint (`POST /chat`) for simple request/response
- **WebSocket** endpoint (`WS /ws`) for persistent, bidirectional sessions
- Session persistence across requests (via session ID)
- Session management (list, destroy, max sessions)
- Health and info endpoints
