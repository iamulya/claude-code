# YAAF — Yet Another Agentic Framework

> A production-grade, security-hardened, multi-provider autonomous agent framework for TypeScript.

Zero runtime dependencies. Multi-provider (Gemini, OpenAI, Anthropic, Groq, Ollama). OWASP LLM Top 10 aligned. Ship agents as CLIs, web APIs, edge functions, or chat bots — all from one codebase. Compile your knowledge into a self-healing, LLM-readable wiki.

```bash
npm install yaaf
```

---

## Quick Start

```typescript
import { Agent, buildTool } from 'yaaf';

const searchTool = buildTool({
  name: 'search',
  description: 'Search the web',
  inputSchema: {
    type: 'object',
    properties: { query: { type: 'string' } },
    required: ['query'],
  },
  async call({ query }) {
    return { data: await fetchResults(query) };
  },
});

const agent = new Agent({
  systemPrompt: 'You are a helpful research assistant.',
  tools: [searchTool],
});

// Batch
const response = await agent.run('What is quantum computing?');

// Streaming
for await (const event of agent.runStream('Explain relativity')) {
  if (event.type === 'text_delta') process.stdout.write(event.content);
}
```

**Set one API key and go:**

```bash
export GEMINI_API_KEY=...           # → Gemini 2.5 Flash
export ANTHROPIC_API_KEY=sk-ant-... # → Claude Sonnet
export OPENAI_API_KEY=sk-...        # → GPT-4o

# Any OpenAI-compatible endpoint
export LLM_BASE_URL=http://localhost:11434/v1
export LLM_MODEL=qwen2.5:72b
```

---

## Design Principles

YAAF is built around eleven principles that inform every architectural decision:

1. **Zero Runtime Dependencies** — The core framework ships nothing but TypeScript. Optional features (Ink, OpenTelemetry, HTML parsing) are peer dependencies. Nothing is pulled in without explicit opt-in.

2. **Secure by Default** — `security: true` enables OWASP-aligned protection with one line. Permissions default to deny. Tools are permission-gated by default. All security hooks fail closed — a broken guard blocks the LLM call, never silently passes through.

3. **Ship Anywhere** — One agent, multiple delivery targets. Write once, deploy as a CLI, HTTP API, edge function, terminal UI, or chat bot. The `Agent` class knows nothing about how it's served.

4. **Streaming First** — Every runtime supports streaming with a unified `RuntimeStreamEvent` type. The internal `RunnerStreamEvent` is adapted per-runtime so streaming works identically across CLI, server, worker, and WebSocket contexts.

5. **Memory is Composable** — Extraction (when to persist) and retrieval (what to inject) are independent interfaces. Seven built-in strategies can be mixed, extended, or replaced. Team memory enables cross-agent knowledge sharing.

6. **Context is Finite** — `ContextManager` actively manages token budgets with seven pluggable compaction strategies. The system prompt, tools, memory, and conversation history compete for a fixed token budget. Every agentic loop negotiates this budget, not the user.

7. **Observable by Default** — Every action emits typed `RunnerEvents` (22 event types) and OpenTelemetry spans. The built-in Doctor agent watches all of them and diagnoses failures in real time.

8. **Defense in Depth** — Three security layers (input → execution → output) with eleven composable modules, centralized audit logging, and per-user rate limiting. AI-specific threats (prompt injection, hallucination, data exfiltration) are first-class concerns with dedicated defenses.

9. **Identity-Aware** — Built-in RBAC + ABAC authorization with data scoping ensures agents only access what users are permitted to see. Every tool call carries a user identity, and every access decision is auditable.

10. **Plugin-First** — External capabilities are typed adapter interfaces. No vendor coupling. Plugin integrity is verified via `TrustPolicy` with SHA-256 hashes and semver constraints.

11. **Compiled Knowledge** — Instead of RAG, YAAF compiles raw sources into a structured, cross-linked, self-healing wiki. The knowledge base is human-readable, diffable, and directly consumable as agent context.

---

## Architecture

