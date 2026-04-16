# Identity + Sessions

End-to-end demo of YAAF's identity resolution and server-side session management. Starts a live HTTP server you can hit with `curl`.

## Features

- **JWT authentication** (HMAC HS256 — self-contained, no external IdP)
- **API key fallback** (static key → user mapping)
- **CompositeIdentityProvider** (JWT first, API key fallback)
- **Server-side sessions** (auto-created, identity-bound)
- **Session isolation** (users can only access their own sessions)
- **Session management API** (`GET /sessions`, `DELETE /sessions/:id`)

## Run

```bash
npm install
npm start        # Start the server on :4200
npm test         # Run automated E2E tests against it (in another terminal)
```

## API Keys

| Key | User | Role | Tenant |
|-----|------|------|--------|
| `sk-alice-admin` | Alice | admin | acme |
| `sk-bob-viewer` | Bob | viewer | acme |
| `sk-eve-external` | Eve | viewer | globex |

## Manual Testing

```bash
# Chat with API key (creates session)
curl -s http://localhost:4200/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk-alice-admin" \
  -d '{"message":"Hello!"}' | jq

# Resume a session
curl -s http://localhost:4200/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk-alice-admin" \
  -d '{"message":"Continue", "session_id":"<SESSION_ID>"}' | jq

# List your sessions
curl -s http://localhost:4200/sessions \
  -H "X-API-Key: sk-alice-admin" | jq

# Unauthenticated → 401
curl -s http://localhost:4200/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello"}' | jq
```

## E2E Test Coverage

The automated test script (`npm test`) verifies 14 scenarios:
authentication, session continuity, session isolation, JWT auth,
session management API, streaming with identity, and cross-tenant isolation.
