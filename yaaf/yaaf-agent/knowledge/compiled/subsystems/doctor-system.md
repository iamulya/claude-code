---
title: Doctor System
entity_type: subsystem
summary: A developer-facing expert agent that can diagnose issues in a YAAF project through interactive queries, a background daemon, or a CLI.
primary_files:
 - src/doctor/index.ts
exports:
 - YaafDoctor
 - YaafDoctorConfig
 - DoctorIssue
 - WatchOptions
search_terms:
 - how to debug yaaf agent
 - yaaf project diagnosis
 - agent error analysis
 - interactive agent help
 - yaaf cli doctor
 - proactive error monitoring
 - yaaf daemon mode
 - troubleshooting tool calls
 - compile error diagnosis
 - test failure analysis
 - yaaf expert agent
 - npx yaaf doctor
stub: false
compiled_at: 2026-04-24T18:12:25.042Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/doctor/index.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Purpose

The Doctor System provides a developer-facing expert agent designed to understand the YAAF framework deeply [Source 1]. Its primary purpose is to assist developers by diagnosing issues within their YAAF projects. It can read, search, compile, and test the project's code to provide grounded answers and proactive alerts [Source 1].

The system is designed to be used in three primary ways [Source 1]:
1.  **Interactive Mode**: Developers can ask the Doctor questions directly and receive answers, for example, "Why is my tool not being called?".
2.  **Daemon Mode**: The Doctor can run as a background process, proactively watching for errors and emitting issues as they occur.
3.  **Command-Line Interface ([CLI](./cli.md))**: A set of `npx yaaf doctor` commands provides access to the interactive and daemon functionalities from the terminal.

## Architecture

The Doctor System is built upon several core components of the YAAF framework. The central class is `YaafDoctor`, which encapsulates the expert agent's logic [Source 1].

Internally, the `YaafDoctor` is a specialized implementation of the core `Agent` class. It utilizes a `ContextManager` to manage its understanding of the developer's project files and state. For its proactive monitoring capabilities in daemon mode, it relies on a component named `Vigil` [Source 1].

The Doctor agent is equipped with a specialized set of [Tools](./tools.md) for project analysis, created by a `createDoctorTools` function. Its behavior is guided by specific [System Prompt](../concepts/system-prompt.md)s, `DOCTOR_SYSTEM_PROMPT` and `DOCTOR_TICK_PROMPT`, which define its expert persona and objectives. It uses the framework's standard [Model Resolution System](./model-resolution-system.md) (`resolveModelSpecs`) to interact with [LLM](../concepts/llm.md)s [Source 1].

## Key APIs

The main entry point for the Doctor System is the `YaafDoctor` class [Source 1].

### `YaafDoctor` Class

This class provides the primary interface for interacting with the Doctor agent.

**Interactive Usage:**
```typescript
import { YaafDoctor } from 'yaaf'

const doctor = new YaafDoctor() // uses process.cwd()
const answer = await doctor.ask('Why is my tool not being called?')
console.log(answer)
```
[Source 1]

**Daemon Usage:**
```typescript
import { YaafDoctor } from 'yaaf'

const doctor = new YaafDoctor({ daemon: true })
doctor.onIssue((issue: DoctorIssue) => {
  console.log(`🔴 ${issue.summary}\n${issue.details}`)
})
await doctor.startDaemon()
// ... later
doctor.stopDaemon()
```
[Source 1]

### `DoctorIssue` Type

A data structure representing a diagnosed problem, with a `type` that can be `compile_error`, `test_failure`, `pattern_warning`, or `runtime_error` [Source 1].

### CLI Usage

The system is also exposed via a command-line interface [Source 1]:
-   `npx yaaf doctor`: Starts an interactive REPL session.
-   `npx yaaf doctor --daemon`: Runs the Doctor as a background watcher.
-   `npx yaaf doctor --watch`: Runs a lightweight file watcher without the LLM for diagnosis.

## Configuration

The `YaafDoctor` is configured via the `YaafDoctorConfig` object passed to its constructor. Key configuration options include [Source 1]:

-   `projectRoot`: The project directory to inspect (defaults to `process.cwd()`).
-   `model`, `provider`, `apiKey`: Standard options for specifying the LLM.
-   `chatModel`: Allows providing a pre-configured `ChatModel` instance, bypassing other model resolution.
-   `extraTools`: An array of additional `Tool` instances to extend the Doctor's capabilities.
-   `extraInstructions`: A string to be appended to the System Prompt for customization.
-   `daemonIntervalSec`: The check interval in seconds for daemon mode (default: 30).
-   `maxIterations`: The maximum number of LLM iterations per question (default: 20).

The watcher behavior can be further tuned with `WatchOptions` [Source 1]:
-   `debounceMs`: The delay in milliseconds after an error before triggering diagnosis, to prevent flooding (default: 2000).
-   `maxBufferSize`: The maximum number of errors to buffer before a forced diagnosis (default: 5).
-   `autoDiagnose`: A boolean to control whether the LLM is used to diagnose errors (default: true).

## Extension Points

Developers can extend and customize the Doctor System's behavior primarily through its configuration [Source 1].

-   **Custom Tools**: By passing an array of `Tool` objects to the `extraTools` property in `YaafDoctorConfig`, developers can grant the Doctor new abilities specific to their project or [workflow](../concepts/workflow.md).
-   **Prompt Customization**: The `extraInstructions` property allows developers to add specific instructions or context to the Doctor's system prompt, altering its behavior or focus.
-   **Model Overriding**: Providing a custom `chatModel` instance allows for complete control over the LLM interaction, bypassing the default provider and model resolution logic.

## Sources

[Source 1]: src/doctor/index.ts