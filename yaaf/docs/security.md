# Security

## SecureStorage

AES-256-GCM encrypted key-value store. Zero plaintext on disk.

```typescript
import { SecureStorage } from 'yaaf';

const store = new SecureStorage({
  namespace: 'my-agent',
  storageDir: './.secrets',
});

await store.set('openai_key', 'sk-...');
await store.set('database_url', 'postgres://...');

const key = await store.get('openai_key');
const all = await store.list();  // ['openai_key', 'database_url']
await store.delete('openai_key');
```

### Key Derivation

Three modes for deriving the encryption key:

```bash
# 1. Environment variable (recommended for production)
export YAAF_STORAGE_KEY=$(openssl rand -hex 32)

# 2. Password-based (PBKDF2 — for developer machines)
const store = new SecureStorage({
  namespace: 'my-agent',
  password: 'my-passphrase',
});

# 3. Machine key (auto-derived from hostname + user)
const store = new SecureStorage({
  namespace: 'my-agent',
  // No key or password → machine-derived
});
```

### Storage Format

```
.secrets/
├── openai_key.enc     # AES-256-GCM ciphertext
├── database_url.enc
└── .salt              # PBKDF2 salt (if password mode)
```

Each `.enc` file contains:
- 12-byte IV (random per write)
- 16-byte auth tag
- Ciphertext

---

## Sandbox

Multi-layered tool execution isolation — from application-level argument scanning to kernel-enforced process restrictions.

```typescript
import { projectSandbox, strictSandbox } from 'yaaf';

// Kernel-enforced filesystem isolation (auto-enabled)
const sb = projectSandbox('/my/project');

// Full lockdown — filesystem + network + domain allowlist
const sb = strictSandbox('/my/project', {
  allowedNetworkDomains: ['api.openai.com'],
  failIfUnavailable: true,  // Refuse to run without kernel sandbox
});
```

📖 **Full documentation:** [sandbox.md](sandbox.md) — architecture, configuration reference, domain allowlisting, security model, platform support, and examples.

---

## Session Persistence

Persist conversation state across restarts:

```typescript
import { Session, listSessions, pruneOldSessions } from 'yaaf';

// Resume or create
const session = await Session.resumeOrCreate('my-bot', {
  dir: './.sessions',
});

const agent = new Agent({ session, ... });

// Session auto-saves after each agent.run()

// Manual operations
await session.append([
  { role: 'user', content: 'Hello' },
  { role: 'assistant', content: 'Hi!' },
]);

const history = session.getMessages();
await session.clear();
```

### Session Management

```typescript
// List all sessions
const sessions = await listSessions('./.sessions');
// [{ id: 'my-bot', messageCount: 42, lastModified: Date }]

// Prune old sessions
const pruned = await pruneOldSessions('./.sessions', {
  olderThanDays: 30,
});
console.log(`Removed ${pruned} old sessions`);
```

### Storage Format

```
.sessions/
├── my-bot/
│   ├── messages.jsonl   # Append-only message log
│   └── metadata.json    # Session metadata
└── other-bot/
    └── ...
```

---

## Permission Policy

See [Permissions & Hooks](permissions.md) for the full permission system documentation.

Quick reference:

```typescript
import { PermissionPolicy, cliApproval } from 'yaaf';

const policy = new PermissionPolicy()
  .allow('read_*')
  .requireApproval('write_*', 'Needs confirmation')
  .deny('delete_*')
  .onRequest(cliApproval());
```

---

## Secure Defaults

YAAF applies secure defaults throughout:

| System | Default | Override |
|--------|---------|----------|
| Permissions | Deny all | `.allow()` to permit |
| Tool `isReadOnly` | `false` | Explicitly mark as read-only |
| Tool `isDestructive` | `false` | Mark destructive tools |
| Sandbox paths | Project dir only | Add allowed paths |
| Sandbox OS isolation | Auto-enabled (graceful fallback) | `failIfUnavailable: true` for fail-closed |
| Network | Allowed | `blockNetwork: true` or `strictSandbox()` |
| Domain filtering | All domains allowed | `allowedNetworkDomains: [...]` |
| Storage encryption | Machine-derived key | Set `YAAF_STORAGE_KEY` |
| Session | Not persisted | Opt-in with `Session` |