YAAF is structured as a layered stack. Each layer depends only on the layers below it. The boundaries are enforced by TypeScript's module system and the subpackage map.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Delivery Runtimes                            │
│   createCLI()    createServer()    createWorker()    createInkCLI() │
│   yaaf/cli-runtime   yaaf/server     yaaf/worker      yaaf/cli-ink │
├─────────────────────────────────────────────────────────────────────┤
│                        Dev UI (yaaf/server)                         │
│   Self-contained HTML dashboard · SSE streaming · Inspector panel   │
│   LLM Turns timeline · Token usage · Dark mode · Markdown renderer  │
├─────────────────────────────────────────────────────────────────────┤
│                     Remote & Interop Layer                           │
│   RemoteSessionServer (yaaf/remote)     A2A Server/Client           │
│   WebSocket (RFC 6455) + HTTP fallback  Agent Cards + JSON-RPC 2.0  │
├─────────────────────────────────────────────────────────────────────┤
│                       Stream Adapter                                 │
│         adaptStream()  ←  RunnerStreamEvent → RuntimeStreamEvent    │
├─────────────────────────────────────────────────────────────────────┤
│                        Agent (high-level)                           │
│   run() / runStream() / events / hooks / permissions / sandbox      │
│   security: true  ·  toolResultBoundaries  ·  accessPolicy          │
├────────────────────┬───────────────────────────────────┬────────────┤
│   AgentRunner      │     Memory                        │  Context   │
│   LLM ↔ Tool loop  │     MemoryStore + 7 strategies    │  Manager + │
│   Streaming        │     TeamMemory (multi-agent)      │  7 compact │
│   Retry + backoff  │     Relevance scoring             │  strategies│
├────────────────────┼───────────────────────────────────┼────────────┤
│   Tools            │     Models                        │  Plugins   │
│   buildTool()      │     GeminiChatModel               │  MCP +     │
│   OpenAPIToolset   │     OpenAIChatModel               │  MCP OAuth │
│   ToolLoopDetector │     AnthropicChatModel            │  Honcho    │
│   Schema validation│     RouterChatModel               │  AgentFS   │
│                    │     BYO ChatModel interface       │  Camoufox  │
├────────────────────┴───────────────────────────────────┴────────────┤
│  Skills · Permissions · Hooks · Sandbox · Session · SecureStorage   │
│  SystemPromptBuilder · ContextEngine · Vigil · Heartbeat · Gateway  │
│  Doctor (built-in expert agent) · Model Specs Registry              │
├─────────────────────────────────────────────────────────────────────┤
│                    Knowledge Base (yaaf/knowledge)                   │
│  KBCompiler · ConceptExtractor · KnowledgeSynthesizer · KBLinter    │
│  Ingester (md/html/txt/json/code) · KBClipper · OntologyLoader      │
│  13 lint checks · auto-fix · wikilink graph · .kb-registry.json     │
├─────────────────────────────────────────────────────────────────────┤
│                      Security & IAM                                  │
│  PromptGuard · OutputSanitizer · PiiRedactor · InputAnomalyDetector  │
│  TrustPolicy · GroundingValidator · PerUserRateLimiter               │
│  StructuredOutputValidator · SecurityAuditLog · RBAC/ABAC · Scoping  │
├─────────────────────────────────────────────────────────────────────┤
│                       OpenTelemetry                                  │
│              Traces · Metrics · Logs · Cost tracking                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Key architectural invariants

- **The `Agent` class is a facade.** All execution happens inside `AgentRunner`, which drives the LLM ↔ tool loop, manages retry/backoff, enforces guardrails, and emits events. The `Agent` adds lifecycle management (sessions, memory, context, security hooks) around the runner.

- **Hooks intercept, events observe.** Hooks (`beforeLLM`, `afterLLM`, `beforeToolCall`, `afterToolCall`) can block, modify, or short-circuit execution. Events (`RunnerEvents`) are read-only. Security features are implemented as hooks, not events — a broken security hook *blocks* execution (fail-closed).

- **Every tool call goes through the permission system.** If a `PermissionPolicy` is set, every tool invocation checks `canCallTool()` before execution. Default: deny. The IAM layer adds role/attribute/scope checks on top.

- **Sandbox isolation is tiered.** Four tiers: `'inline'` (same process), `'worker'` (worker thread with restricted APIs), `'external'` (Firecracker microVM with kernel-level isolation on Linux), and plugin-based external backends. The `createSandboxTool()` helper validates function serializability at definition time.

