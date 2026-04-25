# Sandbox

YAAF's sandbox provides multi-layered tool execution isolation — from application-level argument scanning to kernel-enforced process restrictions. When configured via the factory functions, both layers activate automatically.

## Quick Start

```typescript
import { Agent, projectSandbox, strictSandbox } from 'yaaf';

// Project sandbox — kernel-enforced filesystem isolation, network allowed
const agent = new Agent({
  sandbox: projectSandbox('/my/project'),
  tools: [myTool],
});

// Strict sandbox — kernel-enforced filesystem + network blocking
const agent = new Agent({
  sandbox: strictSandbox('/my/project'),
  tools: [myTool],
});

// Strict sandbox with domain allowlist
const agent = new Agent({
  sandbox: strictSandbox('/my/project', {
    allowedNetworkDomains: ['api.openai.com', '*.anthropic.com'],
  }),
  tools: [myTool],
});
```

---

## Architecture

The sandbox enforces restrictions at two independent layers:

```
┌─────────────────────────────────────────────────────┐
│                   Application Layer                  │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │  Argument     │  │  ALS-based   │  │ Timeout + │ │
│  │  Scanning     │  │  fetch()     │  │ Violation │ │
│  │  (pre-exec)   │  │  Interception│  │ Tracking  │ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
├─────────────────────────────────────────────────────┤
│                    Kernel Layer                      │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │  sandbox-exec │  │  Domain      │  │  bwrap    │ │
│  │  (macOS       │  │  Filtering   │  │  (Linux)  │ │
│  │   Seatbelt)   │  │  Proxy       │  │           │ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────┘
```

### Application Layer (defense-in-depth)

Runs in the same Node.js process as the tool. Catches common cases with clean error messages.

| Protection | Mechanism | Covers |
|:---|:---|:---|
| URL argument scanning | `checkForUrls()` — inspects tool args before execution | URLs in `url`, `href`, `endpoint` fields and string values |
| Path argument scanning | `checkPaths()` — inspects tool args for filesystem paths | Path traversal (`../../etc/passwd`), blocked credential paths |
| `fetch()` interception | AsyncLocalStorage proxy on `globalThis.fetch` | Any tool code calling `fetch()` directly |
| Timeout | `Promise.race()` with configurable deadline | Runaway tools, infinite loops |
| Violation callbacks | `onViolation` hook + stats tracking | Observability, alerting |

### Kernel Layer (primary enforcement)

Wraps shell commands with platform-specific kernel restrictions. Cannot be bypassed by tool code.

| Platform | Backend | Mechanism |
|:---|:---|:---|
| macOS | `sandbox-exec` | Apple Seatbelt profile — syscall-level filesystem and network restrictions |
| Linux | `bwrap` (bubblewrap) | User namespace + mount namespace isolation |
| Linux (fallback) | Landlock LSM | Kernel-level filesystem access control |
| Cross-platform | Docker/Podman | Container-level isolation |

---

## Factory Functions

### `projectSandbox(projectDir?, opts?)`

Project-scoped isolation with network access. The most common choice.

```typescript
import { projectSandbox } from 'yaaf';

// Basic — restricts writes to project dir, allows network
const sb = projectSandbox('/my/project');

// With network domain filtering
const sb = projectSandbox('/my/project', {
  allowedNetworkDomains: ['api.openai.com', 'registry.npmjs.org'],
});

// Fail if OS sandbox unavailable (strict environments)
const sb = projectSandbox('/my/project', {
  failIfUnavailable: true,
});
```

**What it enforces:**

| Resource | Policy |
|:---|:---|
| Filesystem writes | Project directory only |
| Filesystem reads | Allowed everywhere except credential paths |
| Network | Allowed (unless `allowedNetworkDomains` is set) |
| Credential paths | Blocked (~/.ssh, ~/.aws, ~/.kube, etc.) |
| Timeout | 30 seconds (configurable) |
| OS sandbox | Enabled with graceful fallback |

### `strictSandbox(rootDir, opts?)`

Maximum isolation. Blocks all network by default.

```typescript
import { strictSandbox } from 'yaaf';

// Total lockdown — no network, writes only to rootDir
const sb = strictSandbox('/my/project');

// Allow specific API endpoints
const sb = strictSandbox('/my/project', {
  allowedNetworkDomains: ['api.openai.com'],
  timeoutMs: 10_000,
});
```

**What it enforces:**

