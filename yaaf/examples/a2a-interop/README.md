# A2A Interoperability

Agent-to-Agent (A2A) protocol demo — two agents built with **different frameworks** communicating over the A2A open protocol (JSON-RPC 2.0 / HTTP).

## Architecture

```
YAAF Agent (Weather Specialist) ← A2A Server
    ↕  JSON-RPC 2.0 / HTTP
Vercel AI SDK Agent (Travel Planner) ← A2A Client
```

Neither agent knows the other's internals — they are opaque to each other.

## Run

```bash
# Both agents in one process
GEMINI_API_KEY=... npm start

# Or in separate terminals
GEMINI_API_KEY=... npx tsx src/yaaf-server.ts   # Terminal 1
GEMINI_API_KEY=... npx tsx src/vercel-client.ts  # Terminal 2
```

## What It Demonstrates

- A2A server hosting a YAAF agent
- A2A client consuming the server from a different framework
- Cross-framework agent interop via open protocol
- Tools, prompts, and memory remain private to each agent
