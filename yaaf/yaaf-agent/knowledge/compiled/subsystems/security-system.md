---
title: Security System
entity_type: subsystem
summary: The logical subsystem of YAAF providing encryption, sandboxing, session persistence, and permission management.
primary_files:
  - src/security.ts
  - src/sandbox.ts
  - src/session.ts
  - src/permissions.ts
exports:
  - PermissionPolicy
  - SecureStorage
  - Sandbox
  - Session
  - PromptGuard
  - OutputSanitizer
  - PiiRedactor
stub: false
compiled_at: 2026-04-16T14:09:55.358Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/permissions.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/security.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/security/index.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/security/outputSanitizer.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/security/promptGuard.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/security/structuredOutputValidator.ts
confidence: 1
---

## Purpose
The Security System provides a multi-layered defense-in-depth architecture for LLM-powered agents. It is designed to mitigate common risks associated with autonomous agents, including prompt injection, unauthorized tool execution, data leakage (PII), and insecure file system access. The subsystem aligns with OWASP security principles for LLM applications, providing tools for both input validation and output sanitization.

## Architecture
The Security System is composed of several distinct but interoperable components that manage different aspects of the agent lifecycle:

### Permission Management
The `PermissionPolicy` class governs tool execution. It uses a glob-based rule system to determine if an agent can execute a specific tool. Rules are evaluated in a specific priority order: **deny > requireApproval > allow > default deny**. This ensures that explicit denials always override permissions.

### Execution Sandboxing
The `Sandbox` component restricts the agent's environment, specifically focusing on file system access and network connectivity. It allows developers to define `allowedPaths` and `blockedPaths`, and can enforce execution timeouts to prevent resource exhaustion.

### Secure Storage and Persistence
*   **SecureStorage**: An AES-256-GCM encrypted key-value store used for sensitive data like API keys. It supports multiple key derivation modes, including environment variables, PBKDF2 password-based derivation, and machine-derived keys.
*   **Session Persistence**: The `Session` class manages conversation state, persisting message history to disk in an append-only JSONL format. It includes utilities for listing and pruning old sessions based on age.

### Security Middleware (Hooks)
YAAF utilizes a hook-based architecture to intercept agent execution at four key points: `beforeLLM`, `afterLLM`, `beforeToolCall`, and `afterToolCall`. Specific security middlewares include:
*   **PromptGuard**: Detects prompt injection patterns such as instruction overrides, role hijacking, and system prompt extraction.
*   **OutputSanitizer**: Strips HTML/XSS, validates URLs, and enforces maximum output lengths on LLM responses.
*   **PiiRedactor**: Detects and redacts Personally Identifiable Information (PII) in both input and output directions.
*   **StructuredOutputValidator**: Enforces schema constraints on JSON outputs to prevent processing malformed or hallucinated data.

## Integration Points
The Security System integrates deeply with the Agent runner:
*   **Agent Initialization**: Security policies and sandboxes are passed into the `Agent` constructor.
*   **Hook System**: Security components are typically implemented as hooks that return actions like `continue`, `block`, `inject`, or `retry`.
*   **Observability**: Security events (e.g., sandbox violations, blocked tools, or detected injections) are emitted as events that can be captured by audit logs or monitoring plugins.

## Key APIs

### PermissionPolicy
Used to define what tools an agent can access.
```typescript
const policy = new PermissionPolicy()
  .allow('read_*')
  .requireApproval('write_*', 'Confirmation required')
  .deny('exec', 'Shell access disabled');
```

### SecureStorage
Provides encrypted persistence for secrets.
```typescript
const store = new SecureStorage({ namespace: 'agent-secrets' });
await store.set('api_key', 'sk-...');
```

### Sandbox
Restricts the runtime environment.
```typescript
const sandbox = new Sandbox({
  allowedPaths: [process.cwd()],
  blockNetwork: true,
  timeoutMs: 10000
});
```

### PromptGuard
Middleware for detecting injection attacks. It supports `detect` (log only) and `block` (sanitize) modes.
```typescript
const guard = new PromptGuard({ mode: 'block', sensitivity: 'high' });
```

## Configuration
The system applies "Secure Defaults" across all components:
*   **Permissions**: Defaults to "deny all" if no policy is provided.
*   **Sandbox**: Defaults to the Current Working Directory (CWD) only.
*   **Storage**: Uses machine-derived encryption keys if no explicit key is provided.
*   **Tools**: Tools are assumed to be non-read-only and non-destructive unless explicitly marked otherwise.

Developers can use the `securityHooks()` helper to quickly apply a pre-configured suite of OWASP-aligned middlewares to an agent.

## Extension Points
*   **Custom Approval Handlers**: Developers can implement the `onRequest` method in `PermissionPolicy` to route approval requests to external systems like Slack, CLI, or a web UI.
*   **Custom Patterns**: `PromptGuard` allows the registration of custom regex patterns for domain-specific injection detection.
*   **Custom Sanitizers**: `OutputSanitizer` supports a `customSanitizer` function for specialized content filtering.
*   **Lifecycle Hooks**: Developers can write arbitrary logic in the four primary hook points to implement custom security logic like rate limiting or cost guarding.