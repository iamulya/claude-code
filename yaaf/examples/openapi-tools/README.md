# OpenAPI Tools

Auto-generate agent tools from an OpenAPI 3.x specification. The agent calls live REST endpoints.

## Run

```bash
GEMINI_API_KEY=... npm start
# or
OPENAI_API_KEY=sk-... npm start
```

No additional API keys required — uses [httpbin.org](https://httpbin.org) as a live echo API.

## What It Demonstrates

- **OpenAPIToolset** — load an OpenAPI spec and auto-generate tools
- Agent interacting with a real REST API (httpbin.org)
- Operation filtering (only expose specific endpoints)
- Streaming tool call events while hitting live endpoints
- Error handling (non-existent endpoints return error data, not crashes)