| Resource | Policy |
|:---|:---|
| Filesystem writes | Root directory only |
| Filesystem reads | Root directory only (blocks /etc, /proc, /sys, /dev) |
| Network | **Blocked** (unless `allowedNetworkDomains` is set) |
| Credential paths | Blocked (expanded list: .env, .envrc, .yaaf, cloud creds, keychains) |
| Timeout | 15 seconds (configurable) |
| OS sandbox | Enabled with graceful fallback |

### `timeoutSandbox(timeoutMs?)`

Minimal — only timeout protection, no filesystem or network restrictions.

```typescript
import { timeoutSandbox } from 'yaaf';
const sb = timeoutSandbox(5_000);
```

---

## Domain Allowlisting

When `allowedNetworkDomains` is set, only requests to those domains are permitted. All others are blocked.

### Matching Rules

| Pattern | Matches | Does NOT match |
|:---|:---|:---|
| `"api.openai.com"` | `api.openai.com` | `openai.com`, `evil-api.openai.com.attacker.com` |
| `"*.anthropic.com"` | `api.anthropic.com`, `sub.api.anthropic.com` | `anthropic.com` itself |
| `".example.com"` | `sub.example.com`, `example.com` | `notexample.com` |

- Matching is **case-insensitive**: `"API.OpenAI.COM"` matches `api.openai.com`
- Partial domain names are **NOT matched**: `"example.com"` does not match `notexample.com`

### How It Works at Each Layer

**Argument scanning** — URLs in tool arguments are parsed. If the hostname matches an allowed domain, the tool executes. Otherwise, a `SandboxError` is thrown before execution begins.

**Runtime `fetch()` interception** — `globalThis.fetch` is proxied via `AsyncLocalStorage`. Allowed domains pass through to the real `fetch()`. Denied domains throw `SandboxError`.

**OS-level domain proxy** — A CONNECT proxy runs on localhost. Child processes (curl, wget, npm, etc.) have `HTTP_PROXY`/`HTTPS_PROXY` injected automatically. The proxy validates the target domain against the allowlist. Denied connections are refused at the TCP level.

**Kernel network restriction** — On macOS, the Seatbelt profile blocks all direct network access except to `localhost` (where the proxy runs). This prevents child processes from bypassing the proxy by connecting directly.

```
Tool calls exec("curl https://api.openai.com/v1/chat")
  → sandbox-exec wraps command with Seatbelt profile
  → HTTP_PROXY=http://localhost:PORT injected
  → curl connects to localhost proxy
  → proxy checks: "api.openai.com" in allowlist? → YES → proxy connects upstream
  → response flows back through proxy to curl

Tool calls exec("curl https://evil.com")
  → same wrapping
  → curl connects to localhost proxy
  → proxy checks: "evil.com" in allowlist? → NO → proxy refuses connection
  → curl gets "proxy refused" error
```

---

## Manual Configuration

For full control, use `new Sandbox()` directly:

```typescript
import { Sandbox } from 'yaaf';

const sandbox = new Sandbox({
  // Application-level
  timeoutMs: 15_000,
  allowedPaths: ['/my/project', '/tmp'],
  blockedPaths: ['/etc', process.env.HOME + '/.ssh'],
  blockNetwork: true,
  allowedNetworkDomains: ['api.openai.com'],
  debug: true,

  // Violation handler
  onViolation: (v) => {
    console.error(`[SECURITY] ${v.type} violation in ${v.toolName}: ${v.detail}`);
  },

  // Kernel-level
  osSandbox: {
    projectDir: '/my/project',
    blockNetwork: false,                            // Let proxy handle network
    allowedDomains: ['api.openai.com'],
    deniedDomains: ['internal.evil.com'],            // Denylist (takes precedence)
    failIfUnavailable: true,                        // Fail-closed
  },
});
```

### `SandboxConfig` Reference

| Field | Type | Default | Description |
|:---|:---|:---:|:---|
| `timeoutMs` | `number` | `30000` | Maximum execution time per tool call |
| `allowedPaths` | `string[]` | `[]` | Directories the tool may access (empty = unrestricted) |
| `blockedPaths` | `string[]` | `[]` | Directories always denied, even within allowed paths |
| `blockNetwork` | `boolean` | `false` | Block outbound network at the application level |
| `allowedNetworkDomains` | `string[]` | `[]` | Domains permitted when `blockNetwork` is true |
| `sandboxFetch` | `typeof fetch` | — | Custom fetch replacement for sandboxed tools |
| `pathValidator` | `(tool, path) => bool` | — | Custom path validation callback |
| `onViolation` | `(v) => void` | — | Called on every violation (before throwing) |
| `debug` | `boolean` | `false` | Log sandbox decisions to stderr |
| `sandboxRuntime` | `'inline' \| 'worker' \| 'external'` | `'inline'` | Execution isolation mode |
| `sandboxBackend` | `SandboxExternalBackend` | — | Custom backend for `'external'` mode |
| `osSandbox` | `OsSandboxConfig` | — | Kernel-level sandbox configuration |

