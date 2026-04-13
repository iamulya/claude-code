# YAAF — Yet Another Agentic Framework

> A production-grade, multi-provider autonomous agent framework.

Multi-provider (Gemini + OpenAI), zero framework lock-in, composable subsystems — with a pluggable memory strategy system, a full context compaction pipeline, and built-in OpenTelemetry observability.

```bash
# Works with Gemini, OpenAI, Groq, Ollama, or any OpenAI-compatible API
GEMINI_API_KEY=... npx tsx examples/travel-agent/src/main.ts --demo
OPENAI_API_KEY=sk-... npx tsx examples/travel-agent/src/main.ts --demo
```

---

## Table of Contents

- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
  - [Agent](#agent)
  - [Tools](#tools)
  - [System Prompt Builder](#system-prompt-builder)
  - [Permission Policy](#permission-policy)
  - [Lifecycle Hooks](#lifecycle-hooks)
  - [Sandbox](#sandbox)
  - [Session Persistence](#session-persistence)
  - [Secure Storage](#secure-storage)
  - [Model Router](#model-router)
  - [Team Memory](#team-memory)
  - [Skills](#skills)
  - [Plan Mode](#plan-mode)
  - [Vigil (Autonomous Mode)](#vigil-autonomous-mode)
  - [MCP Integration](#mcp-integration)
- [In-Depth Docs](#in-depth-docs)
- [Multi-Provider Support](#multi-provider-support)
- [Examples](#examples)
- [Project Structure](#project-structure)
- [Design Principles](#design-principles)

---

## Quick Start

```typescript
import { Agent, buildTool } from 'yaaf';

const greetTool = buildTool({
  name: 'greet',
  inputSchema: {
    type: 'object',
    properties: { name: { type: 'string' } },
    required: ['name'],
  },
  maxResultChars: 200,
  describe: ({ name }) => `Greet ${name}`,
  async call({ name }) {
    return { data: `Hello, ${name}! 👋` };
  },
  isReadOnly: () => true,
});

const agent = new Agent({
  name: 'Greeter',
  systemPrompt: 'You are a friendly greeter. Greet the user by name.',
  tools: [greetTool],
});

const response = await agent.run('Say hello to Alice');
console.log(response);
```

**Set one of these and you're ready:**

```bash
GEMINI_API_KEY=...         # Google Gemini (auto: gemini-2.0-flash)
OPENAI_API_KEY=sk-...      # OpenAI (auto: gpt-4o-mini)
OPENAI_API_KEY=gsk_...  \  # Groq
OPENAI_BASE_URL=https://api.groq.com/openai/v1 \
OPENAI_MODEL=llama-3.3-70b-versatile
OPENAI_API_KEY=ollama   \  # Ollama (local)
OPENAI_BASE_URL=http://localhost:11434/v1 \
OPENAI_MODEL=llama3.1
```

---

## Core Concepts

### Agent

The primary API. Wraps the LLM ↔ tool loop with automatic provider selection and all optional subsystems.

```typescript
import { Agent } from 'yaaf';

const agent = new Agent({
  name: 'MyAgent',
  systemPrompt: 'You are a helpful assistant.',
  tools: [myTools],
  provider: 'gemini',        // 'gemini' | 'openai' — or auto-detect from env
  model: 'gemini-2.0-flash',
  temperature: 0.3,
  maxTokens: 4096,
  maxIterations: 15,
});

// Async factory — resolves a SystemPromptBuilder before construction
const agent2 = await Agent.create({
  systemPromptProvider: myBuilder,
  tools: [myTools],
});

// Events — fluent chaining
agent
  .on('tool:call',    ({ name, arguments: args }) => console.log('→', name, args))
  .on('tool:result',  ({ name, durationMs })       => console.log('✓', name, durationMs + 'ms'))
  .on('tool:blocked', ({ name, reason })           => console.warn('🚫', name, reason))
  .on('llm:response', ({ content, toolCalls })     => { /* ... */ });

const response = await agent.run('Do something');
agent.reset(); // clear history
```

**AgentConfig options:**

| Option | Type | Description |
|---|---|---|
| `systemPrompt` | `string` | Static system prompt string |
| `systemPromptProvider` | `SystemPromptBuilder \| () => Promise<string>` | Async prompt (use `Agent.create()`) |
| `tools` | `Tool[]` | Available tools |
| `provider` | `'gemini' \| 'openai'` | Force provider (auto-detected if omitted) |
| `model` | `string` | Model ID override |
| `temperature` | `number` | Sampling temperature |
| `maxTokens` | `number` | Max output tokens |
| `maxIterations` | `number` | Max tool-call iterations per `run()` |
| `permissions` | `PermissionPolicy` | Tool call gating |
| `hooks` | `Hooks` | Lifecycle callbacks |
| `sandbox` | `Sandbox` | Execution sandbox |
| `session` | `Session` | Persistent conversation session |
| `planMode` | `boolean \| PlanModeConfig` | Think-first execution |
| `skills` | `Skill[]` | Markdown capability packs |
| `memoryStrategy` | `MemoryStrategy` | Pluggable long-term memory |
| `chatModel` | `ChatModel` | Bring-your-own model implementation |

---

### Tools

```typescript
import { buildTool } from 'yaaf';

const searchTool = buildTool({
  name: 'search_web',
  description: 'Search the web for information',
  inputSchema: {
    type: 'object',
    properties: {
      query:      { type: 'string' },
      maxResults: { type: 'number' },
    },
    required: ['query'],
  },
  maxResultChars: 10_000,
  describe: ({ query }) => `Search: "${query}"`,

  async call({ query, maxResults = 5 }, ctx) {
    const results = await doWebSearch(query, maxResults);
    return { data: results.join('\n') };
  },

  isReadOnly:       () => true,   // default: false
  isConcurrencySafe: () => true,  // default: false
  isDestructive:    () => false,  // default: false
});
```

`ctx` provides: `ctx.exec?.('cmd')`, `ctx.signal`, `ctx.agentName`.

---

### System Prompt Builder

Section-based, cache-aware prompt assembly.

```typescript
import { SystemPromptBuilder, defaultPromptBuilder } from 'yaaf';

const builder = new SystemPromptBuilder()
  .addStatic('identity', () => 'You are a DevOps assistant.', 0)
  .addStatic('rules',    () => '## Rules\n- Never delete prod databases', 50)
  .addWhen(
    () => process.env.DEBUG === '1',
    'debug-mode',
    () => '## Debug Mode\nVerbose reasoning enabled.',
  )
  .addDynamic('memory',    () => memStore.buildPrompt(), 'memory updates per turn', 200)
  .addDynamic('timestamp', () => `Time: ${new Date().toISOString()}`, 'time changes', 210);

const prompt = await builder.build();
```

| Cache mode | When computed | Use case |
|---|---|---|
| `session` (default) | Once, cached until `reset()` | Identity, rules |
| `turn` | Every `build()` call | Current time, live memory |
| `never` | Every call | Truly volatile state |

---

### Permission Policy

```typescript
import { PermissionPolicy, cliApproval } from 'yaaf';

const permissions = new PermissionPolicy()
  .allow('read_*')
  .allow('search_*')
  .requireApproval('write_*', 'File writes require confirmation')
  .deny('delete_*', 'Deletion is disabled by policy')
  .onRequest(cliApproval()); // interactive y/n at terminal

const agent = new Agent({ permissions, tools: [...], systemPrompt: '...' });
```

---

### Lifecycle Hooks

```typescript
import type { Hooks } from 'yaaf';

const hooks: Hooks = {
  beforeLLM: async (ctx) => {
    console.log(`Turn ${ctx.turnNumber}: ${ctx.messages.length} messages`);
    return { action: 'continue' };
  },
  beforeToolCall: async (ctx) => {
    if (ctx.toolName === 'exec' && ctx.arguments.cmd?.includes('rm -rf')) {
      return { action: 'block', reason: 'rm -rf is not allowed' };
    }
    return { action: 'continue' };
  },
  afterToolCall: async (ctx, result, error) => {
    metrics.record('tool_call', { tool: ctx.toolName, ok: !error });
    return { action: 'continue' };
  },
};
```

---

### Sandbox

```typescript
import { Sandbox, projectSandbox, strictSandbox } from 'yaaf';

const sandbox = new Sandbox({
  timeoutMs:    15_000,
  allowedPaths: [process.cwd(), '/tmp'],
  blockedPaths: ['/etc', '/usr', process.env.HOME!],
  blockNetwork: false,
});

// Convenience factories
const project = projectSandbox(); // CWD + /tmp, 30s timeout
const strict  = strictSandbox();  // CWD only, no network, 10s

agent.on('tool:sandbox-violation', ({ toolName, violation }) =>
  console.warn(`Sandbox violation: ${toolName} — ${violation}`));
```

---

### Session Persistence

```typescript
import { Agent, Session, listSessions, pruneOldSessions } from 'yaaf';

const session = await Session.resumeOrCreate('my-bot', { dir: './.sessions' });

const agent = new Agent({ session, systemPrompt: '...', tools: [...] });

await session.append([
  { role: 'user',      content: userMessage },
  { role: 'assistant', content: response },
]);

await pruneOldSessions('./.sessions', { olderThanDays: 30 });
```

---

### Secure Storage

AES-256-GCM encrypted key-value store. Zero plaintext on disk.

```typescript
import { SecureStorage } from 'yaaf';

const store = new SecureStorage({
  namespace:  'my-agent',
  storageDir: './.secrets',
  // YAAF_STORAGE_KEY=<64-char hex> for production
  // password: 'my-passphrase'  for user-specific keys
});

await store.set('openai_key', 'sk-...');
const key = await store.get('openai_key');
```

```bash
openssl rand -hex 32   # → set as YAAF_STORAGE_KEY
```

---

### Model Router

Route cheap requests to a fast model and complex requests to a capable model.

```typescript
import { RouterChatModel, GeminiChatModel } from 'yaaf';

const router = new RouterChatModel({
  fast:    new GeminiChatModel({ model: 'gemini-2.0-flash' }),
  capable: new GeminiChatModel({ model: 'gemini-2.0-pro-exp' }),
  route: (ctx) => {
    if (/architect|implement|design/i.test(ctx.messages.at(-1)?.content ?? ''))
      return 'capable';
    return 'fast';
  },
});

const { fastPercent } = router.stats();
```

Default heuristics: context > 14 msgs, tools > 6, message > 800 chars, or complexity keywords → capable.

---

### Team Memory

Multi-agent shared memory — private + team namespaces.

```typescript
import { TeamMemory } from 'yaaf';

const memory = new TeamMemory({
  sharedDir:  './.team-memory',
  privateDir: './.agent-memory',
  agentId:    'researcher-1',
});

await memory.save({ key: 'context', content: '# Project\n...', namespace: 'team' });
const results = await memory.search('API design');
const ctx     = memory.buildContext(results);
```

---

### Skills

Markdown capability packs injected into the system prompt.

```typescript
import { loadSkills, defineSkill } from 'yaaf';

const commitSkill = defineSkill({
  name:     'commit',
  content:  '# Git Commit Skill\nAlways use conventional commits format...',
  triggers: ['commit', 'git'],
});

const agent = new Agent({
  skills: [commitSkill, ...await loadSkills('./skills')],
  systemPrompt: '...',
  tools: [...],
});
```

---

### Plan Mode

Two-phase: generate a numbered plan → approve → execute.

```typescript
const agent = new Agent({
  planMode: {
    onPlan: async (plan) => {
      console.log('Plan:\n', plan);
      const answer = await askUser('Approve? [y/N]');
      return answer.toLowerCase() === 'y';
    },
  },
  systemPrompt: '...',
  tools: [...],
});
```

---

### Vigil (Autonomous Mode)

Tick-driven proactive agent. Runs continuously without user input.

```typescript
import { vigil } from 'yaaf';

const agent = vigil({
  name: 'SystemMonitor',
  systemPrompt: 'Monitor system health every tick. Alert on anomalies.',
  tools: [checkSystemTool, sendAlertTool],
  tickIntervalMs: 60_000,
  schedule: [
    { name: 'daily-digest', cron: '0 9 * * *', prompt: 'Create a daily health digest' },
  ],
  vigilDir: './.vigil',
});

await agent.start();
setTimeout(() => agent.stop(), 60 * 60 * 1000);
```

---

### MCP Integration

```typescript
import { McpPlugin, filesystemMcp } from 'yaaf';

const plugin = new McpPlugin({
  servers: [
    { name: 'filesystem', transport: 'stdio',
      command: 'npx', args: ['@modelcontextprotocol/server-filesystem', '.'] },
    { name: 'github', transport: 'stdio',
      command: 'npx', args: ['@modelcontextprotocol/server-github'],
      env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN! } },
  ],
});

const mcpTools = await plugin.connect();
const agent = new Agent({ tools: [...myTools, ...mcpTools], systemPrompt: '...' });
```

---

## In-Depth Docs

| Topic | Doc |
|---|---|
| 🧠 Memory Strategies — session notes, topic files, LLM retrieval, Honcho, custom strategies | [docs/memory.md](docs/memory.md) |
| ✂️ Context Compaction — summarize, micro-compact, sliding window, production pipeline | [docs/compaction.md](docs/compaction.md) |
| 📡 Observability — OpenTelemetry spans, metrics, logs, custom instrumentation | [docs/telemetry.md](docs/telemetry.md) |
| 🔌 Plugin Architecture — built-in plugins, writing custom adapters | [docs/plugins.md](docs/plugins.md) |

---

## Multi-Provider Support

### Gemini

```typescript
import { GeminiChatModel } from 'yaaf';

const model = new GeminiChatModel({
  apiKey: process.env.GEMINI_API_KEY!,
  model:  'gemini-2.0-flash',
});

// Vertex AI
const vertex = new GeminiChatModel({
  vertexAI: true,
  project:  'my-gcp-project',
  location: 'us-central1',
  model:    'gemini-1.5-pro',
});
```

### OpenAI + Compatible Providers

```typescript
import { OpenAIChatModel } from 'yaaf';

// OpenAI
const openai   = new OpenAIChatModel({ apiKey: process.env.OPENAI_API_KEY!, model: 'gpt-4o' });

// Groq
const groq     = new OpenAIChatModel({ apiKey: process.env.GROQ_API_KEY!, baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' });

// Ollama (local)
const ollama   = new OpenAIChatModel({ apiKey: 'ollama', baseUrl: 'http://localhost:11434/v1', model: 'llama3.1' });

// DeepSeek
const deepseek = new OpenAIChatModel({ apiKey: process.env.DEEPSEEK_API_KEY!, baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' });
```

### Bring Your Own Model

```typescript
import type { ChatModel } from 'yaaf';

class MyModel implements ChatModel {
  async complete({ messages, tools, signal }) {
    const res = await myInferenceAPI({ messages, tools });
    return {
      content:      res.text,
      toolCalls:    res.toolCalls,
      finishReason: res.done ? 'stop' : 'tool_calls',
    };
  }
}

const agent = new Agent({ chatModel: new MyModel(), tools: [...], systemPrompt: '...' });
```

---

## Examples

| Example | Features demonstrated |
|---|---|
| [travel-agent](examples/travel-agent/) | `Agent`, multi-turn REPL, tool events, Gemini + OpenAI |
| [permissions-and-hooks](examples/permissions-and-hooks/) | `PermissionPolicy`, `cliApproval()`, `Hooks`, audit log |
| [secure-storage](examples/secure-storage/) | `SecureStorage`, env/password/machine key modes |
| [session-persistence](examples/session-persistence/) | `Session.resumeOrCreate()`, crash recovery |
| [system-prompt-builder](examples/system-prompt-builder/) | `SystemPromptBuilder`, static/dynamic sections |
| [model-router](examples/model-router/) | `RouterChatModel`, custom routing, `router.stats()` |
| [plan-mode](examples/plan-mode/) | `planMode`, `onPlan` approval gate |
| [vigil-autonomous](examples/vigil-autonomous/) | `vigil()`, tick loop, cron schedule |

```bash
cd examples/<example-name>
GEMINI_API_KEY=...    npx tsx src/main.ts
OPENAI_API_KEY=sk-... npx tsx src/main.ts

# No API key needed
cd examples/secure-storage    && npx tsx src/main.ts
cd examples/session-persistence && npx tsx src/main.ts

# Specific flags
cd examples/plan-mode        && GEMINI_API_KEY=... npx tsx src/main.ts --auto
cd examples/vigil-autonomous && GEMINI_API_KEY=... npx tsx src/main.ts --duration=30
cd examples/travel-agent     && GEMINI_API_KEY=... npx tsx src/main.ts --demo
```

---

## Project Structure

```
yaaf/
├── src/
│   ├── index.ts              # Public API entry point
│   ├── agent.ts              # Agent — primary user API
│   ├── agents/
│   │   ├── runner.ts         # AgentRunner: LLM ↔ tool loop + hooks + OTel
│   │   ├── orchestrator.ts   # Multi-agent spawning
│   │   ├── mailbox.ts        # File-based IPC messaging
│   │   └── taskManager.ts    # Task lifecycle FSM
│   ├── models/
│   │   ├── gemini.ts         # GeminiChatModel
│   │   ├── openai.ts         # OpenAIChatModel
│   │   └── router.ts         # RouterChatModel
│   ├── prompt/
│   │   └── systemPrompt.ts   # SystemPromptBuilder
│   ├── memory/
│   │   ├── memoryStore.ts    # File-based memory (4-type taxonomy)
│   │   ├── strategies.ts     # Pluggable memory strategies (7 built-in)
│   │   ├── teamMemory.ts     # Multi-agent shared memory
│   │   └── relevance.ts      # LLM-powered memory selection
│   ├── context/
│   │   ├── contextManager.ts # Token budgeting + compaction trigger
│   │   └── strategies.ts     # Pluggable compaction strategies (7 built-in)
│   ├── telemetry/
│   │   ├── telemetry.ts      # OTel provider init (traces, metrics, logs)
│   │   ├── tracing.ts        # Span API: agent.run / llm.request / tool.call
│   │   └── attributes.ts     # Common span attribute helpers
│   ├── storage/
│   │   └── secureStorage.ts  # AES-256-GCM encrypted KV store
│   ├── permissions.ts        # PermissionPolicy
│   ├── hooks.ts              # Lifecycle hooks
│   ├── sandbox.ts            # Execution sandbox
│   ├── session.ts            # Session persistence
│   ├── skills.ts             # Skill injection
│   ├── vigil.ts              # Autonomous tick-driven agent
│   ├── plugin/
│   │   └── types.ts          # Adapter interfaces + PluginHost
│   ├── integrations/
│   │   ├── honcho.ts         # HonchoPlugin: cloud memory
│   │   ├── agentfs.ts        # AgentFSPlugin: virtual filesystem
│   │   ├── camoufox.ts       # CamoufoxPlugin: anti-detect browser
│   │   └── mcp.ts            # McpPlugin: Model Context Protocol
│   └── utils/
│       ├── logger.ts         # Structured logging
│       ├── retry.ts          # Exponential backoff
│       └── tokens.ts         # Token estimation
├── docs/
│   ├── memory.md             # Memory strategy system (full reference)
│   ├── compaction.md         # Context compaction (full reference)
│   ├── telemetry.md          # OpenTelemetry integration
│   └── plugins.md            # Plugin & adapter architecture
├── examples/
│   ├── travel-agent/
│   ├── permissions-and-hooks/
│   ├── secure-storage/
│   ├── session-persistence/
│   ├── system-prompt-builder/
│   ├── model-router/
│   ├── plan-mode/
│   └── vigil-autonomous/
├── package.json
├── tsconfig.json
└── README.md
```

---

## Design Principles

1. **Fail-Closed Safety** — permissions default to deny; tools are write-capable and permission-gated by default. Opt *in* to dangerous flags.
2. **Async-First** — every I/O subsystem is async. `Agent.create()` handles prompt resolution and session loading before construction.
3. **Prompt Cache Awareness** — `SystemPromptBuilder` separates static (session-cached) from dynamic (per-turn) sections to prevent accidental cache-busting.
4. **Context is Finite** — `ContextManager` actively manages the token budget with a pluggable compaction pipeline. You choose the cost/quality trade-off.
5. **Memory is Composable** — extraction (when/how to persist) and retrieval (what to inject) are separate, independent interfaces. Mix strategies freely.
6. **Agents Are Independent** — swarm workers get their own `AbortController` and state; they communicate only through the mailbox. A crashed worker cannot take down the leader.
7. **Plugin-First Extensibility** — every external capability (memory, browser, filesystem, OTel backends) is a typed adapter interface. No coupling to any specific vendor.
8. **Observable by Default** — every major action emits both a typed event and an OpenTelemetry span. No monkey-patching required to instrument behavior.

---

## License

MIT
