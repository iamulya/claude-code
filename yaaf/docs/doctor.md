# YAAF Doctor

YAAF ships with a built-in expert agent that understands the framework deeply and can diagnose your project in real time. No extra install needed — it's part of the `yaaf` package.

---

## Three Modes

| Mode | Command / API | LLM Required | Description |
|------|---------------|:---:|-------------|
| **Interactive** | `yaaf doctor` | ✅ | Ask questions, get code-grounded answers |
| **Daemon** | `yaaf doctor --daemon` | ✅ | Proactive background watcher (Vigil-based) |
| **Watch** | `yaaf doctor --watch` | ❌ | Lightweight `tsc --noEmit` loop (zero API cost) |

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
┌─────────────────────────────────────────────────────┐
│                   YaafDoctor                         │
│                                                     │
│  ask(question)          → Agent.run() with tools     │
│  askStream(question)    → Agent.runStream()          │
│  healthCheck()          → tsc + npm test (no LLM)    │
│  startDaemon()          → Vigil tick loop + LLM      │
│  startWatch()           → setInterval + tsc (no LLM) │
│                                                     │
│  ┌────────────────┐  ┌──────────────────────────┐   │
│  │  ErrorTracker   │  │   6 Code Intel Tools     │   │
│  │  (diff-based,   │  │   read_file              │   │
│  │   only surfaces │  │   grep_search            │   │
│  │   NEW errors)   │  │   list_dir               │   │
│  │                 │  │   run_tsc                 │   │
│  │                 │  │   run_tests               │   │
│  │                 │  │   get_project_structure   │   │
│  └─────────────────┘  └──────────────────────────┘   │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │           YAAF Framework (dogfooded)          │   │
│  │   Agent · Vigil · ContextManager · buildTool  │   │
│  │   Model Specs Registry · Error Recovery       │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

The Doctor is built entirely with YAAF's own primitives — `Agent` for interactive mode, `Vigil` for daemon mode, `buildTool()` for code intelligence, and `ContextManager` with model-aware auto-configuration. The ultimate dogfood.
