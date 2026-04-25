---
title: Agent
entity_type: api
summary: The primary class for defining and running an LLM-powered agent in YAAF.
export_name: Agent
source_file: src/agent.ts
category: class
search_terms:
 - create an agent
 - LLM agent setup
 - YAAF agent configuration
 - how to run an agent
 - agent lifecycle
 - add tools to agent
 - system prompt
 - agent permissions
 - agent hooks
 - agent constructor
 - agent run method
 - multi-agent systems
 - agent orchestration
 - YAAF Doctor integration
stub: false
compiled_at: 2026-04-24T16:47:16.008Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/doctor.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/getting-started.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/multi-agent.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/permissions.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/server-runtime.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/worker-runtime.md
compiled_from_quality: documentation
confidence: 0.95
---

## Overview

The `Agent` class is the central component for creating and managing [LLM](../concepts/llm.md)-powered agents in the YAAF framework [Source 2]. It encapsulates the core configuration of an agent, including its identity (name), instructions ([System Prompt](../concepts/system-prompt.md)), capabilities ([Tools](../subsystems/tools.md)), and operational parameters like security policies and [Lifecycle Hooks](../concepts/lifecycle-hooks.md) [Source 2, Source 4].

An `Agent` instance is the primary entry point for executing tasks. It can be run directly for single-agent applications, used as a building block in [Multi-Agent Systems](../concepts/multi-agent-systems.md) coordinated by an `AgentOrchestrator`, or exposed as a service via server or worker runtimes [Source 3, Source 5, Source 6]. The class also provides an event-driven interface for observing its internal operations, which is used by features like the `YaafDoctor` for real-time diagnostics [Source 1, Source 4].

## Constructor

The `Agent` class is instantiated with a single configuration object.

```typescript
import { Agent, type Tool, type PermissionPolicy, type Hooks } from 'yaaf';

interface AgentConfig {
  /** A unique name for the agent, used in logging and multi-agent contexts. */
  name?: string;

  /** The core instructions defining the agent's purpose, personality, and constraints. */
  systemPrompt: string;

  /** An array of tools the agent can use to perform actions. */
  tools: Tool[];

  /** The identifier for the LLM model to use (e.g., 'gpt-4o', 'gemini-2.5-flash'). */
  model?: string;

  /** A policy object that controls which tools the agent is allowed to use. */
  permissions?: PermissionPolicy;

  /** A set of functions to intercept the agent's execution at key lifecycle points. */
  hooks?: Hooks;

  /** Set to true to automatically attach the YAAF Doctor for real-time diagnostics. */
  doctor?: boolean;
}

const agent = new Agent(config: AgentConfig);
```

## Methods & Properties

### run()
Executes the agent with a given input and returns the final response.

```typescript
run(input: string): Promise<string>
```

### runStream()
Executes the agent and returns an async iterator that yields events as they occur, such as text deltas and [Tool Calls](../concepts/tool-calls.md). This is the underlying method used by [Streaming](../concepts/streaming.md) server runtimes [Source 1, Source 5].

```typescript
runStream(input: string): AsyncIterable<AgentEvent>
```

### on()
Subscribes a listener function to a specific agent event. This allows for monitoring and reacting to the agent's internal state and actions [Source 4].

```typescript
on(event: AgentEventName, listener: (payload: any) => void): this
```

### reset()
Resets the agent's internal state, clearing its conversation history. This is useful for starting a new, independent conversation [Source 5].

```typescript
reset(): void
```

## Events

The `Agent` class emits a rich set of events throughout its lifecycle, enabling detailed observation and diagnostics. The `YaafDoctor` subscribes to these events to provide automated analysis [Source 1].

### Tool Events

| Event                   | Description                                                      |
| ----------------------- | ---------------------------------------------------------------- |
| `tool:error`            | A tool threw an exception during its execution.                   |
| `tool:blocked`          | A `PermissionPolicy` denied a tool call.                         |
| `tool:sandbox-violation`| A tool attempted an operation outside its sandbox boundaries.    |
| `tool:validation-failed`| The LLM provided arguments to a tool that did not match its schema. |
| `tool:loop-detected`    | The same tool was called repeatedly with identical output.       |

### LLM Events

| Event                | Description                                                              |
| -------------------- | ------------------------------------------------------------------------ |
| `llm:retry`          | An LLM API call failed and is being retried.                             |
| `llm:empty-response` | The model returned an empty or whitespace-only response.                 |

### Context & Recovery Events

| Event                        | Description                                                              |
| ---------------------------- | ------------------------------------------------------------------------ |
| `iteration`                  | The agent is approaching its `maxIterations` limit.                      |
| `context:overflow-recovery`  | Emergency [Context Compaction](../concepts/context-compaction.md) was triggered (or failed) due to token overflow. |
| `context:output-continuation`| The output token limit was reached, and a synthetic continuation was injected. |
| `context:compaction-triggered`| The `ContextManager` automatically ran compaction.                       |
| `context:budget-warning`     | The context size is approaching the compaction threshold.                |

