# Agent API

The `Agent` class is the primary entry point for building agents. It wraps the LLM ↔ Tool execution loop with automatic provider selection, memory, context management, permissions, and lifecycle hooks.

## Basic Usage

```typescript
import { Agent } from 'yaaf';

const agent = new Agent({
  systemPrompt: 'You are a helpful coding assistant.',
  tools: [readFileTool, writeFileTool, searchTool],
});

const response = await agent.run('Refactor the auth module');
```

## Full Configuration

```typescript
import { Agent, PermissionPolicy, Sandbox } from 'yaaf';

const agent = new Agent({
  // ── Identity ──────────────────────────────────────────
  name: 'CodeBot',
  systemPrompt: 'You are a senior TypeScript engineer.',

  // ── Model ─────────────────────────────────────────────
  provider: 'gemini',           // 'gemini' | 'openai' | auto-detect
  model: 'gemini-2.5-flash',
  temperature: 0.3,
  maxTokens: 8192,
  maxIterations: 15,            // Max tool-call rounds per run()

  // ── Tools ─────────────────────────────────────────────
  tools: [readFile, writeFile, exec, search],

  // ── Safety ────────────────────────────────────────────
  permissions: new PermissionPolicy()
    .allow('read_*')
    .requireApproval('write_*', 'File writes need confirmation')
    .deny('delete_*')
    .onRequest(cliApproval()),

  sandbox: new Sandbox({
    timeoutMs: 15_000,
    allowedPaths: [process.cwd()],
    blockNetwork: false,
  }),

  // ── Lifecycle ─────────────────────────────────────────
  hooks: {
    beforeToolCall: async (ctx) => {
      console.log(`→ ${ctx.toolName}(${JSON.stringify(ctx.arguments)})`);
      return { action: 'continue' };
    },
    afterToolCall: async (ctx, result) => {
      metrics.record({ tool: ctx.toolName, ok: !result.error });
      return { action: 'continue' };
    },
  },

  // ── Memory ────────────────────────────────────────────
  memoryStrategy: sessionMemoryStrategy({ systemPrompt: '...' }),

  // ── Session ───────────────────────────────────────────
  session: await Session.resumeOrCreate('codebot'),

  // ── Skills ────────────────────────────────────────────
  skills: await loadSkills('./skills'),

  // ── Plan Mode ─────────────────────────────────────────
  planMode: {
    onPlan: async (plan) => {
      console.log(plan);
      return await confirm('Execute?');
    },
  },
});
```

## Configuration Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | `'Agent'` | Agent display name |
| `systemPrompt` | `string` | — | Static system prompt |
| `systemPromptProvider` | `SystemPromptBuilder` | — | Dynamic prompt (use `Agent.create()`) |
| `tools` | `Tool[]` | `[]` | Available tools |
| `provider` | `'gemini' \| 'openai'` | auto | Force LLM provider |
| `model` | `string` | auto | Model ID override |
| `chatModel` | `ChatModel` | auto | Bring-your-own model |
| `temperature` | `number` | `0.7` | Sampling temperature |
| `maxTokens` | `number` | — | Max output tokens |
| `maxIterations` | `number` | `15` | Max tool-call rounds |
| `permissions` | `PermissionPolicy` | allow all | Tool permission gating |
| `hooks` | `Hooks` | — | Lifecycle callbacks |
| `sandbox` | `Sandbox` | — | Execution sandboxing |
| `session` | `Session` | — | Conversation persistence |
| `planMode` | `PlanModeConfig` | — | Think-first execution |
| `skills` | `Skill[]` | `[]` | Markdown capability packs |
| `memoryStrategy` | `MemoryStrategy` | — | Long-term memory |

## Streaming

```typescript
// Yields RunnerStreamEvent — internal, detailed events
for await (const event of agent.runStream('Hello')) {
  switch (event.type) {
    case 'text_delta':
      process.stdout.write(event.content);
      break;
    case 'tool_call_start':
      console.log(`⚙ ${event.name}...`);
      break;
    case 'tool_call_result':
      console.log(`✓ ${event.name} (${event.durationMs}ms)`);
      break;
    case 'final_response':
      console.log('\n\nDone:', event.content.length, 'chars');
      break;
  }
}
```

### Stream Adapter

To use with runtime harnesses, wrap with `toStreamableAgent()`:

```typescript
import { Agent, toStreamableAgent } from 'yaaf';
import { createCLI } from 'yaaf/cli-runtime';

const agent = new Agent({ ... });

// Adapts RunnerStreamEvent → RuntimeStreamEvent
createCLI(toStreamableAgent(agent), {
  name: 'my-bot',
  streaming: true,
});
```

## Events

```typescript
agent
  .on('tool:call',     ({ name, arguments }) => { ... })
  .on('tool:result',   ({ name, result, durationMs }) => { ... })
  .on('tool:error',    ({ name, error }) => { ... })
  .on('tool:blocked',  ({ name, reason }) => { ... })
  .on('llm:response',  ({ hasToolCalls, contentLength, usage }) => { ... })
  .on('llm:delta',     (delta) => { ... })   // streaming only
  .on('llm:retry',     ({ attempt, maxRetries }) => { ... })
  .on('iteration',     ({ count, maxIterations }) => { ... })
  .on('usage',         (usage) => { ... });
```

## Factory Methods

```typescript
// Async create — resolves SystemPromptBuilder before construction
const agent = await Agent.create({
  systemPromptProvider: myBuilder,
  tools: myTools,
});

// Provider-specific shortcuts
import { geminiAgent, openaiAgent, ollamaAgent } from 'yaaf';

const g = geminiAgent('gemini-2.5-flash', { systemPrompt: '...', tools });
const o = openaiAgent('gpt-4o', { systemPrompt: '...', tools });
const l = ollamaAgent('llama3.1', { systemPrompt: '...', tools });
```

## Lifecycle

```typescript
const agent = new Agent({ ... });

// Run returns the final text response
const response = await agent.run('Hello');

// Reset clears conversation history
agent.reset();

// Access conversation messages
const messages = agent.getMessages();

// Session usage stats
const usage = agent.getSessionUsage();
// { llmCalls: 3, totalPromptTokens: 1500, totalCompletionTokens: 400, totalDurationMs: 3200 }
```