---

## Security — Defense in Depth

YAAF ships 11 security modules across 3 defense layers, all zero-dependency.

### One-Line Security

```typescript
const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
  tools: [myTools],
  security: true,                 // PromptGuard + OutputSanitizer + PiiRedactor
  toolResultBoundaries: true,     // wraps tool outputs in safe delimiters
});
```

### Hardened Mode

```typescript
import { hardenedSecurityHooks, hardenedRunnerDefaults } from 'yaaf';

const agent = new Agent({
  ...hardenedRunnerDefaults(),    // reservedTokens: 512, toolResultBoundaries: true
  systemPrompt: '...',
  hooks: hardenedSecurityHooks(), // detectPromptInjection: true, blockOnInjection: true
});
```

### Security Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                  LAYER 1: INPUT PROTECTION                    │
│  PromptGuard (15+ injection patterns, block / detect modes)   │
│  InputAnomalyDetector (entropy, repetition, length)           │
│  PiiRedactor (input direction, 9 categories, NER scorer)      │
├───────────────────────────────────────────────────────────────┤
│                LAYER 2: EXECUTION SAFETY                      │
│  TrustPolicy (SHA-256 hashes, semver, MCP tool allowlists)   │
│  Tool Result Boundaries (indirect injection defense)          │
│  PerUserRateLimiter (identity-scoped usage budgets)           │
│  Sandbox (inline / worker / Firecracker microVM)              │
├───────────────────────────────────────────────────────────────┤
│                 LAYER 3: OUTPUT PROTECTION                    │
│  OutputSanitizer (XSS, structural injection detection, HTML)  │
│  GroundingValidator (keyword + embedding + LLM scoring)       │
│  StructuredOutputValidator (JSON schema, URL allowlists)      │
├───────────────────────────────────────────────────────────────┤
│    SecurityAuditLog — centralized NDJSON, SIEM-compatible     │
└───────────────────────────────────────────────────────────────┘
```

**Fail-closed by design:** Every security hook (PromptGuard, PiiRedactor, OutputSanitizer) blocks execution if the hook itself throws. A broken security module never silently passes through.

**Token budget protection:** `reservedTokens` guarantees headroom for system prompt growth. A `context:budget-warning` event fires when prompt tokens approach the effective limit.

**Context-aware PII:** Code blocks (fenced and inline) are exempt from PII scanning. Custom exempt patterns and domain allowlists reduce false positives. External NER models can be plugged in via `nerScorer` for name/location detection.

**Anti-hallucination:** `GroundingValidator` uses a three-layer scoring pipeline — keyword overlap (free), embedding cosine similarity (via `embedFn`), and LLM semantic scoring (via `llmScorer`) — cheapest-first escalation.

**[Full security documentation →](docs/security.md)**

---

## Memory System

Seven built-in strategies that separate *when to persist* from *what to inject*:

```typescript
const agent = new Agent({
  systemPrompt: '...',
  memory: {
    store: new MemoryStore(),
    extraction: 'summary',       // or: 'full', 'selective', 'entity', 'custom'
    retrieval: 'recent',         // or: 'relevant', 'sliding_window', 'custom'
  },
});
```

| Strategy | Extraction | Retrieval | Best for |
|----------|------------|-----------|----------|
| Full transcript | Everything | Recent N | Short conversations |
| Summary | LLM-distilled | Relevant | Long-running sessions |
| Selective | User-marked | Sliding window | Complex multi-turn |
| Entity | Named entities | By entity | Knowledge-heavy agents |
| Team memory | Cross-agent shared store | By relevance | Multi-agent systems |

**`TeamMemory`** enables agents to share knowledge across a swarm. Each agent reads and writes to a shared store. Relevance scoring ensures agents only retrieve knowledge that pertains to their current task.

**[Full memory documentation →](docs/memory.md)**

---

## Context Management

The model has a finite context window. YAAF manages it proactively:

```typescript
const agent = new Agent({
  systemPrompt: '...',
  contextManager: 'auto',  // automatic compaction when nearing the limit
});
```

Seven compaction strategies:

| Strategy | How it works | Best for |
|----------|-------------|----------|
| `summary` | LLM-summarizes older messages | General use |
| `sliding_window` | Drops oldest messages | Fast, low-cost |
| `selective` | Keeps high-relevance turns | Research workflows |
| `token_budget` | Trims to a hard limit | Predictable costs |
| `priority` | Keeps system + recent + high-value | Complex agents |
| `hybrid` | Combines multiple strategies | Production systems |
| `auto` | Picks the best strategy per model | Default recommended |

**`reservedTokens`** in `AgentRunner` protects the output token space from system prompt growth. When memory injections, tool boundary strings, or context overrides expand the prompt, reserved tokens ensure the model still has room to respond.

**[Full compaction documentation →](docs/compaction.md)**

---

## Delivery Runtimes

One agent, four ways to ship:

```typescript
import { Agent } from 'yaaf';
import { createCLI } from 'yaaf/cli-runtime';
import { createServer } from 'yaaf/server';
import { createWorker } from 'yaaf/worker';
import { createInkCLI } from 'yaaf/cli-ink';