### Hooks & Guardrail Events

| Event              | Description                                                              |
| ------------------ | ------------------------------------------------------------------------ |
| `hook:error`       | A user-provided hook threw an error.                                    |
| `hook:blocked`     | A hook returned `{ action: 'block' }`, stopping execution.               |
| `guardrail:warning`| A budget (cost, tokens, turns) is approaching its configured limit.      |
| `guardrail:blocked`| A budget was exceeded, and the agent was stopped.                        |

## Examples

### Basic Agent

A minimal agent with a single tool and a system prompt [Source 2].

```typescript
import { Agent, buildTool } from 'yaaf';

const greetTool = buildTool({
  name: 'greet',
  description: 'Greet someone by name',
  inputSchema: {
    type: 'object',
    properties: { name: { type: 'string' } },
    required: ['name'],
  },
  async call({ name }) {
    return { data: `Hello, ${name}! 👋` };
  },
});

const agent = new Agent({
  name: 'Greeter',
  systemPrompt: 'You are a friendly greeter. Always greet the user by name.',
  tools: [greetTool],
});

const response = await agent.run('Say hello to Alice');
console.log(response); // Outputs something like: "Hello, Alice! 👋"
```

### Agent with Permissions and Hooks

An agent configured with a security policy to control tool access and a hook for logging tool calls [Source 4].

```typescript
import { Agent, PermissionPolicy, cliApproval, buildTool } from 'yaaf';

const fileTools = [
  buildTool({ name: 'read_file', /* ... */ async call() { return { data: '' }; } }),
  buildTool({ name: 'write_file', /* ... */ async call() { return { data: '' }; } }),
];

const policy = new PermissionPolicy()
  .allow('read_*')
  .requireApproval('write_*', 'File writes require confirmation')
  .onRequest(cliApproval());

const agent = new Agent({
  systemPrompt: 'You are a file management assistant.',
  tools: fileTools,
  permissions: policy,
  hooks: {
    beforeToolCall: async (ctx) => {
      console.log(`[AUDIT] Tool called: ${ctx.toolName} with args:`, ctx.arguments);
      return { action: 'continue' };
    },
  },
});

await agent.run('Read the content of package.json then write it to package.bak');
```

### Enabling YAAF Doctor

The built-in diagnostic agent can be enabled with a single configuration flag [Source 1].

```typescript
import { Agent } from 'yaaf';

const agent = new Agent({
  model: 'gpt-4o',
  tools: [
    // ... your tools
  ],
  systemPrompt: '...',
  doctor: true, // Enable YAAF Doctor
});

// The Doctor will now automatically watch for runtime errors and diagnose them.
```

### Use in a Multi-Agent System

`Agent` instances serve as the workers in a multi-agent system managed by an `AgentOrchestrator` [Source 3].

```typescript
import { Agent, AgentOrchestrator } from 'yaaf';

const leaderAgent = new Agent({
  name: 'Leader',
  systemPrompt: 'Coordinate research tasks.',
  tools: [/* delegateTool */],
});

const orchestrator = new AgentOrchestrator({
  leader: leaderAgent,
  delegates: {
    researcher: {
      factory: () => new Agent({
        name: 'Researcher',
        systemPrompt: 'You research topics thoroughly.',
        tools: [/* searchTool */],
      }),
      maxInstances: 3,
    },
  },
});

const result = await orchestrator.run('Write a report on quantum computing');
```

## See Also

- **Tools**: The `buildTool` function is used to create the capabilities an agent can execute.
- **Permissions**: The `PermissionPolicy` class provides fine-grained control over tool usage.
- **Hooks**: Lifecycle hooks allow for intercepting and modifying agent behavior.
- **Runtimes**: The `createServer` and `createWorker` functions adapt an `Agent` for deployment as an HTTP service.
- **Multi-Agent**: The `AgentOrchestrator` class coordinates multiple `Agent` instances to solve complex tasks.
- **Diagnostics**: The `YaafDoctor` provides automated debugging and analysis for agents.

## Sources
- [Source 1]: YAAF Doctor (`/Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/doctor.md`)
- [Source 2]: Getting Started (`/Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/getting-started.md`)
- [Source 3]: Multi-Agent (`/Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/multi-agent.md`)
- [Source 4]: Permissions & Hooks (`/Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/permissions.md`)
- [Source 5]: [Server Runtime](../subsystems/server-runtime.md) (`/Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/server-runtime.md`)
- [Source 6]: [Worker Runtime](../subsystems/worker-runtime.md) (`/Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/worker-runtime.md`)