---
title: Secure Defaults
entity_type: concept
summary: The design principle in YAAF where all systems are configured to be secure by default, requiring explicit opt-in for riskier behaviors.
related_subsystems:
  - Security
  - Sandbox
  - Permissions
stub: false
compiled_at: 2026-04-16T14:11:09.314Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/security.md
confidence: 0.95
---

## What It Is
Secure Defaults is a core design philosophy in YAAF that ensures the framework is safe to use out of the box. By assuming a "least privilege" stance, the framework requires developers to explicitly opt-in to higher-risk behaviors, such as accessing files outside the project directory, persisting sensitive session data, or granting tools permission to modify the environment. This approach minimizes the attack surface for LLM-powered agents, which may otherwise perform unintended actions if left unconstrained.

## How It Works in YAAF
YAAF implements secure defaults across several subsystems, including storage, execution environments, and permission management.

### Permission and Tool Safety
The permission system operates on a "deny all" basis. Unless a developer explicitly configures a `PermissionPolicy` to allow a specific action, the framework blocks it. Tools within YAAF also carry metadata that defaults to the safest assumption; for instance, tools are not considered "read-only" or "destructive" unless specifically flagged, ensuring the agent and the developer treat them with appropriate caution.

### Sandbox Environment
The `Sandbox` subsystem restricts the agent's ability to interact with the host operating system. By default, file system access is limited to the Current Working Directory (CWD). Any attempt to access sensitive paths like `/etc` or the user's home directory results in a `sandbox-violation` event.

### Encrypted Storage
YAAF ensures that sensitive data, such as API keys or database credentials, is never stored in plaintext. The `SecureStorage` class uses AES-256-GCM encryption for all key-value pairs. If a developer does not provide a specific encryption key via environment variables or a password, the framework automatically derives a machine-specific key from the hostname and user details.

### Session Persistence
Conversation history and agent state are not persisted to disk by default. Developers must explicitly opt-in to session management using the `Session` class to enable statefulness across restarts.

## Configuration
Developers can override secure defaults by providing specific configurations to the relevant classes. The following table summarizes the default behaviors and how to modify them:

| System | Default | Override |
|--------|---------|----------|
| Permissions | Deny all | Use `.allow()` to permit actions |
| Tool `isReadOnly` | `false` | Explicitly mark as read-only |
| Tool `isDestructive` | `false` | Explicitly mark destructive tools |
| Sandbox paths | CWD only | Define `allowedPaths` in `Sandbox` config |
| Network | Allowed | Set `blockNetwork: true` in `Sandbox` |
| Storage encryption | Machine-derived key | Set `YAAF_STORAGE_KEY` environment variable |
| Session | Not persisted | Initialize an agent with a `Session` instance |

### Example: Overriding Sandbox Defaults
To relax the default sandbox constraints to allow access to `/tmp`, a developer must explicitly define the allowed paths:

```typescript
import { Sandbox } from 'yaaf';

const sandbox = new Sandbox({
  timeoutMs: 15_000,
  allowedPaths: [process.cwd(), '/tmp'],
  blockedPaths: ['/etc', '/usr', process.env.HOME!],
  blockNetwork: true, // Overriding the default 'Allowed' network state
});
```

### Example: Permission Policy
To move from the "deny all" default to a functional policy, developers chain allowance methods:

```typescript
import { PermissionPolicy, cliApproval } from 'yaaf';

const policy = new PermissionPolicy()
  .allow('read_*')
  .requireApproval('write_*', 'Needs confirmation')
  .deny('delete_*');
```