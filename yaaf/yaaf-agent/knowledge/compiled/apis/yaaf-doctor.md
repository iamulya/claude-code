---
title: YaafDoctor
entity_type: api
summary: A built-in expert agent in YAAF that diagnoses project issues, agent runtime problems, and provides real-time feedback and fixes.
export_name: YaafDoctor
source_file: src/doctor.ts
category: class
search_terms:
 - diagnose agent errors
 - debug YAAF agent
 - project health check
 - interactive agent debugger
 - YAAF CLI doctor
 - live agent monitoring
 - automatic error analysis
 - YAAF_DOCTOR environment variable
 - watch for tool errors
 - troubleshoot LLM retries
 - daemon mode agent
 - code-grounded answers
 - fix typescript errors
 - runtime error buffer
 - auto-attach debugger
stub: false
compiled_at: 2026-04-24T17:50:22.766Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/doctor.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/doctor/index.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `YaafDoctor` is a built-in expert agent that understands the YAAF framework and can diagnose issues within a developer's project in real time [Source 1]. It is designed to be a developer-facing assistant capable of reading files, searching code, compiling, running tests, and analyzing runtime errors [Source 2].

`YaafDoctor` is built entirely using YAAF's own primitives, including `Agent`, `Vigil`, `buildTool`, and `RunnerEvents`, serving as a comprehensive example of the framework's capabilities [Source 1].

It can be used in several modes [Source 1]:

| Mode | Activation | [LLM](../concepts/llm.md) Usage | Description |
|---|---|:---:|---|
| **Auto-Attach** | `doctor: true` in `Agent` config or `YAAF_DOCTOR=1` environment variable. | ✅ | Silently watches a running agent for errors and automatically diagnoses them. |
| **Interactive** | `npx yaaf doctor` [CLI](../subsystems/cli.md) command. | ✅ | A REPL where developers can ask questions and receive code-grounded answers. |
| **Live Watch** | Programmatically via `doctor.watch(agent)`. | ✅ | Taps into an agent's event stream for real-time monitoring and diagnosis. |
| **Daemon** | `npx yaaf doctor --daemon` or `doctor.startDaemon()`. | ✅ | A background process that periodically runs `tsc` and tests, diagnosing new errors. |
| **File Watch** | `npx yaaf doctor --watch` or `doctor.startWatch()`. | ❌ | A lightweight `tsc --noEmit` loop that reports on new errors without using an LLM. |

The Doctor's architecture includes components like an `ErrorTracker` for diff-based error reporting in daemon mode and a `RuntimeErrorBuffer` which debounces and batches cascading runtime errors into a single LLM diagnosis call [Source 1].

## Signature / Constructor

`YaafDoctor` is instantiated with an optional configuration object.

```typescript
import type { ModelProvider, Tool, ChatModel } from 'yaaf';

export class YaafDoctor {
  constructor(config?: YaafDoctorConfig);
  // ... methods
}
```

### `YaafDoctorConfig`

The constructor accepts a `YaafDoctorConfig` object with the following properties [Source 2]:

```typescript
export type YaafDoctorConfig = {
  /** Project root to inspect (default: process.cwd()) */
  projectRoot?: string;

  /** LLM model to use (default: auto-detect from env) */
  model?: string;

  /** LLM provider (default: auto-detect from env) */
  provider?: ModelProvider;

  /** API key override (default: from environment) */
  apiKey?: string;

  /** Pre-configured ChatModel instance (bypasses provider/apiKey resolution) */
  chatModel?: ChatModel;

  /** Additional [[[[[[[[Tools]]]]]]]] to give the doctor */
  extraTools?: Tool[];

  /** Extra instructions appended to the system prompt */
  extraInstructions?: string;

  /** Daemon check interval in seconds (default: 30) */
  daemonIntervalSec?: number;

  /** Max LLM iterations per question (default: 20) */
  maxIterations?: number;
};
```

## Methods & Properties

### `ask()`

Programmatically asks the Doctor a question about the project. The Doctor uses its Tools (file system access, `tsc`, etc.) and an LLM to generate a code-grounded answer [Source 1].

```typescript
async ask(question: string): Promise<string>;
```

### `askStream()`

Similar to `ask()`, but returns an async generator that streams events, including text deltas and tool usage information, as the Doctor processes the question [Source 1].

```typescript
async *askStream(question: string): AsyncGenerator<any>; // 'any' represents various event types
```

### `healthCheck()`

Performs a one-shot health check of the project by running the TypeScript compiler and test suite. It does not use an LLM and returns a promise that resolves with an array of found issues [Source 1].

```typescript
async healthCheck(): Promise<DoctorIssue[]>;
```

### `startDaemon()`

Starts the Doctor in daemon mode. It periodically compiles the project and runs tests, using an LLM to diagnose any new errors it finds. Issues are emitted via the `onIssue` handler [Source 1].

```typescript
async startDaemon(): Promise<void>;
```

### `stopDaemon()`

Stops a running daemon process [Source 1].

```typescript
stopDaemon(): void;
```

### `startWatch()`

Starts a lightweight, no-LLM file watcher. It runs `tsc --noEmit` at a configured interval and calls handlers for new errors or [when](./when.md) all errors are cleared. Returns a function to stop the watcher [Source 1].

```typescript
startWatch(options: {
  intervalSec: number;
  onError: (errors: string[]) => void;
  onClear: () => void;
}): () => void; // Returns a stop function
```

### `watch()`

Attaches the Doctor to a running `Agent` instance, tapping into its event stream to monitor for runtime issues. It uses a debounced buffer to group related errors before triggering an LLM-powered diagnosis [Source 1].