const agent = new Agent({ systemPrompt: '...', tools: [...] });

// 1. Terminal REPL
createCLI(agent);

// 2. HTTP API with Dev UI
const handle = await createServer(agent, { port: 3456, devUi: true });

// 3. Edge function (Cloudflare Workers, Vercel Edge, Deno)
export default createWorker(agent);

// 4. Premium terminal UI (React + Ink)
createInkCLI(agent);
```

### Dev UI — Interactive Browser Dashboard

Enable `devUi: true` on `createServer()` to get a full browser dashboard:

- **Chat interface** — streaming markdown with syntax highlighting, tables, code blocks
- **Inspector panel** — live latency (TTFT + total), token usage, tool call timeline
- **LLM Turns timeline** — collapsible input/output view for every agentic loop iteration
- **Settings drawer** — dark mode, multi-turn, conversation persistence
- **Responsive** — mobile-friendly with bottom-sheet inspector

The Dev UI is served as a single self-contained HTML page. CSS and JS live in standalone files, read via `readFileSync` and inlined at startup — no bundler, no CDN, no external dependencies.

### Remote Sessions — WebSocket Agent Serving

```typescript
import { RemoteSessionServer } from 'yaaf/remote';

const server = new RemoteSessionServer(myAgent, {
  port: 8080,
  maxSessions: 100,
  sessionTimeoutMs: 30 * 60_000,
});

await server.start();
// HTTP:      POST http://localhost:8080/chat
// WebSocket: ws://localhost:8080/ws
// Sessions:  GET  http://localhost:8080/sessions
```

Zero-dependency WebSocket implementation (RFC 6455 built-in — no `ws` package).

---

## Knowledge Base — Compile Your Knowledge

A [Karpathy-style](https://docs.yaaf.dev/knowledge-base) "compile your knowledge" pipeline. Raw source material (research papers, web clips, docs, code) is compiled by an LLM into a structured, cross-linked wiki. A self-healing linter keeps the KB consistent.

This is a fundamentally different alternative to RAG. Instead of embedding chunks and retrieving at query time, the LLM **authors** encyclopedia-style articles with explicit wikilinks.

```
raw/ (your source material)
  research papers, web clips, docs, code, notes
        │
        ▼
  Stage 1: Ingester — .md / .html / .txt / .json / code
        │
        ▼
  Stage 2: Concept Extractor — fast LLM (extraction model)
           vocabulary scan + entity classification → CompilationPlan
        │
        ▼
  Stage 3: Knowledge Synthesizer — capable LLM (synthesis model)
           authors encyclopedia-style articles → compiled/**/*.md
        │
        ▼
  Stage 4: Linter — 13 static checks, no LLM
           structural · linking · quality → auto-fix + LintReport
        │
        ▼
compiled/ (structured, LLM-ready wiki)
  concepts/ · tools/ · research-papers/ · ...
```

```typescript
import { KBCompiler } from 'yaaf/knowledge';

const compiler = await KBCompiler.create({
  kbDir: './my-kb',
  extractionModel: extractionFn,
  synthesisModel: synthesisFn,
});

const result = await compiler.compile({
  incrementalMode: true,
  autoLint: true,
  autoFix: true,
});