### `OsSandboxConfig` Reference

| Field | Type | Default | Description |
|:---|:---|:---:|:---|
| `projectDir` | `string` | — | **(required)** Writable directory inside the sandbox |
| `writablePaths` | `string[]` | `[]` | Additional writable directories |
| `blockedPaths` | `string[]` | sensible defaults | Paths to deny entirely |
| `allowedDomains` | `string[]` | `undefined` | Network domain allowlist. `undefined` = no restriction, `[]` = block all |
| `deniedDomains` | `string[]` | `[]` | Domain denylist (takes precedence over allowlist) |
| `blockNetwork` | `boolean` | `false` | Block ALL network unconditionally |
| `failIfUnavailable` | `boolean` | `false` | Throw if no OS sandbox backend is available |

---

## Execution Modes

### `'inline'` (default)

Tool function runs in the same Node.js process. Application-level protections apply. Shell commands are kernel-sandboxed via `wrapShellCommand()`.

```typescript
const sb = new Sandbox({ sandboxRuntime: 'inline' });
const result = await sb.execute('myTool', args, async (args) => {
  // Runs in current process
  // fetch() is intercepted by ALS proxy
  // exec() calls are kernel-sandboxed
  return computeResult(args);
});
```

### `'worker'`

Tool function runs in a dedicated `worker_thread`. The worker has its own `globalThis.fetch` proxy. Useful for CPU-intensive tools or when you need stronger isolation boundaries.

```typescript
const sb = new Sandbox({ sandboxRuntime: 'worker', blockNetwork: true });
const result = await sb.execute('myTool', args, async (args) => {
  // Runs in a fresh worker_thread
  // fetch() is blocked
  // Function must be serializable (no closures)
  return computeResult(args);
});
```

**Constraint:** The tool function must be serializable via `fn.toString()`. No closures over external variables.

### `'external'`

Tool function runs in an external sandbox backend (Firecracker microVM, Docker container, etc.). Provides the strongest isolation.

```typescript
const backend = new FirecrackerBackend({ kernel: '...', rootfs: '...' });
const sb = new Sandbox({ sandboxRuntime: 'external', sandboxBackend: backend });
```

---

## Shell Command Wrapping

For tools that execute shell commands (Bash, file operations, git, etc.), the sandbox wraps commands with kernel-level restrictions:

```typescript
const sandbox = projectSandbox('/my/project');

// Wrap a shell command with kernel restrictions
const wrapped = await sandbox.wrapShellCommand('npm install express');
// Returns: "sandbox-exec -p '(version 1)(deny default)(allow ...)' /bin/sh -c 'HTTP_PROXY=... npm install express'"

// Check if OS sandbox is available
const available = await sandbox.isOsSandboxAvailable();

// Clean up proxy and backend resources
await sandbox.dispose();
```

The `AgentRunner` automatically calls `wrapShellCommand()` for tools that invoke `ctx.exec()`.

---

## Violation Handling

Every security violation produces a `SandboxError` with structured metadata:

```typescript
import { Sandbox, SandboxError } from 'yaaf';

const sandbox = new Sandbox({
  blockNetwork: true,
  onViolation: (violation) => {
    // violation.type: 'path' | 'network' | 'timeout'
    // violation.toolName: string
    // violation.detail: string
    metrics.increment('sandbox.violation', { type: violation.type });
  },
});

try {
  await sandbox.execute('risky_tool', { url: 'https://evil.com' }, fn);
} catch (err) {
  if (err instanceof SandboxError) {
    console.log(err.violation.type);    // 'network'
    console.log(err.violation.toolName); // 'risky_tool'
  }
}
```

### Stats

```typescript
const stats = sandbox.stats();
// {
//   callCount: 42,
//   totalDurationMs: 12500,
//   avgDurationMs: 297.6,
//   violationCount: 3,
// }
```

---

## Security Model

### What Is Protected

| Attack Vector | Shell Tools (`ctx.exec`) | In-Process Tools (`fn()`) |
|:---|:---:|:---:|
| Write outside project dir | ✅ Kernel | ✅ Arg scanning |
| Read credential files (~/.ssh, ~/.aws) | ✅ Kernel | ✅ Arg scanning |
| Path traversal (`../../etc/passwd`) | ✅ Kernel | ✅ Arg scanning |
| `curl https://evil.com` | ✅ Kernel + proxy | n/a |
| `fetch("https://evil.com")` | n/a | ✅ ALS proxy |
| `http.request("https://evil.com")`* | ✅ Kernel + proxy | ⚠️ Not intercepted |
| `net.connect(443, "evil.com")`* | ✅ Kernel | ⚠️ Not intercepted |
| Spawned child processes | ✅ Inherits kernel profile | n/a |
| Timeout enforcement | ❌ | ✅ |