```typescript
watch(agent: Agent, options?: WatchOptions): void;
```

The `options` parameter is of type `WatchOptions` [Source 2]:

```typescript
export type WatchOptions = {
  /**
   * How long to wait (ms) after the last error before flushing the
   * buffer and triggering diagnosis. Prevents flooding on cascading errors.
   * Default: 2000ms
   */
  debounceMs?: number;

  /**
   * Maximum errors to accumulate before force-flushing regardless of debounce.
   * Default: 5
   */
  maxBufferSize?: number;

  /**
   * Whether to use the Doctor's LLM to diagnose accumulated errors.
   * If false, raw DoctorIssue events are still emitted via onIssue().
   * Default: true
   */
  autoDiagnose?: boolean;
};
```

### `unwatch()`

Detaches the Doctor from a specific agent's event stream [Source 1].

```typescript
unwatch(agent: Agent): void;
```

### `unwatchAll()`

Detaches the Doctor from all agents it is currently watching [Source 1].

```typescript
unwatchAll(): void;
```

### `onIssue()`

Registers a handler function that is called whenever the Doctor identifies an issue, whether from daemon mode or live agent watching [Source 1].

```typescript
onIssue(handler: (issue: DoctorIssue) => void): void;
```

## Events

### `onIssue` Event

The `onIssue` method registers a listener for issues discovered by the Doctor. The payload is a `DoctorIssue` object [Source 2].

```typescript
export type DoctorIssue = {
  type: "compile_error" | "test_failure" | "pattern_warning" | "runtime_error";
  summary: string;
  details: string;
  timestamp: Date;
};
```

### Watched Agent Events

In live watch mode (`doctor.watch(agent)`), the Doctor subscribes to 16 different event types from the agent's internal event stream to detect a wide range of problems [Source 1].

**Tool Errors:**

| Event | Description |
|---|---|
| `tool:error` | A tool threw an exception during its execution. |
| `tool:blocked` | A `PermissionPolicy` denied a tool call. |
| `tool:sandbox-violation` | A tool attempted to escape its sandbox boundaries. |
| `tool:validation-failed` | The LLM provided tool arguments that did not match the tool's input schema. |
| `tool:loop-detected` | The same tool was called repeatedly with identical output. |

**LLM Errors:**

| Event | Description |
|---|---|
| `llm:retry` | An LLM API call failed and is being retried. |
| `llm:empty-response` | The model returned an empty or whitespace-only response. |

**Context & Recovery:**

| Event | Description |
|---|---|
| `iteration` | The agent is approaching its `maxIterations` limit. |
| `context:overflow-recovery` | Emergency [Context Compaction](../concepts/context-compaction.md) was triggered due to token overflow. |
| `context:output-continuation` | The output token limit was reached, and a synthetic continuation message was injected. |
| `context:compaction-triggered` | The `ContextManager` performed automatic compaction. |
| `context:budget-warning` | The context is approaching its compaction threshold. |

**Hooks & Guardrails:**

| Event | Description |
|---|---|
| `hook:error` | A user-provided hook threw an error. |
| `hook:blocked` | A hook returned `{ action: 'block' }`, halting execution. |
| `guardrail:warning` | A budget (cost, token, or turn) is approaching its limit. |
| `guardrail:blocked` | A budget was exceeded, and the agent was stopped. |

## Examples

### Auto-Attach (Zero Code)

Enable the Doctor via a configuration flag in the `Agent` constructor or an environment variable [Source 1].

**Option A: Config Flag**
```typescript
const agent = new Agent({
  model: 'gpt-4o',
  tools: [myTools],
  doctor: true,   // Enable the Doctor
});
```

**Option B: Environment Variable**
```bash
YAAF_DOCTOR=1 npx tsx src/main.ts
```

### Programmatic Live Agent Watching

Create a `YaafDoctor` instance and attach it to a running agent to receive real-time diagnostics [Source 1].

```typescript
import { Agent, YaafDoctor } from 'yaaf';

const agent = new Agent({
  model: 'gemini-2.5-flash',
  tools: [readFileTool, writeFileTool, bashTool],
});

const doctor = new YaafDoctor();

doctor.onIssue((issue) => {
  if (issue.type === 'runtime_error') {
    console.log(`\n🔴 RUNTIME ERROR: ${issue.summary}`);
    console.log(`   ${issue.details}`);
  }
});

// Start watching the agent's event stream
doctor.watch(agent, {
  debounceMs: 2000,
  autoDiagnose: true,
});

// The Doctor will now silently observe the agent's execution
await agent.run('Refactor the auth module and add tests');

// Stop watching when done
doctor.unwatch(agent);
```

### Programmatic Daemon

Run the Doctor as a background service alongside your main application to continuously monitor for project-level issues [Source 1].

```typescript
import { Agent, YaafDoctor } from 'yaaf';

// Your main agent
const agent = new Agent({ /* ... */ });

// The Doctor runs alongside
const doctor = new YaafDoctor({
  projectRoot: process.cwd(),
  daemonIntervalSec: 30,
});

doctor.onIssue((issue) => {
  console.log(`🩺 ${issue.summary}`);
  console.log(`   ${issue.details}`);
});

await doctor.startDaemon();

// ... your application logic ...

await agent.run('Handle this support ticket');

// Later, stop the daemon
doctor.stopDaemon();
```

### Interactive CLI

Use the [YAAF CLI](../concepts/yaaf-cli.md) for an interactive REPL session with the Doctor [Source 1].

```bash
npx yaaf doctor
```
```
🩺 YAAF Doctor
   I'm an expert on YAAF. Ask me anything about your project.
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
```

## Sources
[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/doctor.md
[Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/doctor/index.ts