// Give an agent access to the compiled KB
import { Agent, KBStore, createKBTools } from 'yaaf';

const store = new KBStore('./my-kb');
await store.load();

const agent = new Agent({
  systemPrompt: 'You are an expert on my project.',
  tools: createKBTools(store),  // search_kb, read_kb, list_kb_index
});
```

**[Full Knowledge Base documentation →](docs/knowledge-base.md)**

---

## IAM — Identity & Access Management

Built-in RBAC, ABAC, multi-tenant data scoping, and audit logging:

```typescript
import { Agent, rbac, abac, TenantScopeStrategy } from 'yaaf';

const agent = new Agent({
  systemPrompt: '...',
  tools: [invoiceTool, reportTool, adminTool],
  accessPolicy: {
    authorization: rbac({
      viewer: ['search_*', 'read_*'],
      editor: ['search_*', 'read_*', 'write_*'],
      admin: ['*'],
    }),
    dataScope: new TenantScopeStrategy({ field: 'tenantId' }),
    onDecision: (event) => auditLog.write(event),
  },
});

// Each run carries user identity
const result = await agent.run('Show my invoices', {
  user: {
    userId: 'alice-123',
    roles: ['editor'],
    attributes: { tenantId: 'acme', department: 'finance' },
  },
});
```

---

## Multi-Agent Systems

### Orchestrator Pattern

```typescript
import { Agent, AgentOrchestrator } from 'yaaf';

const researcher = new Agent({ systemPrompt: 'You research topics...' });
const writer = new Agent({ systemPrompt: 'You write articles...' });
const editor = new Agent({ systemPrompt: 'You edit for quality...' });

const orchestrator = new AgentOrchestrator({
  delegates: { researcher, writer, editor },
  route: (task) => task.type === 'research' ? 'researcher' : 'writer',
});
```

### Swarm Pattern — Mailbox IPC

```typescript
import { Agent, MailboxIPC } from 'yaaf';

const ipc = new MailboxIPC();
const analyst = new Agent({ systemPrompt: '...', ipc });
const strategist = new Agent({ systemPrompt: '...', ipc });

// Agents send messages peer-to-peer
analyst.send('strategist', { type: 'insight', data: '...' });
```

**[Full multi-agent documentation →](docs/multi-agent.md)**

---

## Interoperability

### A2A — Cross-Framework Agent Communication

Expose any YAAF agent as an [A2A](https://a2a-protocol.org) server, or call remote agents from any framework:

```typescript
import { Agent, serveA2A, a2aTool } from 'yaaf';

// Expose as A2A server
await serveA2A(myAgent, {
  name: 'Weather Specialist',
  skills: [{ id: 'weather', name: 'Weather Lookup' }],
  port: 4100,
});
// Agent Card at: http://localhost:4100/.well-known/agent.json

// Call any remote A2A agent as a tool (one-liner)
const weatherTool = a2aTool('https://weather-agent.example.com');
```

### MCP — Model Context Protocol

Connect to MCP-compatible servers and expose their tools as native YAAF tools:

```typescript
import { McpPlugin } from 'yaaf';

