# Secure Storage

AES-256-GCM encrypted key-value store for secrets and credentials.

## Run

```bash
# Machine-derived key (local dev)
npm start

# Explicit key (most secure)
YAAF_STORAGE_KEY=$(openssl rand -hex 32) npm start
```

No LLM API keys required — this example is self-contained.

## What It Demonstrates

- **SecureStorage** — AES-256-GCM encrypted key-value store
- Three key derivation modes:
  1. **Environment variable** (`YAAF_STORAGE_KEY`) — recommended for production
  2. **Password-based** (PBKDF2) — for user-specific secrets
  3. **Machine-derived** (hostname + username) — for local dev only
- Store, retrieve, list, and delete secrets
- Using SecureStorage to hold API credentials securely