*\*Node v25+ makes ESM module exports non-configurable. `http.request`, `https.request`, and `net.connect` cannot be intercepted via `Object.defineProperty` in the main thread or worker threads. Only `globalThis.fetch` (a writable global, not a module export) can be intercepted.*

### Known Limitations

1. **In-process `http.request` / `net.connect` bypass** — Tools using `axios`, `got`, `needle`, `undici`, or raw `http.request()` bypass the application-level network blocking on Node v25+. The OS-level sandbox blocks these for shell-executed tools but not for in-process tool functions.

2. **Argument scanning is heuristic** — `checkForUrls()` and `checkPaths()` scan tool arguments for patterns. Tools that construct URLs or paths dynamically inside their `call()` function bypass argument scanning. The ALS `fetch()` proxy catches dynamic URLs, but only for `fetch()` specifically.

3. **OS sandbox availability** — `sandbox-exec` is available on macOS but marked deprecated by Apple (still functional as of macOS 15). `bwrap` requires installation on Linux. Windows has no supported backend. Use `failIfUnavailable: true` for fail-closed behavior.

4. **Worker mode constraints** — Functions must be serializable via `fn.toString()`. Closures, imported references, and `this` bindings are not preserved across the serialization boundary.

### Closing the Remaining Gap

For environments requiring complete network isolation of in-process tools (not just shell commands), use one of:

- **`sandboxRuntime: 'external'`** with a Firecracker or Docker backend — runs the tool in a separate process/container with full kernel isolation.
- **Docker `--network=none`** — deploy the agent inside a network-restricted container.
- **Seccomp profiles** — restrict syscalls at the container level.

---

## Platform Support

| Platform | Backend | Filesystem | Network | Status |
|:---|:---|:---:|:---:|:---|
| macOS 12+ | `sandbox-exec` (Seatbelt) | ✅ | ✅ | Production-ready, tested |
| Linux (glibc) | `bwrap` (bubblewrap) | ✅ | ✅ | Implemented, needs E2E validation |
| Linux (5.13+) | Landlock LSM | ✅ | ❌ | Filesystem only, fallback |
| Docker/Podman | Container runtime | ✅ | ✅ | Cross-platform fallback |
| Windows | — | ❌ | ❌ | No backend, graceful fallback |

---

## Examples

### Minimal Agent with Sandbox

```typescript
import { Agent, projectSandbox } from 'yaaf';

const agent = new Agent({
  model: 'claude-sonnet-4-20250514',
  sandbox: projectSandbox(),
  tools: [readFileTool, writeFileTool, bashTool],
});

await agent.run('Refactor the utils module');
```

### API-Calling Agent with Domain Allowlist

```typescript
import { Agent, strictSandbox } from 'yaaf';

const agent = new Agent({
  model: 'claude-sonnet-4-20250514',
  sandbox: strictSandbox('/my/project', {
    allowedNetworkDomains: [
      'api.openai.com',
      'api.anthropic.com',
      '*.googleapis.com',
    ],
  }),
  tools: [searchTool, llmTool, writeFileTool],
});
```

### Production Deployment (Fail-Closed)

```typescript
import { Agent, strictSandbox } from 'yaaf';

const agent = new Agent({
  model: 'claude-sonnet-4-20250514',
  sandbox: strictSandbox('/workspace', {
    allowedNetworkDomains: ['api.anthropic.com'],
    failIfUnavailable: true,  // Refuse to run without kernel isolation
    timeoutMs: 60_000,
  }),
  tools: [bashTool, writeFileTool],
});
```

### Custom Sandbox with Violation Alerting

```typescript
import { Sandbox } from 'yaaf';

const sandbox = new Sandbox({
  timeoutMs: 15_000,
  allowedPaths: ['/workspace'],
  blockedPaths: ['/workspace/.env'],
  blockNetwork: true,
  allowedNetworkDomains: ['api.openai.com'],
  onViolation: (v) => {
    alerting.send({
      severity: 'HIGH',
      message: `Sandbox violation: ${v.type} in tool "${v.toolName}"`,
      detail: v.detail,
    });
  },
  osSandbox: {
    projectDir: '/workspace',
    allowedDomains: ['api.openai.com'],
    failIfUnavailable: true,
  },
});
```