const mcp = new McpPlugin({
  servers: [
    { name: 'filesystem', type: 'stdio',
      command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', '.'] },
    { name: 'github', type: 'sse',
      url: 'https://mcp.github.com',
      auth: { type: 'bearer', token: process.env.GITHUB_TOKEN! },
      reconnect: { enabled: true, maxAttempts: 5 },
      toolTimeoutMs: 60_000,
    },
  ],
});
```

SSE connections auto-reconnect with exponential backoff and jitter. Circuit breaker state is atomically persisted to disk across process restarts. Per-server tool timeouts ensure slow APIs don't block fast ones.

### OpenAPI → Tools

```typescript
import { OpenAPIToolset } from 'yaaf';

const toolset = OpenAPIToolset.fromSpec(mySpec);
const agent = new Agent({ tools: toolset.tools });
```

---

## Sandbox — Tiered Execution Isolation

Tool execution is isolated through four tiers:

| Tier | Isolation | Use case |
|------|-----------|----------|
| `'inline'` | Same process, path restrictions | Development, trusted tools |
| `'worker'` | Worker thread, restricted APIs | Production Node.js |
| `'external'` | Firecracker microVM, kernel namespaces | High-security Linux |
| Plugin backend | Custom isolation (Docker, gVisor, etc.) | Platform-specific |

```typescript
import { createSandboxTool } from 'yaaf';

// Validated at definition time — not cryptically at runtime
const safeTool = createSandboxTool(async (args) => {
  const { readFile } = await import('node:fs/promises');
  return readFile(args.path, 'utf8');
});
```

`createSandboxTool()` performs a heuristic serialization check at definition time. Functions that close over module-scope state (database connections, API clients) are caught immediately with a clear error message instead of failing opaquely in worker/external modes.

---

## YAAF Doctor — Built-in Diagnostic Agent

Every YAAF agent ships with a built-in diagnostic agent. No extra install, no extra code.

```typescript
const agent = new Agent({
  tools: [myTools],
  doctor: true,   // watches for runtime errors, diagnoses automatically
});
```

Or one env var (zero code changes):
```bash
YAAF_DOCTOR=1 npx tsx src/main.ts
```

The Doctor subscribes to **16 event types** across every subsystem:

| Subsystem | Events watched |
|-----------|---------------|
| **Tools** | `tool:error` · `tool:blocked` · `tool:sandbox-violation` · `tool:validation-failed` · `tool:loop-detected` |
| **LLM** | `llm:retry` · `llm:empty-response` |
| **Context** | `context:overflow-recovery` · `context:output-continuation` · `context:compaction-triggered` · `context:budget-warning` · `iteration` |
| **Hooks & Guardrails** | `hook:error` · `hook:blocked` · `guardrail:warning` · `guardrail:blocked` |

When something fails, the Doctor uses its own LLM call to diagnose the root cause and log a fix — including code suggestions. Cascading errors are batched into a single diagnosis call.

```bash
npx yaaf doctor                 # Interactive REPL
npx yaaf doctor --daemon        # Periodic tsc + test watcher
npx yaaf doctor --watch         # Lightweight tsc loop (no LLM)
```

**[Full Doctor documentation →](docs/doctor.md)**

---

## Observability

Built-in OpenTelemetry integration for production monitoring:

```typescript
const agent = new Agent({
  systemPrompt: '...',
  telemetry: true,
});
```

- **Traces** — Span per LLM call, tool invocation, security hook, and compaction operation
- **Metrics** — Token usage, cost tracking, latency percentiles, cache hit rates
- **Logs** — Structured log events forwarded to any ObservabilityAdapter plugin
- **22 typed events** — Every agent action emits a typed `RunnerEvent` for custom monitoring

**[Full observability documentation →](docs/telemetry.md)**

---

## Multi-Provider Support

```typescript
import { GeminiChatModel, OpenAIChatModel, AnthropicChatModel, RouterChatModel } from 'yaaf';

// Native providers
const gemini = new GeminiChatModel({ model: 'gemini-2.5-flash' });
const openai = new OpenAIChatModel({ model: 'gpt-4o' });
const claude = new AnthropicChatModel({ model: 'claude-sonnet-4' });

// Any OpenAI-compatible endpoint
const ollama = new OpenAIChatModel({
  baseUrl: 'http://localhost:11434/v1',
  model: 'llama3.1',
});

// Smart routing — cheap requests → fast model, complex → capable
const router = new RouterChatModel({
  fast: ollama,
  capable: claude,
  route: (ctx) => ctx.messages.length > 10 ? 'capable' : 'fast',
});
```

Supported out of the box: **Gemini**, **OpenAI**, **Anthropic**, **Groq**, **Ollama**, **Qwen** (DashScope / Ollama), **GLM** (Zhipu AI), **DeepSeek**, and any OpenAI-compatible endpoint. The model specs registry contains context window sizes, pricing, and capability flags for 40+ models.

---

## Subpackage Map

YAAF uses opt-in subpackages to keep the core zero-dep:

```typescript
// Core (zero dependencies)
import { Agent, buildTool, MemoryStore, ContextManager } from 'yaaf';

// Security (zero dependencies — included in core)
import {
  PromptGuard, OutputSanitizer, PiiRedactor,
  GroundingValidator, PerUserRateLimiter, SecurityAuditLog,
  securityHooks, hardenedSecurityHooks, hardenedRunnerDefaults,
} from 'yaaf';

// IAM (zero dependencies — included in core)
import { rbac, abac, TenantScopeStrategy } from 'yaaf';

// AgentThread — stateless reducer / human-in-the-loop (zero deps)
import { createThread, forkThread, serializeThread } from 'yaaf';

// A2A — cross-framework agent interop (zero deps)
import { A2AClient, A2AServer, serveA2A, a2aTool } from 'yaaf';

// MCP OAuth — authenticated MCP server connections (zero deps)
import { McpOAuthClient, FileTokenStore, oauthMcpServer } from 'yaaf';

// OpenAPI — auto-generate tools from specs (zero deps)
import { OpenAPIToolset } from 'yaaf';

// Sandbox helpers (zero deps)
import { Sandbox, createSandboxTool, isSerializableFn } from 'yaaf';

// Knowledge Base (optional: readability, jsdom, turndown for HTML)
import {
  KBCompiler, KBStore, createKBTools,
  ConceptExtractor, KnowledgeSynthesizer, KBLinter,
} from 'yaaf/knowledge';

// Remote sessions — WebSocket/HTTP agent serving (zero deps)
import { RemoteSessionServer, startRemoteServer } from 'yaaf/remote';

// Gateway — channels, soul, approvals (zero deps)
import { Gateway, Soul, ApprovalManager } from 'yaaf/gateway';

// CLI runtime — readline-based (zero deps)
import { createCLI } from 'yaaf/cli-runtime';

// Premium CLI — Ink/React terminal UI (requires: ink, react)
import { createInkCLI } from 'yaaf/cli-ink';

// HTTP server with Dev UI (zero deps — uses node:http)
import { createServer } from 'yaaf/server';

// Edge/worker (zero deps — uses Web Fetch API)
import { createWorker } from 'yaaf/worker';
```

---

## Examples

| Example | Features |
|---------|----------|
| [**playground**](examples/playground/) | Interactive Dev UI, 5 real tools, `createServer()`, `devUi: true` |
| [**skills**](examples/skills/) | `loadSkills()`, `defineSkill()`, `SkillRegistry`, hot-reload, opt-in activation |
| [knowledge-base](examples/knowledge-base/) | `KBCompiler`, ontology authoring, web clipping, lint + auto-fix |
| [human-in-the-loop](examples/human-in-the-loop/) | `agent.step()`, `agent.resume()`, durable pause/resume |
| [a2a-interop](examples/a2a-interop/) | A2A protocol, cross-framework communication |
| [remote-sessions](examples/remote-sessions/) | WebSocket server, HTTP chat, session persistence |
| [mcp-oauth](examples/mcp-oauth/) | OAuth 2.0 (PKCE + Client Credentials), token persistence |
| [openapi-tools](examples/openapi-tools/) | `OpenAPIToolset`, auto-generated tools from OpenAPI specs |
| [multi-agent-workflow](examples/multi-agent-workflow/) | Orchestrator, delegates, multi-agent pipeline |
| [agent-swarm](examples/agent-swarm/) | Mailbox IPC, peer-to-peer swarm communication |
| [iam-multi-tenant](examples/iam-multi-tenant/) | RBAC, ABAC, tenant scoping, IAM policies |
| [deep-research](examples/deep-research/) | Multi-step research, context assembly, structured synthesis |
| [identity-sessions](examples/identity-sessions/) | JWT/OIDC sessions, authenticated agents |
| [doctor-diagnostics](examples/doctor-diagnostics/) | Auto-diagnosis, 16-event watch, error batching |
| [streaming-agent](examples/streaming-agent/) | `runStream()`, text_delta events, streaming UX |
| [structured-output](examples/structured-output/) | JSON schema output, structured data extraction |
| [memory-agent](examples/memory-agent/) | Memory strategies, extraction + retrieval |
| [guardrails-and-cost](examples/guardrails-and-cost/) | Cost tracking, guardrails, token budgets |
| [permissions-and-hooks](examples/permissions-and-hooks/) | `PermissionPolicy`, hooks, audit log |
| [model-router](examples/model-router/) | `RouterChatModel`, custom routing |
| [plan-mode](examples/plan-mode/) | `planMode`, `onPlan` approval gate |
| [vigil-autonomous](examples/vigil-autonomous/) | `vigil()`, tick loop, cron schedule |

```bash
cd examples/<example-name>
npm install
GEMINI_API_KEY=... npx tsx src/index.ts
```

---

## YAAF Expert Agent

`yaaf-agent/` is a self-referential agent built **with** YAAF, **for** YAAF developers. It ships a pre-compiled Knowledge Base of 900+ articles covering every API, subsystem, and guide, served through the Dev UI.

```bash
npm install -g yaaf-agent
yaaf-agent
# → http://localhost:3001  (Dev UI with streaming chat + tool inspector)
```

**[Full yaaf-agent documentation →](yaaf-agent/README.md)**

---

## Documentation

### Getting Started

| Doc | Description |
|-----|-------------|
| [Getting Started](docs/getting-started.md) | Installation, first agent, CLI commands, project structure |
| [Agent](docs/agent.md) | `Agent` class API, config, events, streaming, factory methods |
| [Tools](docs/tools.md) | `buildTool()`, schemas, permissions, context, validation |

### Core Systems

| Doc | Description |
|-----|-------------|
| [Memory Strategies](docs/memory.md) | 7 built-in memory strategies, extraction + retrieval |
| [Context Compaction](docs/compaction.md) | 7 compaction strategies, production pipelines |
| [Permissions & Hooks](docs/permissions.md) | `PermissionPolicy`, `Hooks`, `cliApproval()` |
| [System Prompts](docs/prompts.md) | `SystemPromptBuilder`, `ContextEngine`, `Soul` |
| [**Knowledge Base**](docs/knowledge-base.md) | Compile raw sources into a self-healing LLM-ready wiki |

### Security & IAM

| Doc | Description |
|-----|-------------|
| [Security](docs/security.md) | OWASP LLM alignment, 11 security modules, audit log |
| [IAM](docs/iam.md) | RBAC, ABAC, tenant scoping, identity providers, audit |

### Delivery & Deployment

| Doc | Description |
|-----|-------------|
| [CLI Runtime](docs/cli-runtime.md) | `createCLI()`, `createInkCLI()`, slash commands, streaming |
| [Server Runtime](docs/server-runtime.md) | `createServer()`, REST API, SSE streaming, Dev UI |
| [Worker Runtime](docs/worker-runtime.md) | `createWorker()`, Cloudflare Workers, Vercel Edge, Deno |
| [Gateway & Channels](docs/gateway.md) | Multi-channel transport, Telegram, Slack, Discord |

### Advanced

| Doc | Description |
|-----|-------------|
| [Multi-Agent](docs/multi-agent.md) | Orchestrator, Mailbox IPC, AgentRouter, delegates |
| [Human-in-the-Loop](docs/human-in-the-loop.md) | `agent.step()`, `agent.resume()`, `AgentThread`, durable pause/resume |
| [YAAF Doctor](docs/doctor.md) | Built-in diagnostic agent, 16-event live watch, daemon mode |
| [Observability](docs/telemetry.md) | OpenTelemetry spans, metrics, logs, cost tracking |
| [Plugins](docs/plugins.md) | Plugin architecture, MCP, Honcho, AgentFS, Camoufox |

### Interoperability

| Doc | Description |
|-----|-------------|
| [A2A Protocol](docs/a2a.md) | Cross-framework agent communication (JSON-RPC 2.0, Agent Cards) |
| [Remote Sessions](docs/remote-sessions.md) | WebSocket + HTTP server for distributed agent serving |
| [MCP OAuth](docs/mcp-oauth.md) | OAuth 2.0 (PKCE + Client Credentials) for MCP servers |
| [OpenAPI Toolset](docs/openapi.md) | Auto-generate tools from OpenAPI 3.x specs |

---

## Testing

```bash
npm test          # Run all tests (vitest)
npm run build     # TypeScript compile + copy Dev UI assets
```

1,482 tests across 56 test files. Zero failures. Comprehensive coverage of security modules, IAM, context management, memory strategies, MCP integration, sandbox isolation, and all delivery runtimes.

---

## License

MIT
