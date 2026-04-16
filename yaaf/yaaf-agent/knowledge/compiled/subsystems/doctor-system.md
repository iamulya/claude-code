---
primary_files:
  - src/doctor.ts
  - src/cli/doctor.ts
summary: The diagnostic and observability subsystem of YAAF that provides real-time monitoring, error analysis, and project health checks.
title: Doctor System
entity_type: subsystem
exports:
  - YaafDoctor
stub: false
compiled_at: 2026-04-16T14:06:48.989Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/doctor.md
confidence: 0.95
---

## Purpose
The Doctor System is YAAF's built-in diagnostic and observability layer. It serves as an expert agent with deep knowledge of the framework's architecture, API surfaces, and common failure modes. The subsystem is designed to provide real-time monitoring of running agents, perform project-wide health checks, and offer interactive troubleshooting through a Command Line Interface (CLI).

The system addresses the complexity of LLM-powered applications by surfacing and diagnosing issues across tool execution, model interactions, context management, and security policies.

## Architecture
The Doctor System is centered around the `YaafDoctor` class, which encapsulates an expert agent. This agent does not require external documentation at runtime; its knowledge of YAAF (including Agent APIs, Tool systems, and Context Management) is baked into its system prompt.

### Internal Components
*   **Expert Agent**: A specialized LLM-powered agent configured to analyze project code and runtime events.
*   **Diagnostic Tools**: A suite of six built-in, read-only tools sandboxed to the project root:
    *   `read_file`: Reads file contents with optional line ranges.
    *   `grep_search`: Performs regex-based pattern searching across source files.
    *   `list_dir`: Lists directory contents, automatically filtering noise (e.g., `node_modules`).
    *   `run_tsc`: Executes `tsc --noEmit` to identify TypeScript compilation errors.
    *   `run_tests`: Executes the project's test suite.
    *   `get_project_structure`: Generates a file tree of relevant project files (TS, MD, JSON).
*   **Event Buffer**: A debounced mechanism that captures cascading failures from monitored agents to prevent redundant LLM diagnosis calls.

### Operational Modes
The subsystem operates in several distinct modes:
*   **Auto-Attach**: Automatically monitors an agent for errors when enabled via configuration or environment variables.
*   **Interactive REPL**: A CLI-based environment where developers can ask questions about their project.
*   **Live Watch**: A programmatic stream tap that subscribes to an agent's internal event bus.
*   **Daemon**: A background process that periodically runs compilation and test checks, surfacing only new errors.
*   **File Watch**: A lightweight, non-LLM mode that monitors the filesystem for TypeScript errors.

## Integration Points
The Doctor System integrates with the broader framework through the following mechanisms:
*   **Agent Event Stream**: The Doctor can tap into 16 specific event types across YAAF subsystems, including `tool:error`, `llm:retry`, `context:overflow-recovery`, and `guardrail:blocked`.
*   **Environment Variables**: Setting `YAAF_DOCTOR=1` globally enables the Doctor for all agents in the process.
*   **Agent Configuration**: The `doctor: true` flag in `AgentConfig` attaches the diagnostic system to a specific agent instance.

## Key APIs
The primary interface for the subsystem is the `YaafDoctor` class.

### Monitoring and Diagnosis
*   `watch(agent, options)`: Subscribes to an agent's event stream. It supports `debounceMs` and `maxBufferSize` to manage how frequently the LLM is invoked for diagnosis.
*   `unwatch(agent)`: Disconnects the Doctor from a specific agent.
*   `healthCheck()`: Performs a one-shot analysis of the project, returning a list of identified issues and suggested fixes.

### Interaction
*   `ask(question)`: Sends a query to the expert agent regarding the project or framework.
*   `askStream(question)`: Returns an async generator for streaming text deltas and tool call updates.

### Background Tasks
*   `startDaemon()`: Initiates a periodic check of project health (compilation and tests).
*   `startWatch(options)`: Starts a lightweight filesystem watcher that triggers callbacks on TypeScript errors.

## Configuration
The `YaafDoctor` constructor accepts a configuration object to customize its behavior:

```typescript
const doctor = new YaafDoctor({
  projectRoot: process.cwd(),      // Directory to inspect
  model: 'gpt-4o',                 // LLM for diagnosis
  provider: 'openai',              // LLM provider
  daemonIntervalSec: 30,           // Frequency for daemon checks
  maxIterations: 20,               // Max tool-call rounds per query
  extraTools: [],                  // Custom tools for the doctor
  extraInstructions: '',           // Additional context for the expert agent
});
```

## Extension Points
Developers can extend the Doctor System's capabilities through:
*   **Custom Tools**: Adding project-specific diagnostic tools via the `extraTools` configuration option.
*   **System Prompt Augmentation**: Providing `extraInstructions` to inform the Doctor about project-specific patterns, such as custom ORMs or architectural constraints.
*   **Event Handlers**: Using `onIssue(callback)` to programmatically handle diagnoses, allowing for integration with external logging or alerting systems (e.g., Slack, Sentry).