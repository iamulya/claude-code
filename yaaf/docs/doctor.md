# YAAF Doctor

YAAF ships with a built-in expert agent that understands the framework deeply and can diagnose your project in real time. No extra install needed — it's part of the `yaaf` package.

---

## Quickstart — Zero Code

The fastest way to enable the Doctor. Pick one:

### Option A: One config flag

```typescript
const agent = new Agent({
  model: 'gpt-4o',
  tools: [myTools],
  doctor: true,   // ← that's it
});
```

### Option B: One environment variable (no code changes at all)

```bash
YAAF_DOCTOR=1 npx tsx src/main.ts
```

Both approaches auto-attach the Doctor to your agent. It silently watches for `tool:error`, `tool:blocked`, `llm:retry`, sandbox violations, and iteration limits. When something goes wrong, it diagnoses the error using its own LLM call and logs the result.

```
[agent] 🩺 Doctor: Tool "bash" was blocked
[agent] 🩺 Doctor: Doctor diagnosis: 1 runtime error(s) analyzed
        The `bash` tool was blocked because the LLM attempted `rm -rf /tmp/*`
        which matches the DANGEROUS_PATTERNS list in PermissionPolicy.
        Fix: Add cliApproval({ dangerousPatterns: true }) to your permissions.
```

---

## Modes

| Mode | How | LLM | Description |
|------|-----|:---:|-------------|
| **Auto-Attach** | `doctor: true` or `YAAF_DOCTOR=1` | ✅ | Watches agent events, diagnoses errors (zero code) |
| **Interactive** | `yaaf doctor` | ✅ | Ask questions, get code-grounded answers |
| **Live Watch** | `doctor.watch(agent)` | ✅ | Programmatic event-stream tap with custom handlers |
| **Daemon** | `yaaf doctor --daemon` | ✅ | Periodic tsc + test watcher (Vigil-based) |
| **File Watch** | `yaaf doctor --watch` | ❌ | Lightweight `tsc --noEmit` loop (zero API cost) |

---

## CLI Usage

### Interactive REPL

```bash
npx yaaf doctor
```

```
🩺 YAAF Doctor
   I'm an expert on YAAF. Ask me anything about your project.
   I can read files, search code, run tsc, run tests, and diagnose issues.
   Type "exit" to quit, "reset" to clear history.

  doctor> Why is my tool not being called?

  ⚙ grep_search...
  ✓ grep_search (42ms)
  ⚙ read_file...
  ✓ read_file (3ms)

  Your tool uses `execute()` but YAAF's Tool interface requires `call()`.
  In src/tools/myTool.ts:18, change:

  ```diff
  - async execute(input, ctx) {
  + async call(input, ctx) {
  ```

  Also, `call()` must return `{ data: ... }` (ToolResult), not a plain string.
```

### Daemon Mode

```bash
npx yaaf doctor --daemon
# or with custom interval:
CHECK_INTERVAL_SEC=60 npx yaaf doctor --daemon
```

The daemon runs as a Vigil agent that:
1. Periodically compiles your project (`tsc --noEmit`)
2. Runs your test suite if compilation passes
3. **Diffs against the last known state** — only surfaces NEW errors
4. Uses the LLM to diagnose root causes and suggest fixes

```
🩺 YAAF Doctor (daemon — every 30s)
   Watching for errors. Ctrl+C to stop.

🔴 2 new TypeScript error(s)
   src/agent.ts(42,5): error TS2322: Type 'string' is not assignable to type 'ContextManager'.
   src/tools/search.ts(18,9): error TS2353: 'execute' does not exist in type 'Tool'.
```

### Watch Mode (no LLM)

```bash
npx yaaf doctor --watch
```

Pure file-system watching — runs `tsc --noEmit` every 10 seconds. Zero API calls, zero cost. Shows only new errors and celebrates when they're resolved.

---

## Programmatic API

### Ask a question

```typescript
import { YaafDoctor } from 'yaaf';

const doctor = new YaafDoctor({
  projectRoot: process.cwd(),
});

const answer = await doctor.ask('How do I add a new compaction strategy?');
console.log(answer);
```

### Stream responses

```typescript
for await (const event of doctor.askStream('Run the tests and explain failures')) {
  if (event.type === 'text_delta') {
    process.stdout.write(event.content);
  } else if (event.type === 'tool_call_start') {
    console.log(`⚙ ${event.name}...`);
  }
}
```

### One-shot health check

```typescript
const issues = await doctor.healthCheck();

if (issues.length > 0) {
  console.log('Fix before deploying:');
  for (const issue of issues) {
    console.log(`  ${issue.type}: ${issue.summary}`);
    console.log(`  ${issue.details}\n`);
  }
}
```

### Daemon — run alongside your agent

```typescript
import { Agent, YaafDoctor } from 'yaaf';

// Your agent
const agent = new Agent({
  model: 'gpt-4o',
  systemPrompt: 'You are a customer support agent.',
  tools: [ticketTool, knowledgeBaseTool],
});

// Doctor runs alongside — watches for problems
const doctor = new YaafDoctor({
  projectRoot: process.cwd(),
  daemonIntervalSec: 30,
});

doctor.onIssue((issue) => {
  console.log(`🩺 ${issue.summary}`);
  console.log(`   ${issue.details}`);
  // Or: post to Slack, write to log, trigger CI...
});

await doctor.startDaemon();

// Your agent works normally
await agent.run('Handle this support ticket');

// Later, stop the daemon
doctor.stopDaemon();
```

### Lightweight watch (no LLM)

```typescript
const doctor = new YaafDoctor();

const stop = doctor.startWatch({
  intervalSec: 10,
  onError: (errors) => {
    console.log(`❌ ${errors.length} new error(s):`);
    errors.forEach(e => console.log(`  ${e}`));
  },
  onClear: () => {
    console.log('✅ All errors resolved!');
  },
});

// ... later
stop();
```

### Live Agent Watching — `doctor.watch(agent)`

The most powerful mode. The Doctor **taps directly into your running agent's event stream** and watches for **16 event types** across every YAAF subsystem:

**Tool errors:**

| Event | What it catches |
|-------|----------------|
| `tool:error` | Tool threw an exception during execution |
| `tool:blocked` | Permission policy denied a tool call |
| `tool:sandbox-violation` | Tool escaped sandbox boundaries |
| `tool:validation-failed` | LLM sent arguments that don't match the schema |
| `tool:loop-detected` | Same tool called repeatedly with identical output |

**LLM errors:**

| Event | What it catches |
|-------|----------------|
| `llm:retry` | LLM API call failed (surfaces first + last retry) |
| `llm:empty-response` | Model returned nothing useful (empty/whitespace only) |

**Context & Recovery:**

| Event | What it catches |
|-------|----------------|
| `iteration` | Agent approaching `maxIterations` limit |
| `context:overflow-recovery` | Emergency compaction triggered (or failed) by token overflow |
| `context:output-continuation` | Output token limit hit, synthetic continuation injected |
| `context:compaction-triggered` | ContextManager auto-compaction ran (with before/after stats) |
| `context:budget-warning` | Context approaching compaction threshold |

**Hooks & Guardrails:**

| Event | What it catches |
|-------|----------------|
| `hook:error` | A user-provided hook threw an error (swallowed to prevent crash) |
| `hook:blocked` | A hook returned `{ action: 'block' }` |
| `guardrail:warning` | Cost/token/turn budget approaching limit |
| `guardrail:blocked` | Budget exceeded — agent stopped |

Errors are accumulated in a **debounced buffer** — cascading failures (e.g., 20 `tool:blocked` events from one permission misconfiguration) are batched into a single LLM diagnosis call.

```typescript
import { Agent, YaafDoctor, buildTool } from 'yaaf';

// The developer's agent
const agent = new Agent({
  model: 'gemini-2.5-flash',
  systemPrompt: 'You are a coding assistant.',
  tools: [readFileTool, writeFileTool, bashTool],
});

// Create the doctor and attach it to the agent
const doctor = new YaafDoctor();

doctor.onIssue((issue) => {
  if (issue.type === 'runtime_error') {
    console.log(`\n🔴 RUNTIME ERROR: ${issue.summary}`);
    console.log(`   ${issue.details}`);
  } else if (issue.type === 'pattern_warning') {
    console.log(`\n🩺 DOCTOR SAYS: ${issue.summary}`);
    console.log(`   ${issue.details}`);
  }
});

// Start watching — subscribes to agent events
doctor.watch(agent, {
  debounceMs: 2000,     // Wait 2s after last error before diagnosing
  maxBufferSize: 5,     // Force-diagnose after 5 errors
  autoDiagnose: true,   // Use LLM to analyze (set false for raw events only)
});

// Agent runs normally — Doctor watches silently in the background
await agent.run('Refactor the auth module and add tests');

// When done, stop watching
doctor.unwatch(agent);
// Or: doctor.unwatchAll();
```

**What this looks like at runtime:**

```
> agent.run('Delete all temp files then rebuild')

🔴 RUNTIME ERROR: Tool "bash" was blocked
   Tool: bash
   Reason: Command matches DANGEROUS_PATTERN: rm -rf
   Fix: Check your PermissionPolicy — ensure this tool is allowed or has an approval handler.

🩺 DOCTOR SAYS: Doctor diagnosis: 1 runtime error(s) analyzed
   The `bash` tool was blocked because the LLM attempted `rm -rf /tmp/*` which matches
   the DANGEROUS_PATTERNS list in your PermissionPolicy.

   Fix: Add an approval handler for destructive commands:
   ```ts
   permissions: cliApproval({ dangerousPatterns: true })
   ```
   Or if you trust this operation, add it to the allow-list:
   ```ts
   permissions: new PermissionPolicy().allow('bash', { commands: ['rm -rf /tmp/*'] })
   ```
```

**Watch options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `debounceMs` | `number` | `2000` | Quiet period before flushing error buffer |
| `maxBufferSize` | `number` | `5` | Force-flush after this many errors |
| `autoDiagnose` | `boolean` | `true` | Use Doctor's LLM to analyze errors |

---

## Configuration

```typescript
const doctor = new YaafDoctor({
  // Project to inspect (default: process.cwd())
  projectRoot: '/path/to/my-project',

  // LLM settings (default: auto-detect from env)
  model: 'gpt-4o',
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,

  // Daemon interval (default: 30s)
  daemonIntervalSec: 60,

  // Max tool-call rounds per question (default: 20)
  maxIterations: 25,

  // Extra tools the doctor can use
  extraTools: [myCustomLintTool],

  // Extra instructions appended to the system prompt
  extraInstructions: 'This project uses a custom ORM. Check schema.prisma for types.',
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `projectRoot` | `string` | `process.cwd()` | Root directory to inspect |
| `model` | `string` | auto | LLM model ID |
| `provider` | `'openai' \| 'gemini' \| 'groq' \| 'ollama'` | auto | Force LLM provider |
| `apiKey` | `string` | from env | API key override |
| `daemonIntervalSec` | `number` | `30` | Daemon check interval |
| `maxIterations` | `number` | `20` | Max LLM tool-call rounds per question |
| `extraTools` | `Tool[]` | `[]` | Additional tools for the doctor |
| `extraInstructions` | `string` | — | Appended to system prompt |

---

## Built-in Tools

The Doctor has 6 code-intelligence tools, all sandboxed to your project root:

| Tool | Description |
|------|-------------|
| `read_file` | Read file contents with optional line ranges |
| `grep_search` | Pattern search across source files (regex supported) |
| `list_dir` | List directory contents (filters node_modules, dist, .git) |
| `run_tsc` | Run `tsc --noEmit` and return any errors |
| `run_tests` | Run `npm test` and return results |
| `get_project_structure` | Get full file tree (TS, MD, JSON files) |

All tools use `buildTool()` with `isReadOnly: true` — the Doctor never modifies your code.

---

## What the Doctor Knows

The Doctor's YAAF knowledge is **baked into its system prompt** — it doesn't need to read the YAAF source at runtime. It knows:

- **Agent API** — configuration, streaming, events, factory methods
- **Tool System** — `buildTool()`, schemas, permissions, the call/describe interface
- **Context Management** — ContextManager, 7 compaction strategies, auto mode, error recovery
- **Model Specs Registry** — 40+ models with real context/output token limits
- **Memory Strategies** — session, topic, ephemeral, LLM retrieval, Honcho
- **Permissions & Hooks** — PermissionPolicy chains, lifecycle hooks
- **Session & Sandbox** — JSONL persistence, execution sandboxing
- **Vigil** — autonomous mode, tick loops, cron scheduling
- **Runtimes** — CLI, Server, Worker, Gateway

It uses **tools to read your code** — so answers are always grounded in your actual source files, not hypothetical examples.

---

## Common Diagnoses

| Problem | What the Doctor does |
|---------|---------------------|
| "Why won't my tool work?" | Reads your tool definition, checks for `call()` vs `execute()`, validates schema |
| "I'm getting TS2322" | Runs `tsc --noEmit`, reads the error location, explains the type mismatch |
| "My tests are failing" | Runs `npm test`, parses failures, reads relevant source, explains root cause |
| "Context overflow errors" | Checks if `contextManager` is configured, suggests `'auto'` or manual setup |
| "Agent stops after 15 turns" | Finds `maxIterations` and explains the limit |
| "Model not found" | Searches for the model string, checks the specs registry, suggests alternatives |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       YaafDoctor                             │
│                                                             │
│  ask(question)          → Agent.run() with tools             │
│  askStream(question)    → Agent.runStream()                  │
│  healthCheck()          → tsc + npm test (no LLM)            │
│  startDaemon()          → Vigil tick loop + LLM              │
│  startWatch()           → setInterval + tsc (no LLM)         │
│  watch(agent)           → event stream tap + LLM diagnosis   │
│                                                             │
│  ┌────────────────┐  ┌──────────────────────────────────┐   │
│  │  ErrorTracker   │  │  RuntimeErrorBuffer              │   │
│  │  (diff-based,   │  │  (debounced accumulator —        │   │
│  │   for daemon)   │  │   batches cascading errors       │   │
│  │                 │  │   into one LLM diagnosis call)   │   │
│  └─────────────────┘  └──────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Event Subscriptions (watch mode)                     │   │
│  │  tool:error · tool:blocked · tool:sandbox-violation   │   │
│  │  tool:validation-failed · llm:retry · iteration       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           YAAF Framework (dogfooded)                  │   │
│  │   Agent · Vigil · ContextManager · buildTool          │   │
│  │   RunnerEvents · Model Specs · Error Recovery         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

              doctor.watch(devAgent)
                      │
          ┌───────────┼───────────────┐
          ▼           ▼               ▼
    tool:error   tool:blocked    llm:retry
          │           │               │
          └───────────┼───────────────┘
                      ▼
            RuntimeErrorBuffer
            (debounce 2s / max 5)
                      │
                      ▼
              Doctor's own LLM
            (diagnose + suggest fix)
                      │
                      ▼
            onIssue() handlers
       (console, Slack, log, CI, etc.)
```

The Doctor is built entirely with YAAF's own primitives — `Agent` for interactive mode, `Vigil` for daemon mode, `buildTool()` for code intelligence, `RunnerEvents` for live agent watching, and `ContextManager` with model-aware auto-configuration. The ultimate dogfood.
