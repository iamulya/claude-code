---
export_name: YaafDoctor
source_file: src/doctor/index.ts
category: class
summary: A developer-facing expert agent that diagnoses YAAF projects and monitors for errors in real-time.
title: YaafDoctor
entity_type: api
stub: false
compiled_at: 2026-04-16T14:06:52.540Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/doctor.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/doctor/index.ts
confidence: 1
---

## Overview
`YaafDoctor` is an expert agent built into the YAAF framework designed to assist developers in debugging, monitoring, and maintaining LLM-powered projects. It possesses internal knowledge of YAAF's architecture, including the Agent API, tool systems, context management strategies, and model specifications.

The Doctor can be utilized in several modes:
*   **Interactive**: A REPL or programmatic interface for asking questions about the project.
*   **Daemon**: A background process that monitors the project for compilation errors and test failures.
*   **Live Watch**: A programmatic attachment to running agents that monitors event streams for runtime errors, permission violations, and context overflows.
*   **File Watch**: A lightweight, non-LLM mode that monitors the filesystem for TypeScript errors.

The Doctor can be enabled globally via the `YAAF_DOCTOR=1` environment variable or by setting `doctor: true` in an `Agent` configuration.

## Signature / Constructor

```typescript
export class YaafDoctor {
  constructor(config?: YaafDoctorConfig)
}
```

### YaafDoctorConfig
| Property | Type | Description |
| :--- | :--- | :--- |
| `projectRoot` | `string` | The root directory to inspect. Defaults to `process.cwd()`. |
| `model` | `string` | LLM model ID to use for diagnosis. |
| `provider` | `ModelProvider` | LLM provider (e.g., 'openai', 'gemini'). |
| `apiKey` | `string` | API key override. |
| `chatModel` | `ChatModel` | A pre-configured ChatModel instance. |
| `extraTools` | `Tool[]` | Additional tools provided to the doctor. |
| `extraInstructions` | `string` | Instructions appended to the doctor's system prompt. |
| `daemonIntervalSec` | `number` | Interval for daemon checks. Defaults to 30. |
| `maxIterations` | `number` | Max LLM tool-call rounds per question. Defaults to 20. |

## Methods & Properties

### Interactive Methods
*   **`ask(question: string): Promise<string>`**: Performs a grounded analysis of the project to answer a developer query.
*   **`askStream(question: string): AsyncIterableIterator<any>`**: Streams the doctor's response, including tool call events and text deltas.
*   **`healthCheck(): Promise<DoctorIssue[]>`**: Performs a one-shot analysis of the project's current state.

### Monitoring Methods
*   **`watch(agent: Agent, options?: WatchOptions): void`**: Subscribes to an agent's event stream. It monitors for 16 event types, including tool errors, LLM retries, context overflows, and guardrail violations. Errors are accumulated in a debounced buffer before being diagnosed by the LLM.
*   **`unwatch(agent: Agent): void`**: Stops monitoring a specific agent.
*   **`unwatchAll(): void`**: Stops monitoring all attached agents.
*   **`startWatch(options: { intervalSec: number, onError: (errors: string[]) => void, onClear: () => void }): () => void`**: Starts a lightweight filesystem watcher that runs `tsc --noEmit`. Returns a stop function.

### Daemon Methods
*   **`startDaemon(): Promise<void>`**: Starts the Vigil-based background watcher.
*   **`stopDaemon(): void`**: Stops the background watcher.
*   **`onIssue(handler: (issue: DoctorIssue) => void): void`**: Registers a callback for issues identified by the daemon or live watcher.

### Built-in Tools
The Doctor utilizes six internal tools to inspect projects:
*   `read_file`: Reads file contents with line range support.
*   `grep_search`: Performs regex pattern searches across source files.
*   `list_dir`: Lists directory contents, excluding standard ignore folders.
*   `run_tsc`: Executes `tsc --noEmit` to find compilation errors.
*   `run_tests`: Executes `npm test`.
*   `get_project_structure`: Retrieves the file tree for supported file types (TS, MD, JSON).

## Events
The Doctor emits `DoctorIssue` objects via the `onIssue` subscriber.

### DoctorIssue
| Field | Type | Description |
| :--- | :--- | :--- |
| `type` | `enum` | One of: `compile_error`, `test_failure`, `pattern_warning`, `runtime_error`. |
| `summary` | `string` | A brief description of the issue. |
| `details` | `string` | Detailed diagnosis and suggested fix. |
| `timestamp` | `Date` | When the issue was detected. |

## Examples

### Programmatic Question
```typescript
import { YaafDoctor } from 'yaaf';

const doctor = new YaafDoctor();
const answer = await doctor.ask('Why is my tool not being called?');
console.log(answer);
```

### Live Agent Monitoring
```typescript
import { Agent, YaafDoctor } from 'yaaf';

const agent = new Agent({
  model: 'gpt-4o',
  tools: [myTools]
});

const doctor = new YaafDoctor();

doctor.onIssue((issue) => {
  console.log(`🩺 Doctor Diagnosis: ${issue.summary}`);
  console.log(issue.details);
});

doctor.watch(agent, {
  debounceMs: 2000,
  autoDiagnose: true
});

await agent.run('Perform a complex task');
```

### Daemon Mode
```typescript
import { YaafDoctor } from 'yaaf';

const doctor = new YaafDoctor({
  daemonIntervalSec: 60
});

doctor.onIssue((issue) => {
  if (issue.type === 'compile_error') {
    console.error(`Build broken: ${issue.summary}`);
  }
});

await doctor.startDaemon();
```