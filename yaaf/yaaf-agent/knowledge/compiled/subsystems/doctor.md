---
title: Doctor Subsystem
entity_type: subsystem
summary: A diagnostic and monitoring subsystem providing expert assistance and proactive error detection for YAAF developers.
primary_files:
  - src/doctor/index.ts
  - src/doctor/tools.ts
  - src/doctor/prompt.ts
exports:
  - YaafDoctor
  - YaafDoctorConfig
  - DoctorIssue
  - WatchOptions
stub: false
compiled_at: 2026-04-16T14:17:28.491Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/doctor/index.ts
confidence: 0.95
---

## Purpose
The Doctor Subsystem serves as a developer-facing expert agent and diagnostic daemon designed to assist in the development, debugging, and maintenance of YAAF-powered projects. It provides deep framework-level knowledge combined with the ability to inspect the local project environment, including reading source files, searching the codebase, and monitoring compilation or test results.

The subsystem addresses the complexity of building LLM agents by providing grounded answers to developer queries and proactively identifying issues such as compilation errors, test failures, or anti-patterns in the agent configuration.

## Architecture
The Doctor Subsystem is built around the `YaafDoctor` class, which encapsulates an internal YAAF agent specialized for diagnostic tasks.

### Core Components
- **YaafDoctor**: The primary entry point that manages the lifecycle of the diagnostic agent and the daemon process.
- **Doctor Tools**: A specialized set of tools (created via `createDoctorTools`) that allow the doctor to interact with the filesystem, execute shell commands (like `tsc` or test runners), and analyze project structure.
- **Prompts**: The subsystem utilizes specific system prompts (`DOCTOR_SYSTEM_PROMPT` and `DOCTOR_TICK_PROMPT`) that define its persona as a YAAF expert and guide its diagnostic behavior.
- **Vigil**: An internal monitoring component used by the daemon to watch for project changes or errors.

### Operational Modes
The subsystem supports three primary modes of operation:
1.  **Interactive**: A request-response pattern where developers ask specific questions about their implementation.
2.  **Daemon**: A proactive background process that watches the project for issues and emits events when errors or warnings are detected.
3.  **CLI**: A command-line interface accessible via `npx yaaf doctor` for REPL interactions or background watching.

## Integration Points
The Doctor Subsystem integrates with several other YAAF components:
- **Agent Subsystem**: `YaafDoctor` inherits or utilizes the core `Agent` logic for its reasoning capabilities.
- **Context Management**: Uses `ContextManager` to maintain the state of the diagnostic session.
- **Model Layer**: Resolves model specifications and providers via `resolveModelSpecs` to communicate with LLMs.
- **Logging**: Utilizes the internal `Logger` for reporting its activities and findings.

## Key APIs

### YaafDoctor
The main class for interacting with the diagnostic system.

- `ask(question: string): Promise<string>`: Sends a query to the doctor agent and returns a grounded answer based on the project context.
- `startDaemon(): Promise<void>`: Begins the proactive monitoring process.
- `stopDaemon(): void`: Terminates the background monitoring process.
- `onIssue(handler: (issue: DoctorIssue) => void)`: Registers a callback that triggers when the doctor detects a project issue.

### Data Structures
- **DoctorIssue**: Represents a detected problem, containing a `type` (e.g., `compile_error`, `pattern_warning`), a `summary`, `details`, and a `timestamp`.
- **WatchOptions**: Configures the behavior of the error watcher, including debouncing and automatic LLM-based diagnosis.

## Configuration
The subsystem is configured via the `YaafDoctorConfig` object:

| Property | Type | Description |
| :--- | :--- | :--- |
| `projectRoot` | `string` | The directory to inspect (defaults to `process.cwd()`). |
| `model` | `string` | The LLM model identifier. |
| `provider` | `ModelProvider` | The LLM provider (e.g., OpenAI, Anthropic). |
| `daemonIntervalSec` | `number` | Frequency of daemon checks (default: 30s). |
| `maxIterations` | `number` | Maximum reasoning steps per query (default: 20). |
| `chatModel` | `ChatModel` | An optional pre-configured model instance. |

## Extension Points
Developers can extend the Doctor's capabilities through the following mechanisms:
- **Extra Tools**: Additional `Tool` instances can be provided via `extraTools` in the configuration to give the doctor access to custom project utilities or proprietary APIs.
- **Extra Instructions**: Custom strings can be appended to the doctor's system prompt via `extraInstructions` to provide project-specific context or coding standards.
- **Event Handling**: The `onIssue` hook allows developers to integrate doctor findings into external monitoring systems or custom IDE plugins.