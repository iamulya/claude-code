---
export_name: Agent
source_file: src/agent.ts
category: class
title: Agent
entity_type: api
summary: The primary entry point for building LLM-powered agents, wrapping the execution loop with tools, memory, context management, and safety policies.
stub: false
compiled_at: 2026-04-16T14:05:04.743Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/agent.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/compaction.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/doctor.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/getting-started.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/permissions.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/worker-runtime.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agent.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/cli/init.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/index.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/tools/openapi/index.ts
confidence: 1
---

## Overview
The `Agent` class is the high-level abstraction and primary entry point for the YAAF framework. It orchestrates the interaction between Large Language Models (LLMs) and tools, managing the execution loop while providing integrated support for context compaction, memory strategies, permission enforcement, and lifecycle hooks.

It handles provider auto-detection (supporting Gemini, OpenAI, Anthropic, and local providers like Ollama), session persistence, and execution sandboxing. It also includes a built-in diagnostic "Doctor" that can proactively analyze runtime errors.

## Signature / Constructor

### Constructor
```typescript
constructor(config: AgentConfig)
```

### Async Factory
```typescript
static async create(config: AgentConfig): Promise<Agent>
```
The `create` method is used when the `systemPromptProvider` or plugins require asynchronous initialization before the agent is ready.

### AgentConfig
| Property | Type | Description |
| :--- | :--- | :--- |
| `name` | `string` | Agent display name for logging and identification. |
| `systemPrompt` | `string` | Static system prompt defining the agent's role. |
| `systemPromptProvider` | `SystemPromptBuilder \| () => Promise<string>` | Async prompt builder. Takes precedence over `systemPrompt`. |
| `tools` | `readonly Tool[]` | Array of tools available for the agent to call. |
| `chatModel` | `ChatModel` | Pre-built model instance. Skips provider auto-detection. |
| `provider` | `ModelProvider \| string` | LLM provider (e.g., 'gemini', 'openai'). Auto-detected from env if omitted. |
| `model` | `string` | Model ID (e.g., 'gpt-4o', 'gemini-2.0-flash'). |
| `apiKey` | `string` | API key for the provider. Defaults to standard environment variables. |
| `maxIterations` | `number` | Max tool-call round-trips per `run()` (default: 15). |
| `temperature` | `number` | Sampling temperature (default: 0.2). |
| `maxTokens` | `number` | Max output tokens per LLM call. Defaults to model-specific registry limits. |
| `contextManager` | `ContextManager \| 'auto'` | Manages token budgets. `'auto'` uses model specs for zero-config compaction. |
| `permissions` | `PermissionPolicy` | Glob-based tool call gating and approval logic. |
| `accessPolicy` | `AccessPolicy` | Identity-aware authorization (RBAC/ABAC) and data scoping. |
| `hooks` | `Hooks` | Lifecycle callbacks for LLM turns and tool calls. |
| `sandbox` | `Sandbox` | Enforces timeouts, path guards, and network restrictions. |
| `session` | `Session` | Persistence for conversation history (JSONL). |
| `memoryStrategy` | `MemoryStrategy` | Long-term memory retrieval and injection. |
| `planMode` | `PlanModeConfig \| true` | Enables "think-first" execution with optional approval. |
| `skills` | `Skill[]` | Markdown capability packs injected into the prompt. |
| `plugins` | `Plugin[]` | Extensions that contribute tools or modify behavior. |
| `doctor` | `boolean \| WatchOptions` | Enables built-in diagnostics agent. |
| `security` | `SecurityHooksConfig \| boolean` | Enables OWASP-aligned prompt/output protection. |

## Methods & Properties

### `run()`
Executes the agent loop with the provided user input.
```typescript
async run(input: string, options?: RunOptions): Promise<string>
```
Returns the final text response from the agent.

### `runStream()`
Executes the agent loop and yields detailed execution events.
```typescript
async *runStream(input: string, options?: RunOptions): AsyncIterable<RunnerStreamEvent>
```

### `reset()`
Clears the current conversation history and resets the session state.
```typescript
reset(): void
```

### `getMessages()`
Returns the current array of conversation messages.
```typescript
getMessages(): Message[]
```

### `getSessionUsage()`
Returns token usage and call statistics for the current session.
```typescript
getSessionUsage(): UsageStats
```

### `shutdown()`
Performs cleanup, including stopping the Doctor (if active) and notifying plugins.
```typescript
async shutdown(): Promise<void>
```

## Events
The `Agent` class emits events via an internal emitter. These can be used for logging, monitoring, or UI updates.

### Tool Events
- `tool:call`: Emitted when a tool is about to be executed.
- `tool:result`: Emitted after a tool successfully returns.
- `tool:error`: Emitted when a tool throws an exception.
- `tool:blocked`: Emitted when a `PermissionPolicy` or `AccessPolicy` denies a call.
- `tool:sandbox-violation`: Emitted when a tool exceeds sandbox constraints.
- `tool:validation-failed`: Emitted when LLM arguments do not match the tool schema.
- `tool:loop-detected`: Emitted when the same tool is called repeatedly with identical output.

### LLM Events
- `llm:response`: Emitted after a successful LLM completion.
- `llm:delta`: Emitted during streaming for each text chunk.
- `llm:retry`: Emitted when an API call fails and is being retried.
- `llm:empty-response`: Emitted when the model returns an empty or whitespace-only response.

### Context & Lifecycle Events
- `iteration`: Emitted at the start of each tool-call round.
- `usage`: Emitted with cumulative token usage stats.
- `context:compaction-triggered`: Emitted when the `ContextManager` begins a compaction pass.
- `context:overflow-recovery`: Emitted when an emergency compaction is triggered by a token overflow error.
- `context:output-continuation`: Emitted when a response is truncated by `maxTokens` and a continuation is requested.
- `hook:error`: Emitted when a user-provided lifecycle hook throws an error.

## Examples

### Basic Usage
```typescript
import { Agent } from 'yaaf';

const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
  tools: [mySearchTool],
});

const response = await agent.run('What is the current weather in London?');
console.log(response);
```

### Full Configuration with Safety
```typescript
import { Agent, PermissionPolicy, cliApproval, projectSandbox } from 'yaaf';

const agent = new Agent({
  model: 'gpt-4o',
  contextManager: 'auto',
  permissions: new PermissionPolicy()
    .allow('read_*')
    .requireApproval('write_*', 'Writing files requires user consent')
    .onRequest(cliApproval()),
  sandbox: projectSandbox(),
  doctor: true,
  hooks: {
    afterToolCall: async (ctx, result) => {
      console.log(`Tool ${ctx.toolName} finished in ${ctx.durationMs}ms`);
      return { action: 'continue' };
    }
  }
});
```

### Streaming Response
```typescript
for await (const event of agent.runStream('Generate a complex refactor plan')) {
  if (event.type === 'text_delta') {
    process.stdout.write(event.content);
  } else if (event.type === 'tool_call_start') {
    console.log(`\n[Calling ${event.name}...]`);
  }
}
```

### Provider-Specific Shortcuts
```typescript
import { geminiAgent, openaiAgent } from 'yaaf';

const g = geminiAgent('gemini-2.0-flash', { systemPrompt: '...' });
const o = openaiAgent('gpt-4o', { systemPrompt: '...' });
```

## See Also
- [ContextManager](context-compaction.md)
- [PermissionPolicy](permissions.md)
- [Sandbox](permissions.md#sandbox)
- [YaafDoctor](doctor.md)
- [Session](agent.md#lifecycle)