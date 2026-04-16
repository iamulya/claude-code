# MCP OAuth

OAuth 2.0 integration for authenticated MCP (Model Context Protocol) server connections.

## Run

```bash
npm start
```

No API keys required — this example uses a mock OAuth server and is fully self-contained.

## What It Demonstrates

- **Authorization Code + PKCE** flow (user-interactive auth)
- **Client Credentials** flow (machine-to-machine auth)
- **FileTokenStore** — persistent token storage
- Token lifecycle management (check, refresh, clear)
- Local callback server for CLI OAuth flows
- Integration with **McpPlugin** for authenticated SSE connections
