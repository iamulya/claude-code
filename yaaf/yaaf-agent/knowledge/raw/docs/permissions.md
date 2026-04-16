# Permissions & Hooks

## Permission Policy

Control which tools agents can use, with glob-based rules and interactive approval.

```typescript
import { PermissionPolicy, cliApproval } from 'yaaf';

const policy = new PermissionPolicy()
  // Allow all read operations
  .allow('read_*')
  .allow('search_*')

  // Require interactive approval for writes
  .requireApproval('write_*', 'File writes require confirmation')
  .requireApproval('exec', 'Shell commands need approval')

  // Block dangerous operations
  .deny('delete_*', 'Deletion is disabled by policy')
  .deny('drop_database', 'Database drops are permanently blocked')

  // Interactive approval handler
  .onRequest(cliApproval());

const agent = new Agent({
  permissions: policy,
  tools: [...],
  systemPrompt: '...',
});
```

### Rule Priority

Rules are evaluated in order: **deny > requireApproval > allow > default deny**.

```typescript
policy
  .deny('exec_*')                    // Block all exec
  .allow('exec_lint')                // ...except lint
  .requireApproval('exec_test')      // ...and test needs approval

// exec_lint    → allowed
// exec_test    → requires approval ← deny takes priority
// exec_deploy  → denied
// exec_lint    → allowed (specific allow overrides general deny)
```

### Glob Patterns

| Pattern | Matches |
|---------|---------|
| `read_*` | `read_file`, `read_dir`, `read_config` |
| `*_database` | `query_database`, `drop_database` |
| `exec` | Only `exec` (exact match) |
| `*` | Everything (use with caution) |

### Custom Approval Handler

```typescript
// Slack-based approval
policy.onRequest(async (toolName, args, reason) => {
  await slack.send(`🔐 ${toolName} needs approval: ${reason}`);
  const response = await slack.waitForReaction(300_000); // 5 min timeout
  return response === 'thumbsup';
});
```

### Events

```typescript
agent
  .on('tool:blocked', ({ name, reason }) => {
    audit.log(`Blocked: ${name} — ${reason}`);
  })
  .on('tool:sandbox-violation', ({ name, violationType, detail }) => {
    security.alert(`Sandbox: ${violationType} by ${name}`);
  });
```

---

## Lifecycle Hooks

Hooks intercept agent execution at key points. Each hook returns an action:

```typescript
{ action: 'continue' }              // Proceed normally
{ action: 'block', reason: '...' }  // Stop and inject reason
{ action: 'inject', message: '...'} // Add message and continue
{ action: 'retry' }                 // Retry the operation
```

### All Hooks

```typescript
const hooks: Hooks = {
  // ── Before LLM Call ─────────────────────────────────
  beforeLLM: async (ctx) => {
    // ctx.messages — full conversation history
    // ctx.tools — available tool schemas
    // ctx.turnNumber — which iteration
    console.log(`Turn ${ctx.turnNumber}: ${ctx.messages.length} messages`);
    return { action: 'continue' };
  },

  // ── After LLM Response ──────────────────────────────
  afterLLM: async (ctx, result) => {
    // result.content — LLM text
    // result.toolCalls — requested tool calls
    // result.usage — token counts
    return { action: 'continue' };
  },

  // ── Before Tool Execution ──────────────────────────
  beforeToolCall: async (ctx) => {
    // ctx.toolName — which tool
    // ctx.arguments — tool inputs
    if (ctx.toolName === 'exec' && ctx.arguments.cmd?.includes('rm')) {
      return { action: 'block', reason: 'rm commands are blocked' };
    }
    return { action: 'continue' };
  },

  // ── After Tool Execution ───────────────────────────
  afterToolCall: async (ctx, result, error) => {
    metrics.histogram('tool_duration_ms', ctx.durationMs, {
      tool: ctx.toolName,
      success: !error,
    });
    return { action: 'continue' };
  },
};

const agent = new Agent({ hooks, ... });
```

### Common Patterns

**Rate Limiting:**

```typescript
const callCounts = new Map<string, number>();

beforeToolCall: async (ctx) => {
  const count = (callCounts.get(ctx.toolName) ?? 0) + 1;
  callCounts.set(ctx.toolName, count);

  if (count > 10) {
    return {
      action: 'block',
      reason: `${ctx.toolName} called too many times (${count})`,
    };
  }
  return { action: 'continue' };
}
```

**Audit Logging:**

```typescript
afterToolCall: async (ctx, result, error) => {
  await auditLog.append({
    timestamp: new Date(),
    tool: ctx.toolName,
    args: ctx.arguments,
    success: !error,
    durationMs: ctx.durationMs,
    agent: ctx.agentName,
  });
  return { action: 'continue' };
}
```

**Cost Guard:**

```typescript
afterLLM: async (_ctx, result) => {
  totalTokens += result.usage?.totalTokens ?? 0;
  if (totalTokens > 100_000) {
    return {
      action: 'block',
      reason: 'Token budget exceeded (100k)',
    };
  }
  return { action: 'continue' };
}
```

---

## Sandbox

Restrict file system access and command execution:

```typescript
import { Sandbox, projectSandbox, strictSandbox } from 'yaaf';

// Custom
const sandbox = new Sandbox({
  timeoutMs:    15_000,
  allowedPaths: [process.cwd(), '/tmp'],
  blockedPaths: ['/etc', '/usr', process.env.HOME!],
  blockNetwork: false,
});

// Convenience factories
const dev    = projectSandbox(); // CWD + /tmp, 30s timeout
const strict = strictSandbox();  // CWD only, no network, 10s
```
